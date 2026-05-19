# TODO: OverviewView — Dashboard Pessoal do Usuário

## Contexto

Substituir a `OnboardingView` como tela inicial padrão por um dashboard pessoal com dados reais do Supabase. A `OnboardingView` original (tela de espera sem member cadastrado) continua existindo como caso separado.

**Branch:** `feature/melhorias-tecnicas`

---

## Fluxo de Navegação (App.tsx)

```
Login
  └── member cadastrado?
        ├── NÃO → OnboardingView (aguardando cadastro — INALTERADO)
        └── SIM → OverviewView (nova home padrão)
                    └── usuário navega → PlanningView / outras views
```

---

## Estrutura de Arquivos a Criar

```
src/views/overview/
  ├── index.ts
  ├── OverviewView.tsx
  ├── hooks/
  │   └── useOverviewData.ts
  └── components/
      ├── WelcomeCard.tsx
      ├── PriorityList.tsx
      ├── ActiveClients.tsx
      └── InboxCard.tsx
```

---

## Steps de Implementação

### Step 1 — Hook `useOverviewData`
**Arquivo:** `src/views/overview/hooks/useOverviewData.ts`

Responsável por buscar todos os dados em paralelo via `Promise.all`.

**Dados buscados:**

1. **member do usuário logado** — vem do `AuthContext` (já disponível, não precisa fetch)

2. **subtasks do assignee** — query em `subtask_assignees` join `task_subtasks` join `tasks`:
   ```sql
   subtask_assignees
     .eq('member_id', memberId)
     → join task_subtasks (id, title, status, start, end, task_id)
     → join tasks (id, title, concludedAt, client_id)
     → join clients (id, name)
   ```
   Campos necessários: `subtask_id, subtask.title, subtask.status, subtask.start, subtask.end, task.concludedAt, task.id, task.title, client.id, client.name`

3. **notificações** — chamar `fetchNotifications(userId, clientIds)` já existente em `src/lib/notifications.ts`. Filtrar as não lidas (`read = false`) no client.

4. **clientes com contagem de tasks ativas**:
   - Admin: todos os clientes da tabela `clients`
   - User: clientes via `user_clients` JOIN `clients`
   - Para cada cliente: count de tasks onde `client_id = X AND concluded_at IS NULL`

**Interface de retorno:**
```ts
interface OverviewData {
  kpis: {
    open: number        // task.concludedAt IS NULL
    late: number        // subtask.end < hoje AND task.concludedAt IS NULL
    today: number       // subtask.end = hoje AND task.concludedAt IS NULL
    concluded: number   // task.concludedAt IS NOT NULL
  }
  subtasks: SubtaskRow[]   // ordenadas por end ASC
  notifications: Notification[]  // todas (filtrar não lidas no componente)
  clients: ClientSummary[]
  loading: boolean
  error: string | null
}

interface SubtaskRow {
  id: string
  title: string
  status: string
  start: string
  end: string
  taskId: string
  taskTitle: string
  clientId: string
  clientName: string
  taskConcludedAt: string | null
}

interface ClientSummary {
  id: string
  name: string
  activeTaskCount: number
}
```

---

### Step 2 — `WelcomeCard.tsx`
**Arquivo:** `src/views/overview/components/WelcomeCard.tsx`

**Props:** `userName: string`, `kpis: OverviewData['kpis']`, `loading: boolean`

**Comportamento:**
- Saudação dinâmica:
  - 05h–11h59 → "Bom dia"
  - 12h–17h59 → "Boa tarde"
  - 18h–04h59 → "Boa noite"
- Frase contextual baseada nos KPIs:
  - `late > 0 && today > 0` → "Você tem {today} para hoje e {late} atrasadas. Vamos focar?"
  - `late > 0` → "Você tem {late} subtarefas atrasadas. Atenção!"
  - `today > 0` → "Você tem {today} subtarefas para entregar hoje."
  - caso contrário → "Tudo em dia por enquanto. Bom trabalho!"
- Grid 2×2 com os 4 KPIs usando ícones Lucide
- Loading state: skeleton nos KPI cards
- Empty state: frase neutra se nenhuma subtask

---

### Step 3 — `PriorityList.tsx`
**Arquivo:** `src/views/overview/components/PriorityList.tsx`

**Props:** `subtasks: SubtaskRow[]`, `loading: boolean`

**Comportamento:**
- Exibe subtasks com `task.concludedAt IS NULL` ordenadas por `end ASC`
- Mostra 15 por vez; botão "Ver mais" carrega +15
- Colunas: sigla do cliente (2 letras), task pai, título da subtask, status badge, prazo
- Cálculo do prazo:
  - `end < hoje` → "Atrasada Xd" (vermelho)
  - `end = hoje` → "Hoje" (âmbar)
  - `end > hoje` → "Em X dias" (zinc)
- Null state: skeleton de 5 linhas enquanto `loading`
- Empty state: ícone `CheckCircle2` + "Nenhuma subtarefa atribuída a você"

---

### Step 4 — `ActiveClients.tsx`
**Arquivo:** `src/views/overview/components/ActiveClients.tsx`

**Props:** `clients: ClientSummary[]`, `loading: boolean`, `onSelectClient: (clientId: string) => void`

**Comportamento:**
- Grid 2×2 de cards (máximo 4 visíveis inicialmente)
- Card: sigla (2 letras, cor gerada por hash do nome), nome completo, "X tarefas ativas"
- Clique → `onSelectClient(clientId)` → navega para PlanningView com cliente selecionado
- Loading: skeleton 4 cards
- Empty state: "Nenhum cliente atribuído"

**Geração de cor por hash:** mapear `clientName.charCodeAt(0) % 6` para uma das 6 cores Tailwind pré-definidas (evita hardcode).

---

### Step 5 — `InboxCard.tsx`
**Arquivo:** `src/views/overview/components/InboxCard.tsx`

**Props:** `notifications: Notification[]`, `loading: boolean`, `onMarkAsRead: (id: string) => void`

**Comportamento:**
- Filtrar `read = false` do array recebido
- Mostrar as 5 mais recentes (ordenar por `created_at DESC`)
- Badge com contagem de não lidas no header
- Ícone por tipo de notificação (`NotificationType`):
  - `step_assigned` / `task_assigned` → `UserCheck`
  - `step_unassigned` → `UserMinus`
  - `role_changed` → `Shield`
  - `client_access_granted` / `client_access_revoked` → `Building2`
  - `admin_broadcast` → `Megaphone`
  - `new_member` → `UserPlus`
  - fallback → `Bell`
- Timestamp relativo: "agora", "há Xmin", "há Xh", "ontem", data curta
- Clicar na notificação → `onMarkAsRead(id)`
- Loading: skeleton 3 itens
- Empty state: ícone `CheckCircle2` + "Tudo em dia 🎉"

---

### Step 6 — `OverviewView.tsx` + `index.ts`
**Arquivo:** `src/views/overview/OverviewView.tsx`

**Props:**
```ts
interface OverviewViewProps {
  userName: string
  userId: string
  memberId: string
  isAdmin: boolean
  clients: ClientOption[]          // do AuthContext
  notifications: Notification[]    // do useNotifications (já existe no App)
  notificationsLoading: boolean
  onMarkNotificationAsRead: (id: string) => void
  onSelectClient: (clientId: string) => void
}
```

**Layout bento (3 cols, desktop):**
```
┌─────────────────────────┬──────────────┐
│  WelcomeCard (2 cols)   │  InboxCard   │
│  KPIs inline            │  (1 col)     │
├─────────────────────────┤──────────────┤
│  PriorityList           │ActiveClients │
│  (2 cols × 2 rows)      │  (1 col)     │
└─────────────────────────┴──────────────┘
```

Mobile: stacking vertical (1 col).

**Estilo:** usar variáveis CSS do sistema (`bg-background`, `bg-card`, `border-border`, etc.). Sem cores hardcoded.

---

### Step 7 — Integração no `App.tsx`

**Mudança:** onde hoje está:
```ts
if (!app.hasClients) {
  return <OnboardingView ... />
}
```

Adicionar antes desse bloco:
```ts
// member existe mas sem clientes ainda → OnboardingView (inalterado)
// member existe com clientes → OverviewView como home padrão
```

**Nova lógica:**
- `!app.auth.member` → `OnboardingView` (aguardando cadastro)
- `app.auth.member` → renderiza dentro do `AppLayout` com `OverviewView` como view default (`view === 'home'` ou `view === 'overview'`)

**`ViewType` a adicionar em `useUIStore.ts`:** `'overview'` (se necessário — avaliar se reutiliza `'home'`).

---

### Step 8 — Integração no `AppRouter.tsx`

Adicionar lazy import e rota para `OverviewView`:
```ts
const OverviewView = lazy(() => import("@/views/overview").then(m => ({ default: m.OverviewView })));
```

Adicionar case no switch:
```tsx
{view === "overview" && (
  <OverviewView ... />
)}
```

Avaliar se `view === "home"` deve agora renderizar `OverviewView` em vez de `HomeView`.

---

### Step 9 — Atualizar Docs

- [x] `docs/architecture.md` — adicionado `overview/` na árvore de views e no fluxo de dados; nota sobre extensão do `RouterCtx`
- [x] `docs/decisions.md` — ADR-022: transformação da home para dashboard pessoal
- [x] `CLAUDE.md` — adicionada entrada para `docs/views/overview.md` na tabela de docs
- [x] `docs/views/overview.md` — criado (novo)

---

## Decisões Técnicas

| Decisão | Escolha | Racional |
|---|---|---|
| Notificações | Receber via prop do App (já existe `useNotifications` no orquestrador) | Evitar segundo fetch; reutilizar realtime já subscrito |
| Dados de subtasks | Fetch próprio em `useOverviewData` | Não existe hook global para subtasks do assignee |
| Clientes | Receber via `AuthContext.clients` + fetch de contagem | `clients` já está no contexto; só a contagem precisa de fetch |
| Cores de clientes | Hash do nome → 6 cores fixas Tailwind | Consistência sem armazenar cor no banco |
| Paginação | Carregar tudo, exibir 15, "Ver mais" +15 | Conjunto pequeno; evita complexidade de cursor |
| View type | Avaliar reutilizar `'home'` ou criar `'overview'` | Decidir durante implementação se `HomeView` atual é substituída ou coexiste |

---

## Testes Unitários Necessários

- `useOverviewData` — mock Supabase, verificar cálculo dos KPIs
- Função de prazo (atrasada/hoje/em X dias) — testar edge cases
- Função de saudação por horário — mock `Date`
- Função de geração de cor por hash — verificar distribuição

**Comando:** `npm run test:run`
