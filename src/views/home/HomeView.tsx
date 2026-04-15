import { CalendarDays, Users, BarChart2, Building2, LayoutList, FileText, Settings, Zap } from "lucide-react";
import { SearchLauncher } from "./components/SearchLauncher";
import { QuickAccessCard } from "./components/QuickAccessCard";
import type { ViewType } from "@/store/useUIStore";

interface HomeViewProps {
  userName: string;
  clientName?: string;
  hasClient: boolean;
  onViewChange: (view: ViewType) => void;
}

const QUICK_ACCESS = [
  {
    view: "calendar" as ViewType,
    icon: CalendarDays,
    title: "Calendário",
    description: "Visualize demandas e fases no calendário",
    requiresClient: true,
  },
  {
    view: "timeline" as ViewType,
    icon: FileText,
    title: "Linha do Tempo",
    description: "Timeline visual das tarefas",
    requiresClient: true,
  },
  {
    view: "list" as ViewType,
    icon: LayoutList,
    title: "Lista de Demandas",
    description: "Lista completa de demandas",
    requiresClient: true,
  },
  {
    view: "members" as ViewType,
    icon: Users,
    title: "Membros",
    description: "Capacidade e alocação da equipe",
    requiresClient: true,
  },
  {
    view: "reports" as ViewType,
    icon: BarChart2,
    title: "Relatórios",
    description: "Análise de progresso e entregas",
    requiresClient: true,
  },
  {
    view: "clients" as ViewType,
    icon: Building2,
    title: "Clientes",
    description: "Gerencie seus clientes e projetos",
    requiresClient: false,
  },
  {
    view: "tools" as ViewType,
    icon: Zap,
    title: "Ferramentas",
    description: "Briefing analyzer e importações",
    requiresClient: false,
  },
  {
    view: "admin" as ViewType,
    icon: Settings,
    title: "Administração",
    description: "Configurações e usuários",
    requiresClient: false,
  },
];

function formatDate(): { day: string; weekday: string; month: string } {
  const now = new Date();
  const day = now.getDate().toString();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const month = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { day, weekday, month };
}

export function HomeView({ userName, clientName, hasClient, onViewChange }: HomeViewProps) {
  const { day, weekday, month } = formatDate();
  const firstName = userName.split(" ")[0];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full gap-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-950" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #71717a 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Olá, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Hoje é {day} ({weekday}) de {month}
        </p>
        {clientName && (
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            {clientName}
          </span>
        )}
      </div>

      {/* SearchLauncher */}
      <SearchLauncher onViewChange={onViewChange} />

      {/* QuickAccess */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {QUICK_ACCESS.map((item) => (
          <QuickAccessCard
            key={item.view}
            icon={item.icon}
            title={item.title}
            description={item.description}
            disabled={item.requiresClient && !hasClient}
            onClick={() => onViewChange(item.view)}
          />
        ))}
      </div>
    </div>
  );
}
