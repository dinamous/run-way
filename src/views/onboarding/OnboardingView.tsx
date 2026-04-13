import { useEffect, useRef, useState } from 'react'
import { PlaneTakeoff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface OnboardingViewProps {
  userName?: string | null
  onSignOut: () => void
  onClientsFound: () => Promise<void>
}

const POLL_INTERVAL_MS = 30_000

export function OnboardingView({ userName, onSignOut, onClientsFound }: OnboardingViewProps) {
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function checkClients() {
      setChecking(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: memberData } = await supabase
          .from('members')
          .select('id, access_role')
          .eq('auth_user_id', user.id)
          .single()

        if (!memberData) return

        let hasClients = false

        if (memberData.access_role === 'admin') {
          const { count } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
          hasClients = (count ?? 0) > 0
        } else {
          const { count } = await supabase
            .from('user_clients')
            .select('client_id', { count: 'exact', head: true })
            .eq('user_id', memberData.id)
          hasClients = (count ?? 0) > 0
        }

        if (hasClients) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          await onClientsFound()
        }
      } catch {
        // falha silenciosa — tentará novamente no próximo tick
      } finally {
        setChecking(false)
      }
    }

    intervalRef.current = setInterval(checkClients, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onClientsFound])

  const firstName = userName?.split(' ')[0] ?? userName ?? 'você'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-10">
      {/* Ilustração: pista + avião */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="text-foreground"
          style={{ animation: 'runway-float 3s ease-in-out infinite' }}
        >
          <PlaneTakeoff className="w-12 h-12" strokeWidth={1.5} />
        </div>

        {/* Pista SVG */}
        <svg
          width="220"
          height="32"
          viewBox="0 0 220 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-foreground"
          aria-hidden="true"
        >
          <line x1="0" y1="2" x2="220" y2="2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="30" x2="220" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect
              key={i}
              x={10 + i * 32}
              y={13}
              width={18}
              height={6}
              rx={2}
              fill="currentColor"
              opacity="0.4"
            />
          ))}
        </svg>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-3xl text-foreground"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
        >
          Run/Way
        </h1>
        <p className="text-sm text-muted-foreground">
          Plataforma de gestão e visualização de demandas
        </p>
      </div>

      {/* Card de mensagem */}
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-3 text-center">
        <p className="text-base font-semibold text-foreground">
          Olá, {firstName}! Bem-vindo(a) ao Run/Way.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Parece que você ainda não foi alocado(a) a nenhum projeto ou cliente.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Em breve, o gestor fará seu cadastro. Por favor, aguarde.
        </p>

        {checking && (
          <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 pt-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
              style={{ animation: 'runway-pulse 1.2s ease-in-out infinite' }}
            />
            Verificando automaticamente...
          </p>
        )}
      </div>

      {/* Botão de logout */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSignOut}
        className="text-muted-foreground"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>

      {/* Keyframes inline */}
      <style>{`
        @keyframes runway-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes runway-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
