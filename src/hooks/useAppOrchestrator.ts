import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useClientStore } from "@/store/useClientStore";
import { useUIStore } from "@/store/useUIStore";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "@/hooks/useSupabase";
import { useHolidays } from "@/hooks/useHolidays";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAppSidebar } from "@/hooks/useAppSidebar";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useClientTransition } from "@/hooks/useClientTransition";
import { useMembersQuery } from "@/hooks/useMembersQuery";
import { resolveNotificationRoute } from "@/lib/notifications";
import { canAccessView, resolveAccessRole } from "@/lib/accessControl";
import type { Notification } from "@/types/notification";
import type { ViewType } from "@/store/useUIStore";

export function useAppOrchestrator() {
  const auth = useAuthContext();
  const { darkMode, toggleDark } = useAppTheme();
  const sidebar = useAppSidebar();

  const accessRole = resolveAccessRole(auth.member);
  const hasClients = auth.clients.length > 0;

  const { selectedClientId, setClient } = useClientStore();

  const effectiveClientId =
    selectedClientId === undefined
      ? hasClients ? auth.clients[0].id : null
      : auth.isAdmin
        ? selectedClientId
        : selectedClientId ?? (hasClients ? auth.clients[0].id : null);

  useEffect(() => {
    if (auth.loading || !auth.session) return;

    if (selectedClientId === undefined && hasClients) {
      setClient(auth.clients[0].id);
    } else if (!hasClients) {
      setClient(undefined);
    } else if (
      typeof selectedClientId === "string" &&
      !auth.clients.find((c) => c.id === selectedClientId)
    ) {
      setClient(auth.clients[0]?.id ?? undefined);
    }
  }, [auth.loading, auth.session, hasClients, auth.clients, selectedClientId, setClient]);

  const { data: members = [] } = useMembersQuery(effectiveClientId);

  const { createTask, updateTask, deleteTask } = useSupabase({
    memberId: auth.member?.id,
    clientId: effectiveClientId,
    isAdmin: auth.isAdmin,
  });

  const { holidays } = useHolidays();

  const allClientIds = auth.clients.map((c) => c.id);
  const notifications = useNotifications(auth.member?.id, allClientIds);

  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const isModalOpen = useUIStore((s) => s.isTaskModalOpen);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);

  const { transitionTarget, selectClient, onTransitionComplete } = useClientTransition(
    auth.clients,
    effectiveClientId
  );

  const taskActions = useTaskActions({ createTask, updateTask, deleteTask, effectiveClientId });

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      const route = resolveNotificationRoute(notification);
      if (!route) return;
      if (route.startsWith("/dashboard")) setView("calendar");
      else if (route === "/profile") setView("profile");
      else if (route === "/clients") setView("clients");
      else if (route === "/members") setView("members");
    },
    [setView]
  );

  const handleViewChange = useCallback(
    (newView: ViewType) => {
      sidebar.closeMobileSidebar();
      const canAccess = canAccessView(newView, accessRole, effectiveClientId !== null);
      if (!canAccess) {
        if (newView !== "clients") toast.error("Selecione um cliente para acessar esta funcionalidade.");
        setView("clients");
      } else {
        setView(newView);
      }
    },
    [effectiveClientId, accessRole, setView, sidebar]
  );

  useEffect(() => {
    if (!auth.loading && auth.session) {
      const canAccess = canAccessView(view, accessRole, effectiveClientId !== null);
      if (!canAccess) setView("clients");
    }
  }, [auth.loading, auth.session, effectiveClientId, accessRole, view, setView]);

  const selectedClient = effectiveClientId
    ? auth.clients.find((c) => c.id === effectiveClientId) ?? null
    : null;

  return {
    // auth
    auth,
    hasClients,
    accessRole,

    // theme
    darkMode,
    toggleDark,

    // sidebar
    sidebar,

    // client
    effectiveClientId,
    selectedClient,
    selectClient,
    transitionTarget,
    onTransitionComplete,

    // data
    members,
    holidays,

    // notifications
    notifications,
    handleNotificationClick,

    // view
    view,
    handleViewChange,

    // modal
    isModalOpen,
    closeTaskModal,

    // task actions
    taskActions,
    updateTask,
  };
}
