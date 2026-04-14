-- Tabela de notificações para usuários
-- Tipos: step_assigned, step_unassigned, role_changed, task_assigned, client_access_granted, client_access_revoked, admin_broadcast
-- Entidades: step, task, member, client

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_client_id ON notifications(client_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = false;

-- RLS para notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Administradores podem ver todas as notificações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'admins_read_notifications'
  ) THEN
    CREATE POLICY admins_read_notifications ON notifications
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM members m
          WHERE m.auth_user_id = auth.uid()
            AND m.access_role = 'admin'
        )
      );
  END IF;
END
$$;

-- Administradores podem inserir notificações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'admins_insert_notifications'
  ) THEN
    CREATE POLICY admins_insert_notifications ON notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM members m
          WHERE m.auth_user_id = auth.uid()
            AND m.access_role = 'admin'
        )
      );
  END IF;
END
$$;

-- Administradores podem atualizar notificações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'admins_update_notifications'
  ) THEN
    CREATE POLICY admins_update_notifications ON notifications
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM members m
          WHERE m.auth_user_id = auth.uid()
            AND m.access_role = 'admin'
        )
      )
      WITH CHECK (true);
  END IF;
END
$$;

-- Usuários podem ver suas próprias notificações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_read_own_notifications'
  ) THEN
    CREATE POLICY users_read_own_notifications ON notifications
      FOR SELECT TO authenticated
      USING (
        user_id IN (
          SELECT m.id FROM members m
          WHERE m.auth_user_id = auth.uid()
        )
        OR (
          user_id IS NULL
          AND client_id IN (
            SELECT uc.client_id FROM user_clients uc
            JOIN members m ON m.id = uc.user_id
            WHERE m.auth_user_id = auth.uid()
          )
        )
      );
  END IF;
END
$$;

-- Usuários podem marcar como lida apenas as suas notificações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_update_own_notifications'
  ) THEN
    CREATE POLICY users_update_own_notifications ON notifications
      FOR UPDATE TO authenticated
      USING (
        user_id IN (
          SELECT m.id FROM members m
          WHERE m.auth_user_id = auth.uid()
        )
        OR (
          user_id IS NULL
          AND client_id IN (
            SELECT uc.client_id FROM user_clients uc
            JOIN members m ON m.id = uc.user_id
            WHERE m.auth_user_id = auth.uid()
          )
        )
      )
      WITH CHECK (read = true);
  END IF;
END
$$;

-- Trigger para notificar atribuição de step
CREATE OR REPLACE FUNCTION notify_step_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_step_type TEXT;
  v_step_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT t.title, s.type INTO v_task_title, v_step_type
    FROM tasks t
    JOIN task_steps s ON s.task_id = t.id
    WHERE s.id = NEW.step_id;

    v_step_label := (
      CASE v_step_type
        WHEN 'analise-ux' THEN 'Análise UX'
        WHEN 'analise-dev' THEN 'Análise Dev'
        WHEN 'design' THEN 'Design'
        WHEN 'aprovacao-design' THEN 'Aprovação Design'
        WHEN 'desenvolvimento' THEN 'Desenvolvimento'
        WHEN 'homologacao' THEN 'Homologação'
        WHEN 'qa' THEN 'QA'
        WHEN 'publicacao' THEN 'Publicação'
        ELSE v_step_type
      END
    );

    INSERT INTO notifications (user_id, type, title, message, entity, entity_id, metadata, client_id)
    SELECT 
      NEW.member_id,
      'step_assigned',
      'Nova etapa atribuída',
      'Você foi atribuído à etapa "' || v_step_label || '" na demanda "' || v_task_title || '"',
      'step',
      NEW.step_id,
      jsonb_build_object('step_id', NEW.step_id, 'task_title', v_task_title, 'step_type', v_step_type),
      t.client_id
    FROM tasks t
    JOIN task_steps ts ON ts.task_id = t.id
    WHERE ts.id = NEW.step_id;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT t.title, s.type INTO v_task_title, v_step_type
    FROM tasks t
    JOIN task_steps s ON s.task_id = t.id
    WHERE s.id = OLD.step_id;

    v_step_label := (
      CASE v_step_type
        WHEN 'analise-ux' THEN 'Análise UX'
        WHEN 'analise-dev' THEN 'Análise Dev'
        WHEN 'design' THEN 'Design'
        WHEN 'aprovacao-design' THEN 'Aprovação Design'
        WHEN 'desenvolvimento' THEN 'Desenvolvimento'
        WHEN 'homologacao' THEN 'Homologação'
        WHEN 'qa' THEN 'QA'
        WHEN 'publicacao' THEN 'Publicação'
        ELSE v_step_type
      END
    );

    INSERT INTO notifications (user_id, type, title, message, entity, entity_id, metadata, client_id)
    VALUES (
      OLD.member_id,
      'step_unassigned',
      'Etapa removida',
      'Você foi removido da etapa "' || v_step_label || '" na demanda "' || v_task_title || '"',
      'step',
      OLD.step_id,
      jsonb_build_object('step_id', OLD.step_id, 'task_title', v_task_title, 'step_type', v_step_type),
      NULL
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS step_assignment_trigger ON step_assignees;
CREATE TRIGGER step_assignment_trigger
AFTER INSERT OR DELETE ON step_assignees
FOR EACH ROW EXECUTE FUNCTION notify_step_assignment();

-- Trigger para notificar mudança de role
CREATE OR REPLACE FUNCTION notify_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_role <> OLD.access_role THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'role_changed',
      'Cargo alterado',
      'Seu cargo foi alterado de "' || OLD.access_role || '" para "' || NEW.access_role || '"',
      jsonb_build_object('old_role', OLD.access_role, 'new_role', NEW.access_role)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS role_change_trigger ON members;
CREATE TRIGGER role_change_trigger
AFTER UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION notify_role_change();

-- Função para enviar notificação manual (admin)
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_client_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'admin_broadcast',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, client_id, title, message, type, metadata)
  VALUES (p_user_id, p_client_id, p_title, p_message, p_type, p_metadata);
END;
$$ LANGUAGE plpgsql;