import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: 'pt-BR' | 'en'
  notifications_enabled: boolean
  default_view: 'home' | 'calendar' | 'timeline' | 'list'
  client_order: string[] // ordered array of client IDs
  created_at: string
  updated_at: string
}

export interface ProfileFormData {
  name: string
  avatar_url: string
}

export function useProfile() {
  const { member, refreshProfile } = useAuthContext()

  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!member) {
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', member.id)
      .maybeSingle()

    if (fetchError) {
      console.warn('[useProfile] Erro ao buscar preferências:', fetchError)
      setLoading(false)
      return
    }

    if (!data) {
      const defaultPrefs = {
        user_id: member.id,
        theme: 'system' as const,
        language: 'pt-BR' as const,
        notifications_enabled: true,
        default_view: 'home' as const,
        client_order: [] as string[],
      }
      const { data: created, error: createError } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single()

      if (!createError && created) {
        setPreferences(created as UserPreferences)
      }
    } else {
      setPreferences(data as UserPreferences)
    }
    setLoading(false)
  }, [member])

  useEffect(() => {
    fetchPreferences() // eslint-disable-line react-hooks/set-state-in-effect
  }, [member, fetchPreferences])

  const updateProfile = useCallback(async (formData: ProfileFormData) => {
    if (!member) return false

    setSaving(true)
    setError(null)

    const updates: Record<string, string> = { name: formData.name }
    if (formData.avatar_url.trim()) {
      updates.avatar_url = formData.avatar_url.trim()
    }

    const { error: updateError } = await supabase
      .from('members')
      .update(updates)
      .eq('id', member.id)

    setSaving(false)

    if (updateError) {
      setError('Erro ao salvar perfil. Tente novamente.')
      return false
    }

    await refreshProfile()
    setSuccessMessage('Perfil atualizado com sucesso!')
    setTimeout(() => setSuccessMessage(null), 3000)
    return true
  }, [member, refreshProfile])

  const updatePreferences = useCallback(async (prefs: Partial<Pick<UserPreferences, 'theme' | 'language' | 'notifications_enabled' | 'default_view' | 'client_order'>>) => {
    if (!member || !preferences) return false

    setSavingPrefs(true)

    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq('user_id', member.id)

    setSavingPrefs(false)

    if (updateError) {
      console.warn('[useProfile] Erro ao salvar preferências:', updateError)
      return false
    }

    setPreferences((prev) => prev ? { ...prev, ...prefs } : prev)
    return true
  }, [member, preferences])

  return {
    member,
    preferences,
    loading,
    saving,
    savingPrefs,
    error,
    successMessage,
    updateProfile,
    updatePreferences,
  }
}
