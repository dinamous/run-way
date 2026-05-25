import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries";
import { invalidateClientOverviewCache } from "@/views/client-overview/hooks/useClientOverviewData";
import type { ClientOption } from "@/contexts/AuthContext";

interface TransitionTarget {
  id: string | null | undefined;
  name: string;
}

export function useClientTransition(
  clients: ClientOption[],
  effectiveClientId: string | null | undefined,
  onNavigateToClient: (client: ClientOption) => void,
  isAdmin: boolean = false,
) {
  const queryClient = useQueryClient();
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);

  const selectClient = useCallback((clientId: string | null | undefined) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target || clientId === effectiveClientId) return;

    // Clear manual cache for both the outgoing and incoming client
    invalidateClientOverviewCache(effectiveClientId ?? undefined);
    invalidateClientOverviewCache(clientId ?? undefined);

    setTransitionTarget({ id: clientId, name: target.name });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(clientId ?? null, isAdmin) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      onNavigateToClient(target);
    }, 650);
  }, [clients, effectiveClientId, isAdmin, queryClient, onNavigateToClient]);

  const onTransitionComplete = useCallback(() => {
    if (!transitionTarget) return;
    toast("Visualização alterada", {
      description: `Trocado para ${transitionTarget.name}`,
      style: {
        background: "var(--muted)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
      },
      duration: 3000,
    });
    setTransitionTarget(null);
  }, [transitionTarget]);

  return { transitionTarget, selectClient, onTransitionComplete };
}
