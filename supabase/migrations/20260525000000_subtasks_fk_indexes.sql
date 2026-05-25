-- Índices em FK de task_subtasks e subtask_assignees
-- task_id não tinha índice, causando full scan em queries por tarefa e em cascades
-- member_id não tinha índice, causando full scan ao buscar subtasks por membro
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id
  ON task_subtasks (task_id);

CREATE INDEX IF NOT EXISTS idx_subtask_assignees_member_id
  ON subtask_assignees (member_id);
