import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/hooks/useSupabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  member: Member | null
  clientIds: string[]
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [clientIds, setClientIds] = useState<string[]>([])
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null)

  // Busca member + clientIds após login
  async function loadProfile(authUid: string) {
    const { data: memberData } = await supabase
      .from('members')
      .select('id, name, role, avatar, auth_user_id, access_role')
      .eq('auth_user_id', authUid)
      .single()

    if (!memberData) { setMember(null); setClientIds([]); return }

    setMember(memberData as Member)

    if (memberData.access_role !== 'admin') {
      const { data: uc } = await supabase
        .from('user_clients')
        .select('client_id')
        .eq('user_id', memberData.id)
      setClientIds((uc ?? []).map((r: { client_id: string }) => r.client_id))
    } else {
      setClientIds([]) // admin usa impersonação ou vê tudo
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const email = newSession.user.email ?? ''
          const domain = email.split('@')[1]

          if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
            await supabase.auth.signOut()
            setAuthError(`Acesso restrito ao domínio @${ALLOWED_DOMAIN}.`)
            setSession(null); setUser(null); setLoading(false)
            return
          }

          await loadProfile(newSession.user.id)
        } else {
          setMember(null)
          setClientIds([])
        }

        setSession(newSession)
        setUser(newSession?.user ?? null)
        setAuthError(null)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut().catch(console.error)

  return (
    <AuthContext.Provider value={{
      session, user, member, clientIds,
      isAdmin: member?.access_role === 'admin',
      impersonatedClientId, setImpersonatedClientId,
      signIn, signOut, authError, loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>')
  return ctx
}
