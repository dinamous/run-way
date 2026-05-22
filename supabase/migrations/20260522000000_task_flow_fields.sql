-- Campos para modelo de workload orientado a fluxo real
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS expected_hours NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS complexity     TEXT CHECK (complexity IN ('baixa','media','alta','avancada','extrema')),
  ADD COLUMN IF NOT EXISTS task_type      TEXT CHECK (task_type IN ('feature','bug','support','meeting')),
  ADD COLUMN IF NOT EXISTS due_date       DATE,
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ;
