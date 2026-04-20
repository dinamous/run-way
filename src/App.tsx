import { Toaster } from "sonner";
import { useAppOrchestrator } from "@/hooks/useAppOrchestrator";
import { AppLayout } from "@/components/AppLayout";
import { AppModals } from "@/components/AppModals";
import { LoginView } from "@/views/login";
import { OnboardingView } from "@/views/onboarding";

export default function App() {
  const app = useAppOrchestrator();

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
        holidays={app.holidays}
        onEditTask={app.taskActions.openEditTask}
        onOpenNewTask={app.taskActions.openNewTask}
        onDeleteTask={app.taskActions.requestDeleteTask}
        onUpdateTask={app.updateTask}
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
