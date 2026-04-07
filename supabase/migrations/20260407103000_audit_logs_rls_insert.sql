-- Permite insert de audit_logs por utilizadores autenticados (sem service_role no front)
-- e leitura por admins quando necessário.

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'users_insert_own_audit_logs'
  ) THEN
    CREATE POLICY users_insert_own_audit_logs ON audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT m.id
          FROM members m
          WHERE m.auth_user_id = auth.uid()
        )
        AND (
          client_id IS NULL
          OR client_id IN (
            SELECT uc.client_id
            FROM user_clients uc
            JOIN members m ON m.id = uc.user_id
            WHERE m.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM members m
            WHERE m.auth_user_id = auth.uid()
              AND m.access_role = 'admin'
          )
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'admins_read_audit_logs'
  ) THEN
    CREATE POLICY admins_read_audit_logs ON audit_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM members m
          WHERE m.auth_user_id = auth.uid()
            AND m.access_role = 'admin'
        )
      );
  END IF;
END
$$;
