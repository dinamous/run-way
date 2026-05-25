-- Índices de performance para queries do painel admin

-- audit_logs: colunas usadas nos filtros de adminFetchAuditLogs
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id    ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity        ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);
-- ilike em entity_name não beneficia de btree; pg_trgm seria o ideal mas requer extensão
-- este índice parcial cobre o caso de busca sem filtro de nome
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_name  ON audit_logs(entity_name);

-- user_clients: client_id é usado em JOINs e filtros por cliente
CREATE INDEX IF NOT EXISTS idx_user_clients_client_id  ON user_clients(client_id);
-- user_id já deve ter índice via FK, mas garantimos
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id    ON user_clients(user_id);
