import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useClientStore } from "@/store/useClientStore";
import { useUIStore } from "@/store/useUIStore";
import { queryKeys } from "@/lib/queries";
import type { ClientOption } from "@/contexts/AuthContext";

interface TransitionTarget {
  id: string | null | undefined;
  name: string;
}

/**
 * Handles the animated client-switch flow:
 * shows `ClientTransitionOverlay`, then swaps the active client in stores.
 */
export function useClientTransition(
  clients: ClientOption[],
  effectiveClientId: string | null | undefined
) {
  const queryClient = useQueryClient();
  const setClient = useClientStore((s) => s.setClient);
  const setView = useUIStore((s) => s.setView);

  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);

  const selectClient = useCallback((clientId: string | null | undefined) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target || clientId === effectiveClientId) return;

    // Show overlay first; after fade-in (~650ms) trigger the swap so data fetches happen in background
    setTransitionTarget({ id: clientId, name: target.name });
    setTimeout(() => {
      setClient(clientId);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(clientId ?? null, false) });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setView("home");
    }, 650);
  }, [clients, effectiveClientId, setClient, queryClient, setView]);

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
