import { useState, useEffect } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const email = newSession.user.email ?? ''
          const domain = email.split('@')[1]

          if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
            await supabase.auth.signOut()
            setAuthError(`Acesso restrito ao domínio @${ALLOWED_DOMAIN}.`)
            setSession(null)
            setUser(null)
            setLoading(false)
            return
          }
        }

        setSession(newSession)
        setUser(newSession?.user ?? null)
        setAuthError(null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut()

  return { session, user, signIn, signOut, authError, loading }
}
