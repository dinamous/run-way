-- Colunas de preferências de notificação por tipo em user_preferences
-- Cada switch corresponde a uma aba na ProfileView > Notificações
-- stalled_days_threshold e overload_threshold são configuráveis pelo manager

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_step_overdue      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_task_stalled      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_member_overloaded BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stalled_days_threshold         INTEGER NOT NULL DEFAULT 5
    CHECK (stalled_days_threshold BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS overload_threshold             INTEGER NOT NULL DEFAULT 3
    CHECK (overload_threshold BETWEEN 1 AND 20);
