import { CalendarDays, Users, BarChart2, Building2 } from "lucide-react";
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
    view: "dashboard" as ViewType,
    icon: CalendarDays,
    title: "Calendário",
    description: "Visualize demandas e fases no calendário",
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
    <div className="flex flex-col items-center justify-center min-h-full gap-8 py-12">
      {/* Saudação */}
      <div className="flex flex-col items-center gap-2 text-center">
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
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
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
