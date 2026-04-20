-- Funções e jobs pg_cron para triggers inteligentes de notificação
-- Dispara às 9h, 12h e 15h UTC apenas se houve mudança em audit_logs no período

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Verifica se houve alguma mudança de status de task/step desde N horas atrás
CREATE OR REPLACE FUNCTION has_recent_audit_activity(since_hours INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM audit_logs
    WHERE created_at >= NOW() - (since_hours || ' hours')::INTERVAL
      AND entity IN ('task', 'step')
      AND field = 'status'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 1. Steps com atraso ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_overdue_steps()
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  -- Só executa se houve atividade recente nas últimas 3h
  IF NOT has_recent_audit_activity(3) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT
      sa.member_id,
      t.id         AS task_id,
      t.title      AS task_title,
      t.client_id,
      s.id         AS step_id,
      s.type       AS step_type,
      s.end_date
    FROM task_steps s
    JOIN tasks t ON t.id = s.task_id
    JOIN step_assignees sa ON sa.step_id = s.id
    JOIN members m ON m.id = sa.member_id
    LEFT JOIN user_preferences up ON up.user_id = sa.member_id
    WHERE s.end_date < CURRENT_DATE
      AND s.status NOT IN ('concluído', 'concluido')
      AND COALESCE(up.notification_step_overdue, true) = true
      -- Evita duplicar: não notifica se já foi notificado hoje
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = sa.member_id
          AND n.type = 'step_overdue'
          AND n.entity_id = s.id
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO notifications (user_id, client_id, type, title, message, entity, entity_id, metadata)
    VALUES (
      r.member_id,
      r.client_id,
      'step_overdue',
      'Etapa em atraso',
      'A etapa "' || r.step_type || '" da demanda "' || r.task_title || '" está atrasada desde ' || TO_CHAR(r.end_date, 'DD/MM/YYYY'),
      'step',
      r.step_id,
      jsonb_build_object('task_id', r.task_id, 'task_title', r.task_title, 'step_type', r.step_type, 'end_date', r.end_date)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Tasks paradas ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_stalled_tasks()
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  IF NOT has_recent_audit_activity(3) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT
      t.id         AS task_id,
      t.title      AS task_title,
      t.client_id,
      t.assignee   AS assignee_name,
      m.id         AS member_id,
      COALESCE(up.stalled_days_threshold, 5) AS threshold
    FROM tasks t
    JOIN members m ON m.name = t.assignee
    LEFT JOIN user_preferences up ON up.user_id = m.id
    WHERE t.status NOT IN ('concluído', 'concluido')
      AND COALESCE(up.notification_task_stalled, true) = true
      -- Última alteração foi há mais de threshold dias
      AND NOT EXISTS (
        SELECT 1 FROM audit_logs al
        WHERE al.entity = 'task'
          AND al.entity_id = t.id
          AND al.created_at >= NOW() - (COALESCE(up.stalled_days_threshold, 5) || ' days')::INTERVAL
      )
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = m.id
          AND n.type = 'task_stalled'
          AND n.entity_id = t.id
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO notifications (user_id, client_id, type, title, message, entity, entity_id, metadata)
    VALUES (
      r.member_id,
      r.client_id,
      'task_stalled',
      'Demanda parada',
      'A demanda "' || r.task_title || '" não teve atualizações há ' || r.threshold || ' dias.',
      'task',
      r.task_id,
      jsonb_build_object('task_id', r.task_id, 'task_title', r.task_title, 'stalled_days', r.threshold)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Membros sobrecarregados (só managers) ────────────────────────────────

CREATE OR REPLACE FUNCTION notify_overloaded_members()
RETURNS VOID AS $$
DECLARE
  r RECORD;
  manager RECORD;
BEGIN
  IF NOT has_recent_audit_activity(3) THEN
    RETURN;
  END IF;

  -- Para cada membro com tasks acima do threshold do manager
  FOR r IN
    SELECT
      m.id         AS member_id,
      m.name       AS member_name,
      t.client_id,
      COUNT(*)     AS active_tasks
    FROM members m
    JOIN tasks t ON t.assignee = m.name
    WHERE t.status = 'em andamento'
    GROUP BY m.id, m.name, t.client_id
  LOOP
    -- Notifica cada manager do mesmo cliente que tiver a preferência ligada
    FOR manager IN
      SELECT m2.id AS manager_id, COALESCE(up.overload_threshold, 3) AS threshold
      FROM members m2
      JOIN user_clients uc ON uc.user_id = m2.id AND uc.client_id = r.client_id
      LEFT JOIN user_preferences up ON up.user_id = m2.id
      WHERE m2.access_role = 'admin'
        AND COALESCE(up.notification_member_overloaded, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = m2.id
            AND n.type = 'member_overloaded'
            AND n.metadata->>'member_id' = r.member_id::text
            AND n.created_at::date = CURRENT_DATE
        )
    LOOP
      IF r.active_tasks >= manager.threshold THEN
        INSERT INTO notifications (user_id, client_id, type, title, message, entity, entity_id, metadata)
        VALUES (
          manager.manager_id,
          r.client_id,
          'member_overloaded',
          'Membro sobrecarregado',
          r.member_name || ' está com ' || r.active_tasks || ' demandas em andamento simultaneamente.',
          'member',
          r.member_id,
          jsonb_build_object('member_id', r.member_id, 'member_name', r.member_name, 'active_tasks', r.active_tasks, 'threshold', manager.threshold)
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Função orquestradora ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION run_notification_checks()
RETURNS VOID AS $$
BEGIN
  PERFORM notify_overdue_steps();
  PERFORM notify_stalled_tasks();
  PERFORM notify_overloaded_members();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── pg_cron jobs: 9h, 12h e 15h UTC ────────────────────────────────────────

SELECT cron.unschedule('notification-check-9h')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-check-9h');
SELECT cron.unschedule('notification-check-12h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-check-12h');
SELECT cron.unschedule('notification-check-15h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-check-15h');

SELECT cron.schedule('notification-check-9h',  '0 9  * * *', 'SELECT run_notification_checks()');
SELECT cron.schedule('notification-check-12h', '0 12 * * *', 'SELECT run_notification_checks()');
SELECT cron.schedule('notification-check-15h', '0 15 * * *', 'SELECT run_notification_checks()');
