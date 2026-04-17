import { useEffect, useRef, useState } from "react";

// --- TIPO DAS PROPS ---
interface ClientTransitionOverlayProps {
  clientName: string;
  onComplete: () => void;
}

const MESSAGES = [
  "🛂 Verificando credenciais",
  "🎫 Confirmando embarque",
  "🛫 Autorização de torre",
  "✈️ Em rota de cruzeiro",
];

const TOTAL_MS = 3200; // Transição mais rápida (reduzida de 4600ms para 3200ms)
const MSG_INTERVAL = TOTAL_MS / MESSAGES.length;

// Nuvens com posições e velocidades otimizadas para fluir da direita para a esquerda
const CLOUDS = [
  { top: 5, size: 200, opacity: 0.45, duration: 45, delay: -10 },
  { top: 15, size: 300, opacity: 0.35, duration: 35, delay: -5 },
  { top: 30, size: 250, opacity: 0.25, duration: 50, delay: -20 },
  { top: 45, size: 400, opacity: 0.3, duration: 40, delay: -15 },
  { top: 10, size: 150, opacity: 0.5, duration: 25, delay: -2 },
  { top: 60, size: 350, opacity: 0.2, duration: 60, delay: -30 },
];

// --- COMPONENTES AUXILIARES ---

function NoiseOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay">
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full opacity-50"
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}

function Cloud({ top, size, opacity, duration, delay }: (typeof CLOUDS)[0]) {
  return (
    <div
      className="absolute right-0 z-0 pointer-events-none text-zinc-900 dark:text-white"
      style={{
        top: `${top}%`,
        width: size,
        height: size * 0.4,
        background:
          "radial-gradient(ellipse at center, currentColor 0%, transparent 70%)",
        opacity: opacity * 0.5, // Suavizado para funcionar bem tanto no claro quanto no escuro
        filter: "blur(8px)",
        transform: "translateX(100%)",
        animation: `ct-drift ${duration}s linear ${delay}s infinite`,
      }}
    />
  );
}

function PlaneIcon() {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 120 120"
      fill="none"
      className="text-zinc-800 dark:text-zinc-200 drop-shadow-2xl"
    >
      <g style={{ transformOrigin: "center" }}>
        {/* Fuselagem */}
        <path
          d="M100.5 60C100.5 64.1421 82.5 68 60 68C37.5 68 19.5 64.1421 19.5 60C19.5 55.8579 37.5 52 60 52C82.5 52 100.5 55.8579 100.5 60Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Asa Principal */}
        <path
          d="M65 54L35 15C32 10 38 10 42 15L75 54H65Z"
          fill="currentColor"
        />
        <path
          d="M65 66L35 105C32 110 38 110 42 105L75 66H65Z"
          fill="currentColor"
        />
        {/* Asa Traseira */}
        <path
          d="M30 55L15 35C13 32 16 31 18 35L35 55H30Z"
          fill="currentColor"
          opacity="0.8"
        />
        <path
          d="M30 65L15 85C13 88 16 89 18 85L35 65H30Z"
          fill="currentColor"
          opacity="0.8"
        />
        {/* Cockpit Window */}
        <path
          d="M85 60C85 61.5 82 63 78 63C74 63 71 61.5 71 60C71 58.5 74 57 78 57C82 57 85 58.5 85 60Z"
          fill="currentColor"
          opacity="0.2"
        />
      </g>
    </svg>
  );
}

const BARCODE_BARS = Array.from({ length: 32 }).map((_, i) => {
  // deterministic pseudo-random based on index to avoid impure render
  const seed = Math.sin(i * 9301 + 49297) * 233280;
  const r1 = seed - Math.floor(seed);
  const seed2 = Math.sin(i * 4321 + 12345) * 233280;
  const r2 = seed2 - Math.floor(seed2);
  return {
    width: r1 > 0.6 ? "3px" : "1.5px",
    height: `${40 + r2 * 60}%`,
  };
});

function Barcode() {
  const bars = BARCODE_BARS;

  return (
    <div className="flex items-end gap-[3px] h-8 opacity-40">
      {bars.map((bar, i) => (
        <div key={i} className="bg-zinc-900 dark:bg-white" style={bar} />
      ))}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export function ClientTransitionOverlay({
  clientName,
  onComplete,
}: ClientTransitionOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [msgOut, setMsgOut] = useState(false);
  const [visible, setVisible] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // Pequeno delay para garantir que a animação de entrada seja vista
    const showTimer = setTimeout(() => setVisible(true), 50);

    let current = 0;
    const msgInterval = setInterval(() => {
      setMsgOut(true);
      setTimeout(() => {
        current = (current + 1) % MESSAGES.length;
        setMessageIndex(current);
        setMsgOut(false);
      }, 300); // Fade out do texto mais rápido
    }, MSG_INTERVAL);

    const fadeOutTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onCompleteRef.current(), 600); // Fade global mais ágil
    }, TOTAL_MS);

    return () => {
      clearTimeout(showTimer);
      clearInterval(msgInterval);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <NoiseOverlay />

      {/* CÉU GRADIENTE SUAVE - Adaptável ao tema via pseudo-elemento / var CSS local */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% -20%, rgba(150,150,150,0.2) 0%, transparent 80%)",
        }}
      />

      {/* NUVENS ATMOSFÉRICAS */}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}

      {/* CHÃO / PISTA - Adaptável */}
      <div className="absolute bottom-0 z-0 w-full h-[25vh] bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 flex flex-col items-center justify-start overflow-hidden">
        {/* Linha Central da Pista Animada */}
        <div className="w-full h-[2px] mt-6 relative opacity-30">
          <div className="absolute inset-0 w-[200%] animate-runway-lines flex gap-12">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="h-full w-16 bg-black/30 dark:bg-white/30"
              />
            ))}
          </div>
        </div>
      </div>

      {/* AVIÃO ANIMADO - Movimento contínuo e mais rápido */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          bottom: "calc(25vh + 10px)",
          left: "-10%",
          transformOrigin: "center",
          animation: "ct-takeoff 3s ease-in forwards",
        }}
      >
        <PlaneIcon />
      </div>

      {/* TICKET DE EMBARQUE PREMIUM - Tema Adaptável */}
      <div
        className="ct-ticket relative z-20 w-[360px] max-w-[90vw] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-zinc-200 dark:border-zinc-800 -translate-y-8 flex flex-col"
        style={{
          animation: visible
            ? "ct-card-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, ct-float 4s ease-in-out 0.8s infinite alternate"
            : "none",
          opacity: 0,
        }}
      >
        {/* Topo do Ticket */}
        <div className="p-8 pb-6 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            {/* Símbolo decorativo */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="50" cy="50" r="15" fill="currentColor" />
            </svg>
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
              Boarding Pass
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-sm">
              Priority
            </span>
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-1 font-medium">
            Passenger
          </p>
          <h2 className="text-3xl font-black truncate tracking-tighter text-zinc-900 dark:text-white">
            {clientName}
          </h2>

          <div className="mt-6 flex justify-between items-end border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div>
              <p className="text-[8px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Flight
              </p>
              <p className="text-sm font-bold font-mono tracking-wide mt-0.5">
                NX-012
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
                Gate
              </p>
              <p className="text-sm font-bold font-mono tracking-wide mt-0.5 text-right">
                A-42
              </p>
            </div>
          </div>
        </div>

        {/* Linha Picotada */}
        <div className="relative h-4 flex items-center justify-center bg-white dark:bg-zinc-900">
          <div className="absolute left-[-8px] w-4 h-4 bg-zinc-50 dark:bg-zinc-950 rounded-full border-r border-zinc-200 dark:border-zinc-800" />
          <div className="absolute right-[-8px] w-4 h-4 bg-zinc-50 dark:bg-zinc-950 rounded-full border-l border-zinc-200 dark:border-zinc-800" />
          <div className="w-[85%] border-t-[2px] border-dashed border-zinc-300 dark:border-zinc-700" />
        </div>

        {/* Canhoto Inferior */}
        <div className="p-8 pt-6 bg-white dark:bg-zinc-900 flex flex-col items-center justify-between min-h-[120px] rounded-b-2xl">
          <p
            className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400 text-center uppercase"
            style={{
              opacity: msgOut ? 0 : 1,
              transform: msgOut ? "translateY(-4px)" : "translateY(0)",
              transition:
                "opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)",
            }}
          >
            {MESSAGES[messageIndex]}
          </p>

          <div className="w-full mt-4 flex flex-col items-center gap-2">
            <Barcode />
            <p className="text-[8px] font-mono tracking-[0.4em] text-zinc-400 dark:text-zinc-500">
              0010110 0110001
            </p>
          </div>
        </div>
      </div>

      {/* --- ESTILOS INJETADOS (KEYFRAMES) --- */}
      <style>{`
        /* Recorte de ticket suave */
        .ct-ticket {
          border-radius: 1.25rem;
        }

        /* Movimento contínuo das nuvens */
        @keyframes ct-drift {
          from { transform: translateX(100vw); }
          to   { transform: translateX(-100vw); }
        }

        /* Linhas da pista correndo para trás para dar ilusão de velocidade */
        @keyframes runway-lines {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* Animação Física FLUIDA do Avião (Sem "travadinhas") */
        @keyframes ct-takeoff {
          0% { 
            transform: translate3d(-20vw, 0, 0) rotate(0deg); 
          }
          30% { 
            transform: translate3d(25vw, 0, 0) rotate(0deg); /* Corre suavemente sem bobbing */
          }
          100% { 
            transform: translate3d(120vw, -55vh, 0) rotate(-22deg); /* Sobe num único fluxo */
          }
        }

        /* Entrada orgânica do Ticket */
        @keyframes ct-card-enter {
          0% { 
            opacity: 0; 
            transform: translateY(4rem) scale(0.9) rotateX(-10deg); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1) rotateX(0deg); 
          }
        }

        /* Flutuação leve e orgânica após a entrada */
        @keyframes ct-float {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }

        .animate-runway-lines {
          animation: runway-lines 0.4s linear infinite;
        }
      `}</style>
    </div>
  );
}

// === COMPONENTE APP DE DEMONSTRAÇÃO (Apenas para o Preview) ===
export default function App() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Injeta a classe dark no HTML para o Tailwind aplicar os estilos adaptáveis
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          Tema Atual: {isDarkMode ? "🌙 Escuro" : "☀️ Claro"}
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-black mb-4">Dashboard Principal</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Clique no botão abaixo para ver a transição 100% fluida e adaptável.
        </p>
        <button
          onClick={() => setShowOverlay(true)}
          className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          Iniciar Transição
        </button>
      </div>

      {showOverlay && (
        <ClientTransitionOverlay
          clientName="ALEXANDRE SILVA"
          onComplete={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}
