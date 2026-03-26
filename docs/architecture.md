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
    │   ├── Props: tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, isConnected
    │   ├── CalendarView (padrão)
    │   │   ├── Navegação de mês
    │   │   ├── Grid semanas × dias
    │   │   ├── Barras de fases com drag-and-drop
    │   │   └── Handles de resize nas extremidades
    │   └── TimelineView
    │       ├── Range configurável: 14 / 30 / 60 / 90 dias (padrão 60)
    │       ├── Colunas de largura fixa (36 px/dia) com scroll horizontal
    │       ├── Layout em degraus — cada fase numa sub-linha própria
    │       ├── Drag-and-drop e resize por fase (igual ao CalendarView)
    │       └── Botões editar/apagar por tarefa (aparecem no hover)
    │
    ├── MembersView
    │   └── Props: tasks, members
    │
    └── TaskModal (condicional)
        ├── Props: task?, members, onClose, onSave, onDelete?
        ├── Formulário com validação
        ├── Cascata automática de datas
        └── Botão "Apagar" (visível apenas ao editar)
```

## Persistência de Dados

```
React State (memória)
      ↕  (a cada handleSave)
localStorage → 'capacity-tasks'
      ↕  (ao conectar ao Drive)
useGoogleDrive hook
      ↕  (Google Drive API v3)
capacity-tasks.json
  no Google Drive do utilizador
  em: Projeto web/dados/
```

As tasks são guardadas em `localStorage` a cada alteração, garantindo que os dados persistem entre recargas mesmo sem autenticação. Ao conectar ao Drive, os dados remotos substituem o estado local (Drive é a fonte de verdade). O token OAuth continua apenas em memória (não persiste em localStorage).

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
- **Token OAuth em memória:** decisão de segurança — não persiste em localStorage; as tasks sim (ver Persistência acima)
- **`any` intencional:** `tasks` e `editingTask` são `any` porque o schema vem do Drive sem validação de tipos em runtime
