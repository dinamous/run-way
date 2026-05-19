import { useState, useEffect, useRef } from "react"
import {
  LayoutGrid,
  CalendarRange,
  Users,
  TrendingUp,
  Briefcase,
  Zap,
  Settings,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Keyboard,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui"
import { cn } from "@/lib/utils"

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

interface FAQItem {
  question: string
  answer: string
}

interface Section {
  id: string
  label: string
  Icon: React.ElementType
  description: string
  faq?: FAQItem[]
}

const SECTIONS: Section[] = [
  {
    id: "overview",
    label: "Visão Geral",
    Icon: LayoutGrid,
    description:
      "A Visão Geral do cliente mostra o resumo do workspace: tarefas ativas, membros alocados, KPIs de capacidade e uma inbox de pendências. É o ponto de partida para entender o estado atual de um cliente.",
    faq: [
      {
        question: "O que é a Inbox?",
        answer:
          "A Inbox lista tarefas que precisam de atenção: sem datas definidas, sem responsáveis ou com subtasks atrasadas.",
      },
      {
        question: "O que significa 'tarefa bloqueada'?",
        answer:
          "Uma tarefa bloqueada está impedida de avançar por algum motivo externo. Ela aparece destacada e não entra no cálculo de capacidade normal.",
      },
    ],
  },
  {
    id: "planning",
    label: "Planejamento",
    Icon: CalendarRange,
    description:
      "O módulo de Planejamento reúne quatro visualizações da mesma lista de tarefas: Demandas (lista), Kanban, Calendário e Timeline. Todas compartilham os mesmos dados — mude a view conforme o que precisar analisar.",
    faq: [
      {
        question: "Qual a diferença entre Calendário e Timeline?",
        answer:
          "O Calendário mostra os eventos por dia/mês. A Timeline exibe um Gantt horizontal com as subtasks de cada tarefa lado a lado, útil para detectar sobreposições.",
      },
      {
        question: "Como criar uma tarefa?",
        answer:
          'Clique no botão "Nova tarefa" no canto superior direito de qualquer view de Planejamento. Preencha o título, adicione subtasks com datas e responsáveis e salve.',
      },
      {
        question: "O que são subtasks?",
        answer:
          "Subtasks são as fases de entrega de uma tarefa (ex: Design, Desenvolvimento, Homologação). Cada uma tem datas, responsáveis e um status que controla a cor na UI.",
      },
      {
        question: "Posso arrastar tarefas no Calendário?",
        answer:
          "Sim. Arraste um evento para mover a subtask para outra data. O sistema recalcula as datas em cascata automaticamente.",
      },
    ],
  },
  {
    id: "members",
    label: "Membros",
    Icon: Users,
    description:
      "A view de Membros mostra a capacidade de cada pessoa da equipe: quantas subtasks estão alocadas, em quais tarefas e se estão sobrecarregados. Use para balancear entregas antes de criar novas tarefas.",
    faq: [
      {
        question: "O que significa o indicador de sobrecarga?",
        answer:
          "Quando um membro tem mais tarefas simultâneas do que o limite configurado em Perfil → Notificações, ele aparece com alerta de sobrecarga.",
      },
    ],
  },
  {
    id: "reports",
    label: "Relatórios",
    Icon: TrendingUp,
    description:
      "Relatórios oferecem quatro perspectivas analíticas: Geral (resumo de entregas), Fluxo (velocidade de conclusão), Timeline (distribuição no tempo), Membros (produtividade individual) e Alertas (anomalias detectadas).",
    faq: [
      {
        question: "Os dados são em tempo real?",
        answer:
          "Sim, os relatórios refletem o estado atual das tarefas no banco de dados. Atualize a página para ver as últimas mudanças.",
      },
    ],
  },
  {
    id: "clients",
    label: "Clientes",
    Icon: Briefcase,
    description:
      "A área de Clientes lista todos os workspaces cadastrados. Cada cliente tem seu próprio conjunto de tarefas, membros e configurações. Selecione um cliente na barra lateral esquerda para entrar no workspace dele.",
    faq: [
      {
        question: "Como adicionar um novo cliente?",
        answer:
          'Clique no ícone "+" na barra lateral esquerda (visível apenas para admins) ou acesse Operações → Clientes e use o botão de criação.',
      },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    Icon: Zap,
    description:
      "Ferramentas agrupa utilitários operacionais: Analisador de Briefing (checklists automatizados por tipo de projeto), Importação e Exportação de dados, e Integrações com serviços externos.",
    faq: [
      {
        question: "O que é o Analisador de Briefing?",
        answer:
          "É uma ferramenta que gera um checklist customizado de perguntas para um briefing, com base no tipo de projeto (web, UI/UX, mídias, audiovisual ou financeiro).",
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    Icon: Settings,
    description:
      "A área Admin (visível apenas para administradores) permite gerenciar usuários, permissões de acesso e configurações globais da plataforma.",
    faq: [
      {
        question: "Quem pode acessar o Admin?",
        answer:
          "Apenas usuários com função 'admin'. Membros com função 'user' não veem essa opção na sidebar.",
      },
    ],
  },
]

const TIPS = [
  "Use a barra lateral esquerda para trocar de cliente rapidamente sem perder o contexto.",
  "O botão de recolher (‹) na sidebar libera mais espaço para visualizar calendários e timelines.",
  "Na Timeline, passe o mouse sobre uma subtask para ver detalhes sem precisar abrir a tarefa.",
  "Subtasks com status 'Bloqueado' aparecem em destaque em todas as views — resolva-as primeiro.",
  "No Kanban, arraste o card diretamente entre colunas para atualizar o status da subtask.",
]

const SHORTCUTS = [
  { keys: ["?"], label: "Abrir esta ajuda" },
  { keys: ["Esc"], label: "Fechar modal / cancelar ação" },
]

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return reduced
}

function AccordionItem({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (reducedMotion) return

    if (open) {
      el.style.display = "block"
      const fullHeight = el.scrollHeight
      el.animate(
        [
          { height: "0px", opacity: "0" },
          { height: `${fullHeight}px`, opacity: "1" },
        ],
        { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
      )
    } else {
      const fullHeight = el.scrollHeight
      const anim = el.animate(
        [
          { height: `${fullHeight}px`, opacity: "1" },
          { height: "0px", opacity: "0" },
        ],
        { duration: 180, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" }
      )
      anim.onfinish = () => {
        el.style.display = "none"
      }
    }
  }, [open, reducedMotion])

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5 text-left transition-colors group"
      >
        <span className="text-[0.9375rem] text-foreground/85 group-hover:text-foreground transition-colors leading-snug pr-4">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        ref={contentRef}
        style={reducedMotion ? undefined : { display: open ? "block" : "none", overflow: "hidden" }}
      >
        <p className="pb-4 text-[0.9375rem] text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </div>
      {reducedMotion && open && (
        <p className="pb-4 text-[0.9375rem] text-muted-foreground leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  )
}

function ContentPanel({ sectionId, section }: { sectionId: string; section: Section | undefined }) {
  const reducedMotion = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const prevIdRef = useRef(sectionId)

  useEffect(() => {
    if (reducedMotion) return
    if (prevIdRef.current === sectionId) return
    prevIdRef.current = sectionId

    const el = panelRef.current
    if (!el) return
    el.animate(
      [
        { opacity: "0", transform: "translateY(6px)" },
        { opacity: "1", transform: "translateY(0)" },
      ],
      { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
    )
  }, [sectionId, reducedMotion])

  return (
    <div ref={panelRef} className="flex-1 overflow-y-auto px-8 py-7">
      {sectionId === "tips" ? (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-5 h-5 text-foreground/60" />
            <h2 className="text-lg font-semibold tracking-tight">Dicas de uso</h2>
          </div>
          <ul className="flex flex-col gap-5">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex gap-4 leading-relaxed">
                <span className="shrink-0 w-6 h-6 rounded-full bg-foreground/[0.07] text-foreground/50 flex items-center justify-center text-xs font-semibold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[0.9375rem] text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : sectionId === "shortcuts" ? (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Keyboard className="w-5 h-5 text-foreground/60" />
            <h2 className="text-lg font-semibold tracking-tight">Atalhos de teclado</h2>
          </div>
          <table className="w-full">
            <tbody>
              {SHORTCUTS.map((s, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="py-4 pr-8">
                    <div className="flex gap-1.5">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 rounded-md text-xs font-mono bg-foreground/[0.06] border border-border text-foreground/70"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 text-[0.9375rem] text-muted-foreground">{s.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : section ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <section.Icon className="w-5 h-5 text-foreground/60" />
            <h2 className="text-lg font-semibold tracking-tight">{section.label}</h2>
          </div>

          <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-8 max-w-[62ch]">
            {section.description}
          </p>

          {section.faq && section.faq.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-muted-foreground/50" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Perguntas frequentes
                </span>
              </div>
              <div className="rounded-xl border border-border/50 px-5 divide-y-0">
                {section.faq.map((item, i) => (
                  <AccordionItem key={i} {...item} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<string>("overview")
  const section = SECTIONS.find((s) => s.id === activeSection)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full h-[82vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-8 py-5 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-semibold">
            Central de Ajuda — Run/Way
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Guia rápido para entender e usar a plataforma.
          </p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav className="w-52 shrink-0 border-r border-border/60 flex flex-col py-4 gap-px overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-[0.875rem] text-left transition-colors duration-150",
                  activeSection === s.id
                    ? "bg-foreground/[0.07] text-foreground font-medium"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                <s.Icon className="w-4 h-4 shrink-0 opacity-70" />
                {s.label}
              </button>
            ))}

            <div className="h-px bg-border/50 mx-4 my-2" />

            <button
              onClick={() => setActiveSection("tips")}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-[0.875rem] text-left transition-colors duration-150",
                activeSection === "tips"
                  ? "bg-foreground/[0.07] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              <Lightbulb className="w-4 h-4 shrink-0 opacity-70" />
              Dicas
            </button>

            <button
              onClick={() => setActiveSection("shortcuts")}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-[0.875rem] text-left transition-colors duration-150",
                activeSection === "shortcuts"
                  ? "bg-foreground/[0.07] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              <Keyboard className="w-4 h-4 shrink-0 opacity-70" />
              Atalhos
            </button>
          </nav>

          {/* Content */}
          <ContentPanel sectionId={activeSection} section={section} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
