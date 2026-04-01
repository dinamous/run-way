# Arquitetura — Capacity Dashboard

## Estrutura do Projeto

```
src/
├── App.tsx                    # Root: providers, estado global, header, roteamento
├── main.tsx                   # Entry point
├── pages/
│   └── LoginPage.tsx          # Página de login (Supabase Auth)
├── components/
│   ├── TaskModal.tsx          # Modal criar/editar demanda
│   └── ui/                    # Design system (Button, Input, Label, Badge)
├── views/
│   ├── DashboardView.tsx      # Header + filtros + toggle Calendar/Timeline
│   ├── CalendarView.tsx       # Calendário mensal com drag-drop
│   ├── TimelineView.tsx       # Gantt com drag-drop por fase
│   ├── dashboardUtils.ts     # Constantes, helpers, tipos partilhados
│   ├── MembersView.tsx        # Capacidade por membro
│   └── ReportsView.tsx        # Relatórios
├── hooks/
│   ├── useSupabase.ts         # CRUD tarefas via Supabase
│   ├── useAuth.ts             # Autenticação Supabase
│   └── useFormState.ts        # Estado do formulário TaskModal
├── lib/
│   ├── supabase.ts            # Cliente Supabase
│   ├── steps.ts               # Definição e lógica de steps
│   └── utils.ts               # Utilitários gerais
├── types/
│   ├── index.ts               # Barrel export
│   ├── task.ts                # Tipo Task
│   ├── member.ts              # Tipo Member
│   ├── props.ts               # Props de componentes
│   └── db.ts                  # Tipos Supabase/DB
├── utils/
│   └── dateUtils.ts           # Dias úteis, cascata de fases
└── data/
    └── mock.ts                # Dados mock
```

## Fluxo de Dados

```
Supabase Auth (useAuth)
    ↓ sessão válida
App.tsx (estado global: tasks, members, view)
    ├── useSupabase() → CRUD tasks ↔ Supabase DB
    ├── DashboardView → Calendar/Timeline (drag-drop → onUpdateTask)
    ├── MembersView → visualização de capacidade
    ├── ReportsView → relatórios
    └── TaskModal → criar/editar (useFormState → cascata de fases)
```

## Persistência
- **Primária:** Supabase (PostgreSQL) — fonte de verdade
- **Auth:** Supabase Auth — sessão gerida pelo SDK

## Decisões
- Sem router — navegação via `useState` (poucas views)
- Sem state manager externo — volume não justifica
- `any` intencional em dados do DB sem schema fixo em runtime
