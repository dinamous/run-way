import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAppOrchestrator } from "@/hooks/app/useAppOrchestrator";
import { AppLayout } from "@/components/AppLayout";
import { ClientPickerLayout } from "@/components/ClientPickerLayout";
import { AppModals } from "@/components/AppModals";
import { ClientTransitionOverlay } from "@/components/ClientTransitionOverlay";
import { LoginView } from "@/views/login";
import { OnboardingView } from "@/views/onboarding";

export default function App() {
  const app = useAppOrchestrator();
  const isProfileView = app.view === "profile"
  const isHomeView = app.view === "home" || !app.view
  const isAdminView = app.view === "admin"
  const needsPicker = !app.effectiveClientId && !isProfileView && !isHomeView && !isAdminView && !app.auth.loading

  // Quando não há cliente na URL mas há um em cache, redireciona preservando a view atual
  useEffect(() => {
    if (!needsPicker) return
    if (!app.cachedClient) return
    app.navigateTo(app.view, app.cachedClient)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPicker, app.cachedClient, app.view, app.navigateTo])

  if (app.auth.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app.auth.session) {
    return <LoginView onSignIn={app.auth.signIn} error={app.auth.authError} />;
  }

  if (!app.hasClients) {
    return (
      <OnboardingView
        userName={app.auth.member?.name ?? app.auth.user?.email}
        onSignOut={app.auth.signOut}
        onClientsFound={app.auth.refreshProfile}
      />
    );
  }

  if (needsPicker) {
    if (app.cachedClient) return null
    return (
      <>
        <ClientPickerLayout
          userName={app.auth.member?.name ?? ""}
          userEmail={app.auth.user?.email}
          userAvatarUrl={app.auth.member?.avatar_url}
          darkMode={app.darkMode}
          onToggleDark={app.toggleDark}
          clients={app.auth.clients}
          onSelectClient={(client) => app.selectClient(client.id)}
          onSignOut={app.auth.signOut}
          onGoToProfile={() => app.handleViewChange("profile")}
        />
        {app.transitionTarget && (
          <ClientTransitionOverlay
            clientName={app.transitionTarget.name}
            onComplete={app.onTransitionComplete}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Toaster richColors position="bottom-right" />

      <AppLayout
        // theme
        darkMode={app.darkMode}
        onToggleDark={app.toggleDark}
        // header
        notifications={app.notifications.notifications}
        unreadCount={app.notifications.unreadCount}
        selectedClientId={app.effectiveClientId ?? null}
        onToggleMobileSidebar={app.sidebar.openMobileSidebar}
        onMarkNotificationAsRead={app.notifications.markAsRead}
        onMarkAllNotificationsAsRead={app.notifications.markAllAsRead}
        onNotificationClick={app.handleNotificationClick}
        onReloadNotifications={app.notifications.reload}
        onLoadOlderNotifications={app.notifications.loadOlder}
        hasMoreNotifications={app.notifications.hasMore}
        loadingOlderNotifications={app.notifications.loadingOlder}
        // sidebar
        sidebarOpen={app.sidebar.sidebarOpen}
        mobileSidebarOpen={app.sidebar.mobileSidebarOpen}
        onToggleSidebar={app.sidebar.toggleSidebar}
        onCloseMobileSidebar={app.sidebar.closeMobileSidebar}
        view={app.view}
        onViewChange={app.handleViewChange}
        hasClients={app.hasClients}
        role={app.accessRole}
        userEmail={app.auth.user?.email}
        userAvatarUrl={app.auth.member?.avatar_url}
        onSignOut={app.auth.signOut}
        selectedClient={app.selectedClient}
        availableClients={app.auth.clients}
        onSelectClient={app.selectClient}
        isAdmin={app.auth.isAdmin}
        // router
        effectiveClientId={app.effectiveClientId}
        userName={app.auth.member?.name ?? ""}
        userId={app.auth.user?.id ?? ""}
        memberId={app.auth.member?.id ?? ""}
        notificationsLoading={app.notifications.loading}
        holidays={app.holidays}
        onEditTask={app.taskActions.openEditTask}
        onOpenNewTask={app.taskActions.openNewTask}
        onDeleteTask={app.taskActions.requestDeleteTask}
        onUpdateTask={app.updateTask}
        urlTaskId={app.urlTaskId}
        onOpenTask={app.openTask}
        onCloseTask={app.closeTask}
      />

      <AppModals
        taskModal={{
          isOpen: app.isModalOpen,
          editingTask: app.taskActions.editingTask,
          onClose: app.closeTaskModal,
          onSave: app.taskActions.saveTask,
          onDelete: (id) => app.taskActions.requestDeleteTask(id, true),
        }}
        deleteModal={{
          pendingId: app.taskActions.pendingDeleteTaskId,
          onConfirm: app.taskActions.confirmDeleteTask,
          onCancel: app.taskActions.cancelDeleteTask,
        }}
        transition={{
          target: app.transitionTarget,
          onComplete: app.onTransitionComplete,
        }}
        members={app.members}
        holidays={app.holidays}
      />
    </>
   );
}
