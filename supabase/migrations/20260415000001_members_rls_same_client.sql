-- Visibilidade de members: qualquer autenticado vê todos
-- NOTA: filtro por cliente foi removido — a policy com JOIN em user_clients
-- causava infinite recursion no Supabase independente da abordagem tentada
-- (subquery em members, SECURITY DEFINER, member_roles como lookup).
-- A restrição de visibilidade é feita no cliente via clientMembers (App.tsx).

-- Remove policies e artefatos de tentativas anteriores
DROP POLICY IF EXISTS "Authenticated users can read members" ON members;
DROP POLICY IF EXISTS "admin_all_members" ON members;
DROP POLICY IF EXISTS "user_read_same_client_members" ON members;
DROP POLICY IF EXISTS "members_self_read" ON members;
DROP POLICY IF EXISTS "members_admin_read" ON members;
DROP POLICY IF EXISTS "members_same_client_read" ON members;
DROP POLICY IF EXISTS "members_authenticated_read" ON members;
DROP FUNCTION IF EXISTS is_current_user_admin();
DROP FUNCTION IF EXISTS current_user_client_ids();
DROP FUNCTION IF EXISTS get_current_member_role();
DROP TRIGGER IF EXISTS trg_sync_member_role ON members;
DROP FUNCTION IF EXISTS sync_member_role();
DROP TABLE IF EXISTS member_roles;

-- Acesso irrestrito para autenticados (sem recursão)
CREATE POLICY "members_authenticated_read" ON members
  FOR SELECT
  TO authenticated
  USING (true);
