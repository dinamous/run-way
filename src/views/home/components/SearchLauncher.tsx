import { useState, useEffect, useRef } from "react";
import { Search, Users, BarChart2, Building2, LayoutDashboard, FileText, Upload, Download, Settings, Zap } from "lucide-react";
import type { ViewType } from "@/store/useUIStore";

interface SearchItem {
  view: ViewType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SEARCH_ITEMS: SearchItem[] = [
  { view: "calendar", label: "Dashboard", description: "Visão geral do projeto", icon: LayoutDashboard },
  { view: "timeline", label: "Linha do Tempo", description: "Timeline das tarefas", icon: FileText },
  { view: "list", label: "Lista de Demandas", description: "Lista completa de demandas", icon: LayoutDashboard },
  { view: "members", label: "Membros", description: "Capacidade e alocação da equipe", icon: Users },
  { view: "reports", label: "Relatórios", description: "Visão geral de relatórios", icon: BarChart2 },
  { view: "reports-fluxo", label: "Relatórios - Fluxo", description: "Métricas de fluxo de trabalho", icon: BarChart2 },
  { view: "reports-timeline", label: "Relatórios - Timeline", description: "Análise temporal", icon: BarChart2 },
  { view: "reports-membros", label: "Relatórios - Membros", description: "Desempenho da equipe", icon: BarChart2 },
  { view: "reports-alertas", label: "Relatórios - Alertas", description: "Alertas e previsões", icon: BarChart2 },
  { view: "clients", label: "Clientes", description: "Gerencie seus clientes e projetos", icon: Building2 },
  { view: "admin", label: "Administração", description: "Configurações e usuários", icon: Settings },
  { view: "tools", label: "Ferramentas", description: "Ferramentas auxiliares", icon: Zap },
  { view: "tools-briefing-analyzer", label: "Briefing Analyzer", description: "Analisador de briefing", icon: FileText },
  { view: "tools-import", label: "Importar", description: "Importar dados", icon: Upload },
  { view: "tools-export", label: "Exportar", description: "Exportar dados", icon: Download },
  { view: "tools-integrations", label: "Integrações", description: "Configurar integrações", icon: Zap },
];

interface SearchLauncherProps {
  onViewChange: (view: ViewType) => void;
}

export function SearchLauncher({ onViewChange }: SearchLauncherProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar página… (/ ou Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.view}>
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                  onMouseDown={() => {
                    setQuery("");
                    setOpen(false);
                    onViewChange(item.view);
                  }}
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
