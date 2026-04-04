-- supabase/migrations/20260404000000_rbac.sql

-- ─── 1. clients ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── 2. user_clients (N:N members ↔ clients) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_clients (
  user_id   uuid REFERENCES members(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, client_id)
);

-- ─── 3. audit_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES members(id),
  client_id   uuid REFERENCES clients(id),
  entity      text NOT NULL CHECK (entity IN ('task', 'step')),
  entity_id   uuid NOT NULL,
  entity_name text,
  action      text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  field       text,
  from_value  text,
  to_value    text,
  created_at  timestamptz DEFAULT now()
);

-- ─── 4. Alterar members ───────────────────────────────────────────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_role  text DEFAULT 'user'
    CHECK (access_role IN ('admin', 'user'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_auth_user_unique'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_auth_user_unique UNIQUE (auth_user_id);
  END IF;
END $$;

-- ─── 5. Alterar tasks ─────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- ─── 6. RLS — clients ─────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all_clients" ON clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

-- User: lê apenas seus clientes
CREATE POLICY "user_read_own_clients" ON clients
  FOR SELECT
  USING (
    id IN (
      SELECT uc.client_id FROM user_clients uc
      JOIN members m ON m.id = uc.user_id
      WHERE m.auth_user_id = auth.uid()
    )
  );

-- ─── 7. RLS — user_clients ────────────────────────────────────────────────────
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_user_clients" ON user_clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

CREATE POLICY "user_read_own_user_clients" ON user_clients
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM members WHERE auth_user_id = auth.uid()
    )
  );

-- ─── 8. RLS — tasks (atualizar/substituir policies existentes) ────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all_tasks" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

-- User: apenas tasks do(s) seu(s) cliente(s)
CREATE POLICY "user_own_client_tasks" ON tasks
  FOR ALL
  USING (
    client_id IN (
      SELECT uc.client_id FROM user_clients uc
      JOIN members m ON m.id = uc.user_id
      WHERE m.auth_user_id = auth.uid()
    )
  );

-- ─── 9. RLS — audit_logs (somente service role acessa) ───────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de usuário — apenas service_role bypassa RLS
