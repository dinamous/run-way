import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldOff,
  Megaphone,
  MessageSquare,
  ClipboardList,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useNotificationPolling } from "@/hooks/notifications/useNotificationPolling";
import type { Notification } from "@/types/notification";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  loading?: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  reload?: () => void;
  onLoadOlder?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
  selectedClientId?: string | null;
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

function getDateGroup(dateString: string): { label: string; key: string } {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return { label: "Hoje", key: "today" };
  if (diffDays === 1) return { label: "Ontem", key: "yesterday" };
  if (diffDays < 7) return { label: "Últimos 7 dias", key: "week" };
  return { label: "Mais antigas", key: "older" };
}

function groupNotificationsByDate(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();

  for (const n of notifications) {
    const { key } = getDateGroup(n.created_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  const order = ["today", "yesterday", "week", "older"];
  const sorted = new Map<string, Notification[]>();
  for (const key of order) {
    if (groups.has(key)) sorted.set(key, groups.get(key)!);
  }
  return sorted;
}

function getNotificationTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case "step_assigned":
      return <UserCheck className="w-3.5 h-3.5 text-emerald-500" />;
    case "step_unassigned":
      return <UserX className="w-3.5 h-3.5 text-orange-500" />;
    case "role_changed":
      return <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />;
    case "client_access_granted":
      return <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />;
    case "client_access_revoked":
      return <ShieldOff className="w-3.5 h-3.5 text-destructive" />;
    case "admin_broadcast":
      return <Megaphone className="w-3.5 h-3.5 text-primary" />;
    case "manual":
      return <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function playNotificationSound() {
  const audio = new Audio("/notification.mp3");
  audio.volume = 0.3;
  audio.play().catch(() => {});
}

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

// Bell ring animation: swing + damped bounce
const bellRingVariants = {
  idle: { rotate: 0 },
  ring: {
    rotate: prefersReducedMotion
      ? 0
      : [0, -18, 16, -12, 9, -5, 3, -1, 0],
    transition: {
      duration: 0.7,
      ease: "easeOut" as const,
      times: [0, 0.1, 0.25, 0.4, 0.55, 0.67, 0.77, 0.88, 1],
    },
  },
};

// Ripple pulse for badge
function BadgeRipple({ count }: { count: number }) {
  if (prefersReducedMotion) {
    return (
      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center z-10">
        {count > 9 ? "9+" : count}
      </span>
    );
  }

  return (
    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center z-10">
      <motion.span
        key={count}
        initial={{ scale: 1.6, opacity: 0.7 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute w-4 h-4 rounded-full bg-primary"
      />
      <motion.span
        key={`badge-${count}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className="relative w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center"
      >
        {count > 9 ? "9+" : count}
      </motion.span>
    </span>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  index,
  sweeping,
  sweepDelay,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClick: (n: Notification) => void;
  index: number;
  sweeping?: boolean;
  sweepDelay?: number;
}) {
  const isPersonal = !!notification.user_id;
  // optimistically track read state locally; sweepDone handles cascade mark-all
  const [optimisticRead, setOptimisticRead] = useState(false);
  const [sweepDone, setSweepDone] = useState(false);

  const isRead = notification.read || optimisticRead || sweepDone;

  // Cascade sweep when "mark all as read" is triggered
  useEffect(() => {
    if (!sweeping || isRead) return;
    const timer = setTimeout(() => setSweepDone(true), sweepDelay ?? 0);
    return () => clearTimeout(timer);
  }, [sweeping, isRead, sweepDelay]);

  const handleClick = () => {
    if (!isRead) {
      setOptimisticRead(true);
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: prefersReducedMotion ? 0 : index * 0.04,
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className={`group relative flex items-start gap-3 px-3 py-3 cursor-pointer rounded-md m-1 border border-black/5 dark:border-white/10 transition-colors duration-200 ${
          isRead
            ? "bg-background hover:bg-muted/40"
            : "bg-muted/30 hover:bg-muted/50"
        }`}
      >
        <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-muted">
          {getNotificationTypeIcon(notification.type)}
        </div>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex flex-col items-end text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 flex-shrink-0 leading-tight">
            <span>{formatDate(notification.created_at)}</span>
            <span className="opacity-60">{formatTime(notification.created_at)}</span>
          </div>

          <div className="text-xs text-muted-foreground prose prose-xs dark:prose-invert max-w-none [&_p]:mb-0 [&_strong]:text-foreground [&_em]:text-foreground/80">
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {notification.message}
            </ReactMarkdown>
          </div>

          <span
            className={`text-[10px] mt-0.5 font-medium ${
              isPersonal ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
            }`}
          >
            {isPersonal ? "Para você" : "Para todos do cliente"}
          </span>
        </div>

        <AnimatePresence>
          {!isRead && (
            <motion.span
              key="unread-dot"
              initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5"
            />
          )}
        </AnimatePresence>
      </DropdownMenuItem>
    </motion.div>
  );
}

const GROUP_LABELS: Record<string, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Últimos 7 dias",
  older: "Mais antigas",
};
const GROUP_ORDER = ["today", "yesterday", "week", "older"];

export const NotificationBell = memo(
  function NotificationBell({
    notifications,
    unreadCount,
    onMarkAsRead,
    onMarkAllAsRead,
    onNotificationClick,
    reload,
    onLoadOlder,
    hasMore = false,
    loadingOlder = false,
    selectedClientId,
  }: NotificationBellProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "current">("all");
    const [ringing, setRinging] = useState(false);
    const [sweeping, setSweeping] = useState(false);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const initialOpenDone = useRef(false);
    const hasInitiallyLoaded = useRef(false);

    const handleReload = useCallback(() => reload?.(), [reload]);

    useNotificationPolling({ enabled: !!reload, interval: 15000, fn: handleReload });

    useEffect(() => {
      if (open && !initialOpenDone.current && reload) {
        initialOpenDone.current = true;
        reload();
      }
    }, [open, reload]);

    useEffect(() => {
      if (!hasInitiallyLoaded.current) {
        hasInitiallyLoaded.current = true;
        prevIdsRef.current = new Set(notifications.map((n) => n.id));
        return;
      }

      let hasNew = false;
      const newIds = new Set<string>();
      for (const n of notifications) {
        newIds.add(n.id);
        if (!prevIdsRef.current.has(n.id)) hasNew = true;
      }

      if (hasNew) {
        playNotificationSound();
        if (!prefersReducedMotion) {
          setTimeout(() => {
            setRinging(true);
            setTimeout(() => setRinging(false), 800);
          }, 0);
        }
      }

      prevIdsRef.current = newIds;
    }, [notifications]);

    const handleMarkAllAsRead = useCallback(() => {
      setSweeping(true);
      onMarkAllAsRead();
      setTimeout(() => setSweeping(false), 800);
    }, [onMarkAllAsRead]);

    const filteredNotifications = useMemo(() => {
      if (activeTab === "current" && selectedClientId) {
        return notifications.filter((n) => n.client_id === selectedClientId);
      }
      return notifications;
    }, [notifications, activeTab, selectedClientId]);

    const groupedNotifications = useMemo(
      () => groupNotificationsByDate(filteredNotifications),
      [filteredNotifications],
    );

    const unreadInTab = filteredNotifications.filter((n) => !n.read).length;

    // Build flat index for stagger delay across groups
    let globalIndex = 0;
    const itemIndices = new Map<string, number>();
    for (const groupKey of GROUP_ORDER) {
      const items = groupedNotifications.get(groupKey) ?? [];
      for (const item of items) {
        itemIndices.set(item.id, globalIndex++);
      }
    }

    // Sweep delay per notification (cascade top-to-bottom)
    const sweepDelayFor = (id: string) => (itemIndices.get(id) ?? 0) * 60;

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <motion.div
              variants={bellRingVariants}
              animate={ringing ? "ring" : "idle"}
              style={{ transformOrigin: "top center" }}
            >
              <Bell className="w-4 h-4" />
            </motion.div>

            <AnimatePresence>
              {unreadCount > 0 && (
                <BadgeRipple key={unreadCount} count={unreadCount} />
              )}
            </AnimatePresence>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[95vw] max-w-[420px] sm:max-w-[480px] p-0 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notificações</span>
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {unreadInTab > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleMarkAllAsRead();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar como lidas
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Tabs */}
          <div className="px-3 pb-2">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "all" | "current")}
            >
              <TabsList variant="pills" className="h-8 w-full p-1">
                <TabsTrigger
                  value="all"
                  className="flex-1 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="current"
                  className="flex-1 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Cliente atual
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <DropdownMenuSeparator className="m-0" />

          {/* Lista */}
          <div className="overflow-y-auto max-h-80">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground"
              >
                <motion.div
                  animate={prefersReducedMotion ? {} : {
                    rotate: [0, -8, 8, -4, 4, 0],
                    transition: {
                      delay: 0.4,
                      duration: 1.2,
                      ease: "easeOut",
                      repeat: Infinity,
                      repeatDelay: 4,
                    },
                  }}
                  style={{ transformOrigin: "top center" }}
                >
                  <Bell className="w-6 h-6 opacity-30" />
                </motion.div>
                <span className="text-sm">Nenhuma notificação</span>
              </motion.div>
            ) : (
              <div className="py-1">
                {GROUP_ORDER.map((groupKey) => {
                  const items = groupedNotifications.get(groupKey);
                  if (!items?.length) return null;

                  return (
                    <div key={groupKey}>
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 sticky top-0 z-10">
                        {GROUP_LABELS[groupKey]}
                      </div>
                      <div className="flex flex-col gap-1">
                        {items.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={onMarkAsRead}
                            onClick={onNotificationClick}
                            index={itemIndices.get(notification.id) ?? 0}
                            sweeping={sweeping}
                            sweepDelay={sweepDelayFor(notification.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {activeTab === "all" && (hasMore || loadingOlder) && onLoadOlder && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onLoadOlder();
                      }}
                      disabled={loadingOlder}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loadingOlder ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      {loadingOlder ? "Carregando..." : "Ver anteriores"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
  (prev, next) =>
    prev.unreadCount === next.unreadCount &&
    prev.notifications.length === next.notifications.length &&
    prev.hasMore === next.hasMore &&
    prev.loadingOlder === next.loadingOlder &&
    prev.selectedClientId === next.selectedClientId,
);
