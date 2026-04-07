import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/hooks/useSupabase'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { getSafeRedirectUrl } from '@/lib/securityRedirect'

export interface ClientOption {
  id: string
  name: string
  slug?: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  member: Member | null
  clients: ClientOption[]
  isAdmin: boolean
  impersonatedClientId: string | null
  setImpersonatedClientId: (id: string | null) => void
  signIn: () => void
  signOut: () => void
  authError: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined
const configuredSessionMaxAgeHours = Number(import.meta.env.VITE_SESSION_MAX_AGE_HOURS ?? '168')
const SESSION_MAX_AGE_HOURS = Number.isFinite(configuredSessionMaxAgeHours)
  ? Math.max(48, configuredSessionMaxAgeHours)
  : 168

function isSessionExpiredByPolicy(currentUser: User): boolean {
  if (!currentUser.last_sign_in_at) return false

  const lastSignInAt = new Date(currentUser.last_sign_in_at).getTime()
  if (Number.isNaN(lastSignInAt)) return false

  const maxAgeMs = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
  return Date.now() - lastSignInAt > maxAgeMs
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null>(null)
  const bootstrappedUserIdRef = useRef<string | null>(null)

  async function loadProfile(authUid: string, userEmail?: string) {
    try {
      let { data: memberData } = await supabase
        .from('members')
        .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
        .eq('auth_user_id', authUid)
        .single()

      if (!memberData && userEmail) {
        const { data: pendingMember } = await supabase
          .from('members')
          .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
          .eq('email', userEmail.toLowerCase())
          .is('auth_user_id', null)
          .single()

        if (pendingMember) {
          const avatarFromSession = user?.user_metadata?.avatar_url
          await supabase
            .from('members')
            .update({
              auth_user_id: authUid,
              avatar_url: avatarFromSession ?? pendingMember.avatar_url,
            })
            .eq('id', pendingMember.id)

          memberData = { ...pendingMember, auth_user_id: authUid, avatar_url: avatarFromSession ?? pendingMember.avatar_url }
        }
      }

      if (!memberData) { setMember(null); setClients([]); return }

      const avatarFromSession = user?.user_metadata?.avatar_url
      if (avatarFromSession && !memberData.avatar_url) {
        await supabase
          .from('members')
          .update({ avatar_url: avatarFromSession })
          .eq('id', memberData.id)
        memberData.avatar_url = avatarFromSession
      }

      setMember(memberData as Member)

      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name, slug')
        .order('name')

      if (memberData.access_role !== 'admin') {
        const { data: uc } = await supabase
          .from('user_clients')
          .select('client_id')
          .eq('user_id', memberData.id)

        const clientIds = (uc ?? []).map((r: { client_id: string }) => r.client_id)

        if (clientIds.length > 0) {
          setClients((allClients ?? []).filter(c => clientIds.includes(c.id)))
        } else {
          setClients([])
        }
      } else {
        setClients(allClients ?? [])
      }
    } catch (err) {
      console.warn('[AuthContext] Erro ao carregar perfil:', err)
      setMember(null)
      setClients([])
    }
  }

  useEffect(() => {
    if (subscriptionRef.current) return

    let mounted = true

    const setupSubscription = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted && data.session) {
          if (isSessionExpiredByPolicy(data.session.user)) {
            await supabase.auth.signOut({ scope: 'local' })
            setAuthError('Sua sessão expirou por segurança. Faça login novamente.')
            setLoading(false)
            return
          }

          setSession(data.session)
          setUser(data.session.user)
          await loadProfile(data.session.user.id, data.session.user.email)
          bootstrappedUserIdRef.current = data.session.user.id
          setLoading(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return

            if (newSession?.user) {
              const email = newSession.user.email ?? ''
              const domain = email.split('@')[1]

              if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
                setTimeout(() => supabase.auth.signOut({ scope: 'local' }).catch(() => {}), 0)
                setAuthError('Acesso não autorizado para esta conta.')
                setSession(null); setUser(null); setLoading(false)
                return
              }

              if (isSessionExpiredByPolicy(newSession.user)) {
                setTimeout(() => supabase.auth.signOut({ scope: 'local' }).catch(() => {}), 0)
                setAuthError('Sua sessão expirou por segurança. Faça login novamente.')
                setSession(null); setUser(null); setLoading(false)
                return
              }

              const shouldSkipProfileLoad =
                event === 'INITIAL_SESSION' &&
                bootstrappedUserIdRef.current === newSession.user.id

              if (!shouldSkipProfileLoad) {
                await loadProfile(newSession.user.id, newSession.user.email ?? undefined)
              }
            } else {
              setMember(null)
              setClients([])
              bootstrappedUserIdRef.current = null
            }

            setSession(newSession)
            setUser(newSession?.user ?? null)
            setAuthError(null)
            setLoading(false)
          }
        )

        subscriptionRef.current = subscription
      } catch (err) {
        if (err instanceof Error && err.name === 'NavigatorLockAcquireTimeoutError') {
          console.warn('[AuthContext] NavigatorLock timeout — re tentaremos em 1s')
          setTimeout(setupSubscription, 1000)
        } else {
          console.error('[AuthContext] Erro ao inicializar auth:', err)
          setAuthError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
          setLoading(false)
        }
      }
    }

    setupSubscription()

    return () => {
      mounted = false
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getSafeRedirectUrl(window.location.origin, window.location.origin) },
    })

  const signOut = () => supabase.auth.signOut().catch(console.error)

  return (
    <AuthContext.Provider value={{
      session, user, member, clients,
      isAdmin: member?.access_role === 'admin',
      impersonatedClientId, setImpersonatedClientId,
      signIn, signOut, authError, loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>')
  return ctx
}
