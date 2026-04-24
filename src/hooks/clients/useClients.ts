import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';

export function useClients() {
  const { clients, isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();

  const effectiveClientId = selectedClientId === undefined
    ? (clients.length > 0 ? clients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (clients.length > 0 ? clients[0].id : null)));

  return {
    clients,
    isAdmin,
    selectedClientId,
    effectiveClientId,
  };
}