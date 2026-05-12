-- Manual priority order for parent demands.
-- Lower numbers appear first within the demand list.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY client_id
      ORDER BY created_at DESC, id ASC
    ) - 1 AS next_priority_order
  FROM tasks
)
UPDATE tasks
SET priority_order = ranked.next_priority_order
FROM ranked
WHERE tasks.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_tasks_client_priority_order
  ON tasks (client_id, priority_order);
