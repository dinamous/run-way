-- ============================================================
-- Migration: Steps → Subtasks
-- Cria task_subtasks e subtask_assignees como substitutas de
-- task_steps e step_assignees. Dados existentes são migrados.
-- As tabelas antigas são mantidas para rollback seguro.
-- ============================================================

-- ── Criar task_subtasks ──────────────────────────────────────
CREATE TABLE task_subtasks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title          text        NOT NULL DEFAULT '',
  status         text        NOT NULL,
  subtask_order  integer     NOT NULL DEFAULT 0,
  active         boolean     NOT NULL DEFAULT false,
  start_date     date,
  end_date       date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Criar subtask_assignees ──────────────────────────────────
CREATE TABLE subtask_assignees (
  subtask_id  uuid NOT NULL REFERENCES task_subtasks(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (subtask_id, member_id)
);

-- ── Migrar dados de task_steps ───────────────────────────────
-- O campo "type" (ex: "design") vira tanto title quanto status.
-- O usuário poderá renomear o title livremente depois.
INSERT INTO task_subtasks (id, task_id, title, status, subtask_order, active, start_date, end_date)
SELECT id, task_id, type, type, step_order, active, start_date, end_date
FROM task_steps;

-- ── Migrar assignees ─────────────────────────────────────────
INSERT INTO subtask_assignees (subtask_id, member_id)
SELECT step_id, member_id
FROM step_assignees;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE task_subtasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtask_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task_subtasks"
  ON task_subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert task_subtasks"
  ON task_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update task_subtasks"
  ON task_subtasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete task_subtasks"
  ON task_subtasks FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read subtask_assignees"
  ON subtask_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subtask_assignees"
  ON subtask_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subtask_assignees"
  ON subtask_assignees FOR DELETE
  TO authenticated
  USING (true);
