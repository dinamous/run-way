-- ============================================================
-- Migration: Subtask progress status
-- Adds an execution status separate from the subtask phase/type.
-- ============================================================

ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS progress_status text NOT NULL DEFAULT 'todo';

ALTER TABLE task_subtasks
  DROP CONSTRAINT IF EXISTS task_subtasks_progress_status_check;

ALTER TABLE task_subtasks
  ADD CONSTRAINT task_subtasks_progress_status_check
  CHECK (
    progress_status IN (
      'todo',
      'ready',
      'in-progress',
      'in-review',
      'waiting',
      'blocked',
      'needs-changes',
      'paused',
      'done',
      'canceled'
    )
  );
