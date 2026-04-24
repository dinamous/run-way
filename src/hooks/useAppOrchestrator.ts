import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useUIStore } from "@/store/useUIStore";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "@/hooks/useSupabase";
import { useHolidays } from "@/hooks/useHolidays";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAppSidebar } from "@/hooks/useAppSidebar";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useClientTransition } from "@/hooks/useClientTransition";
import { useMembersQuery } from "@/hooks/useMembersQuery";
import { useTasksQuery } from "@/hooks/useTasksQuery";
import { useClientStore } from "@/store/useClientStore";
import { resolveNotificationRoute } from "@/lib/notifications";
import { canAccessView, resolveAccessRole } from "@/lib/accessControl";
import { clientToSlug } from "@/lib/clientSlug";
import type { ClientOption } from "@/contexts/AuthContext";
import type { Notification } from "@/types/notification";
import type { ViewType } from "@/store/useUIStore";

export function useAppOrchestrator() {
  const auth = useAuthContext();
  const { darkMode, toggleDark } = useAppTheme();
  const sidebar = useAppSidebar();

  const accessRole = resolveAccessRole(auth.member);
  const hasClients = auth.clients.length > 0;

  const nav = useAppNavigation(auth.clients);
  const { selectedClientId: storedClientId, setClient: storeClient, isClientBuffValid } = useClientStore();

  const effectiveClient = nav.currentClient ?? null;
  const effectiveClientId = effectiveClient?.id ?? null;

  useEffect(() => {
    if (effectiveClientId) storeClient(effectiveClientId);
  }, [effectiveClientId, storeClient]);

  useEffect(() => {
    const shouldRestoreLastClient =
      !auth.loading &&
      !nav.currentSlug &&
      nav.view === "home" &&
      storedClientId &&
      isClientBuffValid()

    if (shouldRestoreLastClient) {
      const lastClient = auth.clients.find((c) => c.id === storedClientId);
      if (lastClient) nav.navigateToClient(lastClient);
    }
  }, [auth.loading, nav.currentSlug, storedClientId, auth.clients, nav]);


  const { data: members = [] } = useMembersQuery(effectiveClientId);

  const { createTask, updateTask, deleteTask } = useSupabase({
    memberId: auth.member?.id,
    clientId: effectiveClientId,
    isAdmin: auth.isAdmin,
  });

  const { holidays } = useHolidays();

  const allClientIds = auth.clients.map((c) => c.id);
  const notifications = useNotifications(auth.member?.id, allClientIds);

  // Modal state ainda vive no UIStore (não é URL)
  const isModalOpen = useUIStore((s) => s.isTaskModalOpen);
  const _closeTaskModal = useUIStore((s) => s.closeTaskModal);
  const closeTaskModal = useCallback(() => {
    _closeTaskModal();
    // Se o modal foi aberto via URL, limpa o taskId da URL
    if (nav.urlTaskId) nav.closeTask();
  }, [_closeTaskModal, nav]);

  const taskActions = useTaskActions({ createTask, updateTask, deleteTask, effectiveClientId });

  // Carrega task pelo ID da URL e abre o modal
  const { data: tasksData } = useTasksQuery(effectiveClientId, auth.isAdmin);
  useEffect(() => {
    if (!nav.urlTaskId || !tasksData) return;
    const task = tasksData.find((t) => t.id === nav.urlTaskId);
    if (task) {
      taskActions.openEditTask(task);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.urlTaskId, tasksData]);

  const { transitionTarget, selectClient: selectClientWithTransition, onTransitionComplete } =
    useClientTransition(
      auth.clients,
      effectiveClientId,
      useCallback((client: ClientOption) => nav.navigateToClient(client, true), [nav])
    );

  const selectClient = useCallback(
    (clientId: string | null | undefined) => {
      if (!clientId) return;
      sidebar.openSidebar();
      selectClientWithTransition(clientId);
    },
    [selectClientWithTransition, sidebar]
  );

  const handleViewChange = useCallback(
    (newView: ViewType) => {
      sidebar.closeMobileSidebar();
      const canAccess = canAccessView(newView, accessRole, effectiveClientId !== null);
      if (!canAccess) {
        if (newView !== "clients") toast.error("Selecione um cliente para acessar esta funcionalidade.");
        nav.navigateTo("clients", effectiveClient);
      } else {
        nav.navigateTo(newView, effectiveClient);
      }
    },
    [effectiveClientId, effectiveClient, accessRole, nav, sidebar]
  );

  useEffect(() => {
    if (!auth.loading && auth.session && nav.currentSlug) {
      const canAccess = canAccessView(nav.view, accessRole, effectiveClientId !== null);
      if (!canAccess) nav.navigateTo("clients", effectiveClient);
    }
  }, [auth.loading, auth.session, nav, effectiveClientId, effectiveClient, accessRole]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      const route = resolveNotificationRoute(notification);
      if (!route) return;

      if (notification.type === "client_access_granted" && notification.client_id) {
        const targetClient = auth.clients.find((c) => c.id === notification.client_id);
        if (targetClient) {
          nav.navigateToClient(targetClient);
          return;
        }
        nav.navigateTo("clients", effectiveClient);
        return;
      }

      if (route.startsWith("/dashboard")) nav.navigateTo("calendar", effectiveClient);
      else if (route === "/profile") nav.navigateTo("profile", null);
      else if (route === "/clients") nav.navigateTo("clients", effectiveClient);
      else if (route === "/members") nav.navigateTo("members", effectiveClient);
    },
    [nav, effectiveClient, auth.clients]
  );


  const cachedClient = (!effectiveClientId && isClientBuffValid())
    ? (auth.clients.find((c) => c.id === storedClientId) ?? null)
    : null

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
    effectiveClient,
    selectedClient: effectiveClient,
    cachedClient,
    selectClient,
    transitionTarget,
    onTransitionComplete,

    // navigation
    view: nav.view,
    urlTaskId: nav.urlTaskId,
    handleViewChange,
    navigateTo: nav.navigateTo,
    navigateToClient: nav.navigateToClient,
    clientSlug: nav.currentSlug,
    clientToSlug,

    // data
    members,
    holidays,

    // notifications
    notifications,
    handleNotificationClick,

    // modal
    isModalOpen,
    closeTaskModal,

    // task actions
    taskActions,
    updateTask,
    openTask: nav.openTask,
    closeTask: nav.closeTask,
  };
}
