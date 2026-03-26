# Arquitetura — Capacity Dashboard

## Fluxo de Dados

```
GoogleOAuthProvider (App.tsx)
└── AppInner
    ├── Estado Global
    │   ├── tasks: Task[]
    │   ├── members: Member[]
    │   ├── view: 'dashboard' | 'members'
    │   ├── isModalOpen: boolean
    │   └── editingTask: Task | null
    │
    ├── useGoogleDrive()
    │   ├── token, syncStatus
    │   ├── login(accessToken)
    │   ├── load(accessToken) → Task[]
    │   └── save(data) → void
    │
    ├── Header (inline em App.tsx)
    │   ├── Botão "Conectar Drive" → googleLogin()
    │   ├── Indicador de sync (syncing/success/error)
    │   └── Toggle Calendário / Membros
    │
    ├── DashboardView
    │   ├── Props: tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport
    │   ├── CalendarView (padrão)
    │   │   ├── Navegação de mês
    │   │   ├── Grid semanas × dias
    │   │   ├── Barras de fases com drag-and-drop
    │   │   └── Handles de resize nas extremidades
    │   └── TimelineView
    │       ├── 60 dias a partir de hoje
    │       ├── Coluna esquerda: detalhes da tarefa
    │       └── Barras estáticas de fases
    │
    ├── MembersView
    │   └── Props: tasks, members
    │
    └── TaskModal (condicional)
        ├── Props: task?, members, onClose, onSave
        ├── Formulário com validação
        └── Cascata automática de datas
```

## Persistência de Dados

```
React State (memória)
      ↕  (ao guardar/carregar)
useGoogleDrive hook
      ↕  (Google Drive API v3)
capacity-tasks.json
  no Google Drive do utilizador
  em: Projeto web/dados/
```

Os dados **não são** persistidos em localStorage ou cookies. Ao recarregar a página sem estar autenticado, o estado fica vazio.

## Componentes e Responsabilidades

| Componente | Responsabilidade |
|---|---|
| `App.tsx` | Provider OAuth, estado global, orchestração CRUD, header |
| `DashboardView.tsx` | Renderização calendário e timeline, drag-drop, layout de slots |
| `MembersView.tsx` | Cálculo e exibição de capacidade por membro |
| `TaskModal.tsx` | Formulário CRUD com cascata de fases |
| `useGoogleDrive.ts` | Toda a comunicação com Google Drive API |
| `dateUtils.ts` | Cálculos de dias úteis, cascata de fases |
| `ui/*` | Componentes visuais reutilizáveis (sem lógica de negócio) |

## Decisões de Arquitetura

- **Sem router:** a navegação entre views é feita com um `useState` simples, pois há apenas 2 views
- **Sem state manager externo:** volume de estado não justifica Redux/Zustand
- **Token OAuth em memória:** decisão de segurança — não persiste em localStorage
- **`any` intencional:** `tasks` e `editingTask` são `any` porque o schema vem do Drive sem validação de tipos em runtime
