-- Índices de performance para queries da OverviewView
-- concluded_at IS NULL é o filtro mais comum (tarefas ativas)
CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks (client_id)
  WHERE concluded_at IS NULL;

-- concluded_at + client_id para queries de tarefas concluídas por período e cliente
CREATE INDEX IF NOT EXISTS idx_tasks_concluded_client
  ON tasks (concluded_at DESC, client_id)
  WHERE concluded_at IS NOT NULL;
