import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { supabaseAdmin } from '@/lib/supabase'
import {
  createNotification,
  createNotificationForClient,
  createNotificationForAll,
  fetchAllNotifications,
  markAsRead as markAsReadApi,
} from '@/lib/notifications'
import type { Client } from '@/types/db'
import type { Notification } from '@/types/notification'
import { groupNotifications } from './utils'

export type TargetType = 'user' | 'client' | 'all'

export function useNotificationsPanel(clients: Client[]) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('user')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [sending, setSending] = useState(false)
  const [messageTab, setMessageTab] = useState<'edit' | 'preview'>('edit')

  const [history, setHistory] = useState<Notification[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!supabaseAdmin) return
    setLoadingHistory(true)
    setError(null)
    try {
      setHistory(await fetchAllNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const grouped = useMemo(() => groupNotifications(history), [history])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Preencha o título e a mensagem'); return }
    if (!supabaseAdmin) { toast.error('Admin não configurado'); return }

    setSending(true)
    try {
      if (targetType === 'user' && selectedUserId) {
        await createNotification(title, message, selectedUserId, undefined, 'manual')
      } else if (targetType === 'client' && selectedClientId) {
        await createNotificationForClient(selectedClientId, title, message)
      } else if (targetType === 'all') {
        await createNotificationForAll(clients.map((c) => c.id), title, message)
      } else {
        toast.error('Selecione um destino'); setSending(false); return
      }
      toast.success('Notificação enviada')
      setTitle('')
      setMessage('')
      setMessageTab('edit')
      await loadHistory()
    } catch {
      toast.error('Erro ao enviar notificação')
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadApi(id)
      setHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch { toast.error('Erro ao marcar como lida') }
  }

  const handleToggleRead = async (id: string) => {
    try {
      await markAsReadApi(id)
      setHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
    } catch { toast.error('Erro ao atualizar') }
  }

  return {
    title, setTitle,
    message, setMessage,
    targetType, setTargetType,
    selectedUserId, setSelectedUserId,
    selectedClientId, setSelectedClientId,
    sending,
    messageTab, setMessageTab,
    history,
    loadingHistory,
    error,
    grouped,
    loadHistory,
    handleSend,
    handleMarkAsRead,
    handleToggleRead,
  }
}

export type UseNotificationsPanelReturn = ReturnType<typeof useNotificationsPanel>
