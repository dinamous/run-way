import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Users,
} from 'lucide-react'

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

interface LoginViewProps {
  onSignIn: () => void
  error?: string | null
}

export default function LoginView({ onSignIn, error }: LoginViewProps) {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLoginClick = () => {
    if (isLoading) return
    setIsLoading(true)
    onSignIn()
  }

  return (
    <div className="login-root">
      <style>{`
        @layer login-animations {
          @property --grid-opacity {
            syntax: '<number>';
            inherits: false;
            initial-value: 0.04;
          }

          .login-root {
            display: flex;
            min-height: 100svh;
            width: 100%;
            background-color: oklch(0.13 0.006 240);
            color: oklch(0.97 0 0);
            font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
            overflow: hidden;
          }

          .login-grid {
            position: absolute;
            inset: 0;
            background-size: 44px 44px;
            background-image:
              linear-gradient(to right, oklch(1 0 0 / var(--grid-opacity)) 1px, transparent 1px),
              linear-gradient(to bottom, oklch(1 0 0 / var(--grid-opacity)) 1px, transparent 1px);
            animation: grid-breathe 8s ease-in-out infinite;
          }
          @keyframes grid-breathe {
            0%, 100% { --grid-opacity: 0.04; }
            50% { --grid-opacity: 0.09; }
          }

          .login-left-glow {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(ellipse 70% 50% at 50% 40%, oklch(0.35 0.06 240 / 0.18), transparent 70%),
              radial-gradient(ellipse 40% 30% at 75% 70%, oklch(0.4 0.08 280 / 0.1), transparent 60%);
          }

          @supports (animation-name: none) {
            .login-stagger-1,
            .login-stagger-2,
            .login-stagger-3,
            .login-stagger-4 {
              animation: stagger-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            .login-stagger-1 { animation-delay: 0ms; }
            .login-stagger-2 { animation-delay: 80ms; }
            .login-stagger-3 { animation-delay: 160ms; }
            .login-stagger-4 { animation-delay: 240ms; }
            @keyframes stagger-in {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          }

          .login-float {
            animation: float 7s ease-in-out infinite;
          }
          .login-float-delayed {
            animation: float 9s ease-in-out infinite 1.4s;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-10px); }
          }

          .btn-google::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
              105deg,
              transparent 30%,
              oklch(0 0 0 / 0.06) 50%,
              transparent 70%
            );
            background-size: 200% 100%;
            background-position: 200% 0;
            transition: background-position 0.6s ease;
            border-radius: inherit;
          }
          .btn-google:not(:disabled):hover::after {
            background-position: -100% 0;
          }

          .btn-google .btn-content {
            display: flex;
            align-items: center;
            gap: 12px;
            transition: opacity 0.2s ease;
          }
          .btn-google .btn-arrow {
            position: absolute;
            right: 16px;
            opacity: 0;
            transform: translateX(-6px);
            transition: opacity 0.25s ease, transform 0.25s ease;
          }
          .btn-google:not(:disabled):hover .btn-arrow {
            opacity: 1;
            transform: translateX(0);
          }

          @media (prefers-reduced-motion: reduce) {
            .login-grid { animation: none; }
            .login-float, .login-float-delayed { animation: none; }
            .login-stagger-1,
            .login-stagger-2,
            .login-stagger-3,
            .login-stagger-4 { animation: none; opacity: 1; }
          }
        }
      `}</style>

      {/* Left panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 overflow-hidden"
        style={{ borderRight: '1px solid oklch(1 0 0 / 0.07)', background: 'oklch(0.14 0.008 240)' }}
      >
        <div className="login-grid" />
        <div className="login-left-glow" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 login-stagger-1">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: 'oklch(1 0 0 / 0.09)', border: '1px solid oklch(0.6 0.08 240 / 0.2)' }}
          >
            <LayoutDashboard className="w-5 h-5" style={{ color: 'oklch(0.97 0 0)' }} />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
            Run/Way
          </span>
        </div>

        {/* Floating cards */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 my-10 login-stagger-2">

          {/* Main card */}
          <div
            className="login-float w-full max-w-xs rounded-2xl p-6"
            style={{
              background: 'oklch(0.19 0.01 240)',
              border: '1px solid oklch(1 0 0 / 0.1)',
              boxShadow: '0 24px 48px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(0.4 0.06 240 / 0.12)',
            }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'oklch(0.28 0.02 240)' }}
              >
                <LayoutDashboard className="w-5 h-5" style={{ color: 'oklch(0.85 0 0)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'oklch(0.95 0 0)' }}>Capacidade da equipe</div>
                <div className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>Visão em tempo real</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {['Distribuição de demandas', 'Acompanhamento de sprints', 'Gestão de gargalos'].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-xs" style={{ color: 'oklch(0.72 0 0)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'oklch(0.78 0 0)' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Secondary card */}
          <div
            className="login-float-delayed self-end mr-4 w-44 rounded-xl p-4"
            style={{
              background: 'oklch(0.21 0.012 240)',
              border: '1px solid oklch(1 0 0 / 0.08)',
              boxShadow: '0 12px 32px oklch(0 0 0 / 0.4)',
              rotate: '3deg',
            }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Users className="w-3.5 h-3.5" style={{ color: 'oklch(0.6 0 0)' }} />
              <span className="text-xs font-medium" style={{ color: 'oklch(0.75 0 0)' }}>Equipe</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'oklch(0.27 0.01 240)' }}>
              <div className="h-full w-[72%] rounded-full" style={{ background: 'oklch(0.65 0.08 240)' }} />
            </div>
            <p className="text-right mt-2" style={{ fontSize: '10px', color: 'oklch(0.5 0 0)' }}>72% alocada</p>
          </div>

        </div>

        {/* Quote */}
        <div className="relative z-10 login-stagger-3" style={{ maxWidth: '22rem' }}>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'oklch(0.62 0 0)' }}>
            "Eliminar gargalos criativos nunca foi tão visual. Conseguimos responder o estado do sprint em segundos."
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)', border: '1px solid oklch(1 0 0 / 0.06)' }}
            >
              RC
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: 'oklch(0.82 0 0)' }}>Rafael Costa</div>
              <div style={{ fontSize: '10px', color: 'oklch(0.45 0 0)' }}>Head of Product Design</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="relative flex flex-col justify-center w-full lg:w-1/2 p-8 sm:p-12 lg:p-20"
        style={{ background: 'oklch(0.18 0.006 240)' }}
      >

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 60% 30%, oklch(0.28 0.04 240 / 0.25), transparent 70%)',
          }}
        />

        {/* Glow mobile */}
        <div
          className="absolute top-0 right-0 w-full pointer-events-none lg:hidden"
          style={{ height: '400px', background: 'radial-gradient(ellipse at top right, oklch(0.3 0.04 240 / 0.2), transparent 70%)' }}
        />

        <div
          className="relative z-10 w-full mx-auto"
          style={{ maxWidth: '380px', opacity: mounted ? 1 : 0, transition: 'opacity 0.1s' }}
        >

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-3 mb-10 login-stagger-1">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'oklch(0.22 0.01 240)', border: '1px solid oklch(1 0 0 / 0.08)' }}
            >
              <LayoutDashboard className="w-6 h-6" style={{ color: 'oklch(0.82 0 0)' }} />
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>Run/Way</span>
          </div>

          {/* Heading */}
          <div className="mb-8 login-stagger-1">
            <h2 className="font-semibold tracking-tight mb-2" style={{ fontSize: '1.6rem', color: 'oklch(0.97 0 0)', lineHeight: 1.2 }}>
              Acesse sua conta
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.52 0 0)' }}>
              Gestão de capacidade para times de design e desenvolvimento. Entre com sua conta corporativa.
            </p>
          </div>

          <div className="login-stagger-2">
            {/* Google button */}
            <button
              onClick={handleLoginClick}
              disabled={isLoading}
              className="btn-google relative w-full flex items-center justify-center gap-3 text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'oklch(0.97 0 0)',
                color: 'oklch(0.14 0 0)',
                padding: '13px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 0 1px oklch(0.97 0 0), 0 2px 8px oklch(0 0 0 / 0.4)',
                overflow: 'hidden',
              }}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'oklch(0.45 0 0)' }} />
              ) : (
                <>
                  <span className="btn-content">
                    <GoogleIcon className="w-4 h-4" />
                    <span>Continuar com o Google</span>
                  </span>
                  <ArrowRight className="btn-arrow w-4 h-4" style={{ color: 'oklch(0.45 0 0)' }} />
                </>
              )}
            </button>

            {/* Security badges */}
            <div
              className="flex items-center gap-4 mt-5 pt-5"
              style={{ borderTop: '1px solid oklch(1 0 0 / 0.09)' }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'oklch(0.42 0 0)' }}>
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'oklch(0.62 0 0)' }} />
                Conexão segura
              </div>
              <div className="w-1 h-1 rounded-full" style={{ background: 'oklch(0.27 0 0)' }} />
              <div className="text-xs" style={{ color: 'oklch(0.42 0 0)' }}>Acesso restrito</div>
            </div>

            {/* Error state */}
            {error && (
              <div
                className="flex items-start gap-3 mt-5 p-4 rounded-xl text-sm login-stagger-1"
                style={{
                  background: 'oklch(0.22 0.04 27)',
                  border: '1px solid oklch(0.4 0.1 27)',
                  color: 'oklch(0.78 0.08 27)',
                }}
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium mb-0.5" style={{ color: 'oklch(0.85 0.06 27)' }}>Falha na autenticação</div>
                  <p style={{ color: 'oklch(0.68 0.08 27)' }}>{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer link */}
        <div
          className="absolute bottom-8 text-xs"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'oklch(0.35 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          Problemas para acessar?{' '}
          <a
            href="#"
            className="transition-colors"
            style={{ color: 'oklch(0.52 0 0)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'oklch(0.75 0 0)')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'oklch(0.52 0 0)')}
          >
            Fale com o suporte IT
          </a>
        </div>
      </div>
    </div>
  )
}
