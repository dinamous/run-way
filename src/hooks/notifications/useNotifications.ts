import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchNotifications,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  createNotification as createNotificationApi,
} from '@/lib/notifications'
import type { Notification, DbNotificationRow } from '@/types/notification'
import { toast } from 'sonner'

const RECENT_DAYS = 7
const OLDER_PAGE_SIZE = 20

function getRecentAfterIso() {
  const d = new Date()
  d.setDate(d.getDate() - RECENT_DAYS)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useNotifications(userId?: string | null, clientIds?: string[]) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const loadedRef = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // Notificações antigas carregadas via "Ver anteriores" (persistem entre reloads)
  const olderNotificationsRef = useRef<Notification[]>([])
  // Limite de data para o próximo fetch de antigas (cursor)
  const nextBeforeRef = useRef<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const load = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const after = getRecentAfterIso()
      // Inicializa o cursor na primeira carga
      if (nextBeforeRef.current === null) {
        nextBeforeRef.current = after
      }
      const data = await fetchNotifications(userId, clientIds, { after })
      setNotifications([...data, ...olderNotificationsRef.current])
      loadedRef.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar')
    } finally {
      setLoading(false)
    }
  }, [userId, clientIds?.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlder = useCallback(async () => {
    if (!userId || !hasMore || loadingOlder) return
    const before = nextBeforeRef.current
    if (!before) return

    setLoadingOlder(true)
    try {
      const data = await fetchNotifications(userId, clientIds, {
        before,
        limit: OLDER_PAGE_SIZE,
      })

      if (data.length === 0) {
        setHasMore(false)
      } else {
        if (data.length < OLDER_PAGE_SIZE) setHasMore(false)
        // Cursor avança para a data da notificação mais antiga retornada
        nextBeforeRef.current = data[data.length - 1].created_at
        olderNotificationsRef.current = [...olderNotificationsRef.current, ...data]
        setNotifications((prev) => [...prev, ...data])
      }
    } catch {
      // falha silenciosa — botão permanece visível para tentar novamente
    } finally {
      setLoadingOlder(false)
    }
  }, [userId, clientIds?.join(','), hasMore, loadingOlder])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    if (loadedRef.current) return

    load()

    if (channelRef.current) return

    const channel = supabase.channel(`notifications-realtime:${userId}`)
    channelRef.current = channel

    const handleInsert = (payload: { new: DbNotificationRow }) => {
      const newNotif = payload.new

      const isForUser = newNotif.user_id === userId
      const isForClient =
        newNotif.user_id === null &&
        newNotif.client_id !== null &&
        (clientIds ?? []).includes(newNotif.client_id)

      if (!isForUser && !isForClient) return

      const notification: Notification = {
        id: newNotif.id,
        user_id: newNotif.user_id,
        client_id: newNotif.client_id,
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message,
        entity: newNotif.entity,
        entity_id: newNotif.entity_id,
        metadata: newNotif.metadata ?? undefined,
        read: newNotif.read,
        created_at: newNotif.created_at,
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev
        return [notification, ...prev]
      })

      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      })
    }

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      handleInsert
    )

    channel.subscribe()

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [userId, clientIds?.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markAsReadApi(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      toast.error('Erro ao marcar como lida')
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    try {
      await markAllAsReadApi(userId, clientIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('parse logic tree') || msg.includes('Failed to parse')) {
        toast.error('Erro ao ler notificações')
      } else {
        toast.error('Erro ao marcar como lidas')
      }
    }
  }, [userId, clientIds?.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const createNotification = useCallback(
    async (
      title: string,
      message: string,
      type?: string,
      metadata?: Record<string, string>
    ) => {
      try {
        await createNotificationApi(title, message, undefined, clientIds?.[0], type, metadata)
        toast.success('Notificação enviada')
        await load()
      } catch {
        toast.error('Erro ao enviar notificação')
      }
    },
    [clientIds?.[0], load]  // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    loadingOlder,
    reload: load,
    loadOlder,
    markAsRead,
    markAllAsRead,
    createNotification,
  }
}
