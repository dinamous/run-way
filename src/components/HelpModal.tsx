import { useState, useEffect, useRef } from "react"
import { ChevronDown, BookOpen, Lightbulb, Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui"
import { cn } from "@/lib/utils"
import { SECTIONS, TIPS, SHORTCUTS } from "@/data/helpContent"
import type { FAQItem, Section } from "@/data/helpContent"

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

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
