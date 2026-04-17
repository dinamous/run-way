import { useEffect, useRef, useState } from 'react'

interface ClientTransitionOverlayProps {
  clientName: string
  onComplete: () => void
}

const MESSAGES = [
  '🛂 Verificando passaporte',
  '🎫 Confirmando embarque',
  '🛫 Decolando agora',
  '✈️  Em rota de cruzeiro',
]

const TOTAL_MS = 3800
const MSG_INTERVAL = TOTAL_MS / MESSAGES.length

// Nuvens
const CLOUDS = [
  { x: 6,  y: 12, s: 1.0, o: 0.06, d: 22, dx: 10 },
  { x: 70, y:  8, s: 0.7, o: 0.04, d: 28, dx: 8  },
  { x: 35, y: 20, s: 1.3, o: 0.05, d: 18, dx: 14 },
  { x: 82, y: 32, s: 0.85,o: 0.04, d: 24, dx: 9  },
  { x: 15, y: 48, s: 1.1, o: 0.05, d: 20, dx: 12 },
  { x: 58, y: 58, s: 0.65,o: 0.03, d: 30, dx: 7  },
  { x: 3,  y: 68, s: 0.9, o: 0.05, d: 26, dx: 11 },
  { x: 88, y: 65, s: 1.2, o: 0.04, d: 16, dx: 13 },
]

function PlaneSide({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.66}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-foreground drop-shadow-md"
    >
      {/* O avião agora é desenhado RETO. A rotação acontece na keyframe do CSS */}
      <g>
        {/* ELEMENTOS DE FUNDO */}
        <path d="M 55 36 L 75 36 L 62 20 L 48 20 Z" fill="currentColor" opacity="0.2" />
        <rect x="65" y="24" width="14" height="6" rx="2" fill="currentColor" opacity="0.2" />
        <path d="M 30 32 L 22 22 L 14 22 L 24 32 Z" fill="currentColor" opacity="0.25" />

        {/* ELEMENTOS PRINCIPAIS */}
        <path
          d="M 20 38 C 18 36, 25 28, 40 28 L 85 28 C 105 28, 112 32, 112 36 C 112 42, 102 46, 85 46 L 40 46 C 25 46, 18 40, 20 38 Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M 98 28.5 Q 106 28.5 109 33 L 100 33 Z" fill="currentColor" opacity="0.5" />
        <path
          d="M 45 35 L 85 35"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="1 6"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path d="M 40 28 L 24 8 L 14 8 L 28 28 Z" fill="currentColor" opacity="0.85" />
        <path d="M 24 40 L 34 40 L 22 52 L 14 52 Z" fill="currentColor" opacity="0.85" />
        <path d="M 48 40 L 75 40 L 52 64 L 35 64 Z" fill="currentColor" opacity="0.85" />
        <path d="M 58 44 L 62 40 L 68 40 L 64 44 Z" fill="currentColor" opacity="0.9" />
        <rect x="54" y="42" width="18" height="8" rx="3" fill="currentColor" />
      </g>
    </svg>
  )
}

function Cloud({ x, y, s, o, d, dx }: typeof CLOUDS[0]) {
  const delay = -(d * 0.4)
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        opacity: o,
        transform: `scale(${s})`,
        transformOrigin: 'left center',
        animation: `ct-cloud-${Math.round(dx)} ${d}s ease-in-out ${delay}s infinite alternate`,
      }}
    >
      <svg width="110" height="44" viewBox="0 0 110 44" fill="currentColor" className="text-foreground blur-[1px]">
        <ellipse cx="55" cy="34" rx="48" ry="12" />
        <ellipse cx="36" cy="26" rx="26" ry="16" />
        <ellipse cx="66" cy="22" rx="30" ry="18" />
        <ellipse cx="50" cy="18" rx="20" ry="14" />
      </svg>
    </div>
  )
}

export function ClientTransitionOverlay({ clientName, onComplete }: ClientTransitionOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [msgOut, setMsgOut] = useState(false)
  const [visible, setVisible] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 20)

    let current = 0
    const msgInterval = setInterval(() => {
      setMsgOut(true)
      setTimeout(() => {
        current = (current + 1) % MESSAGES.length
        setMessageIndex(current)
        setMsgOut(false)
      }, 350)
    }, MSG_INTERVAL)

    const fadeOutTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onCompleteRef.current(), 500)
    }, TOTAL_MS)

    return () => {
      clearTimeout(showTimer)
      clearInterval(msgInterval)
      clearTimeout(fadeOutTimer)
    }
  }, [])

  const uniqueDx = [...new Set(CLOUDS.map((c) => Math.round(c.dx)))]

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      {/* Gradiente de céu */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 35%, var(--muted) 0%, transparent 100%)',
          opacity: 0.6,
        }}
      />

      {/* Nuvens */}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}

      {/* Linha de horizonte */}
      <div
        className="absolute w-full pointer-events-none"
        style={{ bottom: '26%', height: '1px', background: 'var(--border)', opacity: 0.3 }}
      />

      {/* Pista animada (Ilusão de velocidade) */}
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{ bottom: '24%', left: '50%', transform: 'translateX(-50%)', width: '300px' }}
      >
        <svg width="400" height="24" viewBox="0 0 400 24" fill="none" className="text-foreground">
          <line x1="0" y1="1" x2="400" y2="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.18" />
          <line x1="0" y1="23" x2="400" y2="23" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.18" />
          <g style={{ animation: 'ct-runway 0.4s linear infinite' }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <rect key={i} x={i * 35} y={10} width={20} height={4} rx={2} fill="currentColor" opacity="0.1" />
            ))}
          </g>
        </svg>
      </div>

      {/* Avião lateral + rastro (Animado via GPU usando Translate3D) */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '24%',
          left: '0', // Ponto de partida fixo para usar apenas translate3d
          animation: 'ct-takeoff 3.8s cubic-bezier(0.3, 0, 0.2, 1) forwards',
        }}
      >
        {/* Rastro */}
        <div
          className="absolute pointer-events-none"
          style={{ right: '100%', top: '40%', transform: 'translateY(-50%)' }}
        >
          <svg width="180" height="8" viewBox="0 0 180 8" fill="none">
            <defs>
              <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect x="0" y="1" width="180" height="2.5" rx="1.5" fill="url(#tg)" className="text-foreground" />
            <rect x="20" y="5" width="130" height="1.5" rx="1" fill="url(#tg)" className="text-foreground" opacity="0.4" />
          </svg>
        </div>

        <PlaneSide size={64} />
      </div>

      {/* Conteúdo central */}
      <div className="relative flex flex-col items-center gap-4 z-10 backdrop-blur-sm bg-background/30 p-8 rounded-3xl">
        <p className="text-xs font-semibold tracking-[0.35em] uppercase text-muted-foreground">
          Destino
        </p>

        <h2
          className="text-5xl font-bold text-foreground text-center leading-tight px-8 drop-shadow-sm"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {clientName}
        </h2>

        <div className="flex items-center gap-3 w-44">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground/30 text-xs">✦</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <p
          className="text-sm font-medium text-muted-foreground text-center whitespace-nowrap"
          style={{
            opacity: msgOut ? 0 : 0.85,
            transform: msgOut ? 'translateY(4px)' : 'translateY(0)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          {MESSAGES[messageIndex]}
        </p>
      </div>

      <style>{`
        /* Animação via GPU usando viewports (vw/vh) e translate3d */
        @keyframes ct-takeoff {
          0%   { transform: translate3d(-15vw, 0, 0) rotate(0deg); }
          45%  { transform: translate3d(45vw, 0, 0) rotate(0deg); }
          65%  { transform: translate3d(60vw, -8vh, 0) rotate(-12deg); }
          85%  { transform: translate3d(80vw, -30vh, 0) rotate(-22deg); }
          100% { transform: translate3d(120vw, -60vh, 0) rotate(-28deg); }
        }

        /* Faz a pista correr para trás dando ilusão de velocidade horizontal */
        @keyframes ct-runway {
          from { transform: translateX(0); }
          to   { transform: translateX(-35px); }
        }

        ${uniqueDx
          .map(
            (dx) => `
        @keyframes ct-cloud-${dx} {
          from { transform: translateX(-${dx}px); }
          to   { transform: translateX(${dx}px); }
        }`
          )
          .join('\n')}
      `}</style>
    </div>
  )
}