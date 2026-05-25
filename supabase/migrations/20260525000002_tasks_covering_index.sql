-- Covering index para fetchAllSubtasks (admin): query 1 busca IDs de tasks ativas por cliente
-- O índice parcial anterior (idx_tasks_active) não incluía `id`, forçando heap fetch.
-- Com INCLUDE (id), a query SELECT id FROM tasks WHERE concluded_at IS NULL AND client_id IN (...)
-- resolve inteiramente pelo índice sem acessar o heap (index-only scan).
DROP INDEX IF EXISTS idx_tasks_active;
CREATE INDEX idx_tasks_active
  ON tasks (client_id)
  INCLUDE (id)
  WHERE concluded_at IS NULL;
