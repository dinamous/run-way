-- Adiciona coluna deactivated_at na tabela members
ALTER TABLE members ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL;
