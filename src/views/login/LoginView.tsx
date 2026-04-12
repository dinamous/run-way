import { PlaneTakeoff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui'

interface LoginViewProps {
  onSignIn: () => void
  error?: string | null
}

export default function LoginView({ onSignIn, error }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-black p-3 rounded-2xl">
            <PlaneTakeoff className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>Run/Way</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão de capacidade criativa e de desenvolvimento
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Entre com a sua conta Google para acessar o painel.
          </p>
          <Button className="w-full" onClick={onSignIn}>
            <LogIn className="w-4 h-4 mr-2" />
            Entrar com Google
          </Button>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
