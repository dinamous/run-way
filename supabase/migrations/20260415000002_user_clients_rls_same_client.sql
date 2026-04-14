-- Permite que usuários autenticados leiam todas as linhas de user_clients
-- cujo client_id seja um cliente ao qual eles também pertencem.
-- Isso é necessário para que fetchMembersFromDb retorne todos os membros
-- do cliente, e não apenas o próprio usuário.
--
-- A função get_current_user_client_ids usa SECURITY DEFINER para bypassar o
-- RLS ao consultar user_clients, evitando infinite recursion.

CREATE OR REPLACE FUNCTION get_current_user_client_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT uc.client_id
  FROM user_clients uc
  JOIN members m ON m.id = uc.user_id
  WHERE m.auth_user_id = auth.uid()
$$;

DROP POLICY IF EXISTS "user_read_same_client_user_clients" ON user_clients;

CREATE POLICY "user_read_same_client_user_clients" ON user_clients
  FOR SELECT
  USING (
    client_id IN (SELECT get_current_user_client_ids())
  );
