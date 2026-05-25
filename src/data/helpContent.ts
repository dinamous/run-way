import {
  LayoutGrid,
  CalendarRange,
  Users,
  TrendingUp,
  Briefcase,
  Zap,
  Settings,
} from "lucide-react"

export interface FAQItem {
  question: string
  answer: string
}

export interface Section {
  id: string
  label: string
  Icon: React.ElementType
  description: string
  faq?: FAQItem[]
}

export const SECTIONS: Section[] = [
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

export const TIPS: string[] = [
  "Use a barra lateral esquerda para trocar de cliente rapidamente sem perder o contexto.",
  "O botão de recolher (‹) na sidebar libera mais espaço para visualizar calendários e timelines.",
  "Na Timeline, passe o mouse sobre uma subtask para ver detalhes sem precisar abrir a tarefa.",
  "Subtasks com status 'Bloqueado' aparecem em destaque em todas as views — resolva-as primeiro.",
  "No Kanban, arraste o card diretamente entre colunas para atualizar o status da subtask.",
]

export interface Shortcut {
  keys: string[]
  label: string
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["?"], label: "Abrir esta ajuda" },
  { keys: ["Esc"], label: "Fechar modal / cancelar ação" },
]
