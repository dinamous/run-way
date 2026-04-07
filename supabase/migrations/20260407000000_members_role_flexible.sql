ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_role_check;

ALTER TABLE members
  ADD CONSTRAINT members_role_check
  CHECK (
    role IS NOT NULL
    AND char_length(btrim(role)) > 0
    AND char_length(role) <= 50
  );
