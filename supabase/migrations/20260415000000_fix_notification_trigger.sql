-- Corrigir trigger step_assignment para não falhar quando task é deletada
-- O problema: ao deletar uma task, os steps são removidos via CASCADE,
-- e o trigger tenta criar notificação com dados que já foram deletados.

CREATE OR REPLACE FUNCTION notify_step_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_step_type TEXT;
  v_step_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      SELECT t.title, s.type INTO v_task_title, v_step_type
      FROM tasks t
      JOIN task_steps s ON s.task_id = t.id
      WHERE s.id = NEW.step_id;

      IF v_task_title IS NOT NULL AND v_step_type IS NOT NULL THEN
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
      END IF;
    END;

  ELSIF TG_OP = 'DELETE' THEN
    BEGIN
      IF OLD.step_id IS NOT NULL THEN
        SELECT t.title, s.type INTO v_task_title, v_step_type
        FROM tasks t
        JOIN task_steps s ON s.task_id = t.id
        WHERE s.id = OLD.step_id;

        IF v_task_title IS NOT NULL AND v_step_type IS NOT NULL THEN
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
      END IF;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;