 -- ============================================================
-- Row Level Security — Capacity Dashboard
-- ============================================================
-- Aplica RLS em todas as tabelas e cria policies que restringem
-- acesso a utilizadores autenticados (auth.uid() != null).
--
-- NOTA: A restrição de domínio (@empresa.com) é feita no cliente
-- via VITE_ALLOWED_DOMAIN. Se quiseres reforçá-la no servidor,
-- descomenta a função e o trigger no final deste ficheiro.
-- ============================================================

-- ── Habilitar RLS ────────────────────────────────────────────
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;

-- ── tasks ────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- ── task_steps ───────────────────────────────────────────────
CREATE POLICY "Authenticated users can read task_steps"
  ON task_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert task_steps"
  ON task_steps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update task_steps"
  ON task_steps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete task_steps"
  ON task_steps FOR DELETE
  TO authenticated
  USING (true);

-- ── step_assignees ───────────────────────────────────────────
CREATE POLICY "Authenticated users can read step_assignees"
  ON step_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert step_assignees"
  ON step_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete step_assignees"
  ON step_assignees FOR DELETE
  TO authenticated
  USING (true);

-- ── members ──────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins devem poder inserir/editar membros —
-- descomentar e adaptar se houver coluna de role no auth:
-- CREATE POLICY "Admins can manage members"
--   ON members FOR ALL
--   TO authenticated
--   USING ( (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' );

-- ============================================================
-- OPCIONAL: Restrição de domínio no lado servidor
-- Descomenta o bloco abaixo para impedir registos fora do
-- domínio autorizado mesmo que o frontend seja contornado.
-- ============================================================
-- CREATE OR REPLACE FUNCTION check_allowed_domain()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE
--   allowed text := current_setting('app.allowed_domain', true);
-- BEGIN
--   IF allowed IS NOT NULL AND allowed <> '' THEN
--     IF split_part(NEW.email, '@', 2) <> allowed THEN
--       RAISE EXCEPTION 'Domínio não autorizado: %', split_part(NEW.email, '@', 2);
--     END IF;
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER enforce_allowed_domain
--   BEFORE INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION check_allowed_domain();
