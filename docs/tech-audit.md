# Auditoria Técnica — Run/Way

> Análise de oportunidades de melhoria técnica (não funcional). Foco em performance, type safety, segurança, testabilidade e DX.

---

## 1. Estado Global e Data Fetching

### O que está bom
- 4 stores Zustand independentes por responsabilidade (`useUIStore`, `useClientStore`, `useTaskStore`, `useMemberStore`) — sem store monolítico
- AuthContext isolado, sem contaminar stores de dados
- Devtools middleware em todas as stores
- `App.tsx` enxuto (~100 linhas) via `useAppOrchestrator`

### Problema crítico: sem caching estratégico

Em `useSupabase.ts`, o `refresh()` invalida **tudo** e dispara um novo fetch a cada mutação:

```typescript
const refresh = useCallback(async () => {
  useTaskStore.getState().invalidate()
  await useTaskStore.getState().fetchTasks(clientId, isAdmin ?? false)
}, [clientId, isAdmin])
```

Para 200+ tarefas, isso é custoso e desnecessário.

**Solução recomendada — TanStack Query (React Query):**

```bash
npm install @tanstack/react-query
```

```typescript
// Fetch com cache automático
const { data: tasks } = useQuery({
  queryKey: ['tasks', clientId],
  queryFn: () => fetchTasksFromDb(clientId, isAdmin),
  staleTime: 5 * 60 * 1000,   // 5 min antes de revalidar
  gcTime: 30 * 60 * 1000,      // garbage collect após 30 min
})

// Mutation com invalidation seletiva
const { mutate: updateTask } = useMutation({
  mutationFn: (task: Task) => supabase.from('tasks').update(task).eq('id', task.id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', clientId] })
  },
})
```

**Benefícios:** caching inteligente, retry automático, sem refetch desnecessário, devtools próprio.

**Prioridade:** Alta

---

## 2. Type Safety

### Problema: `any` vindo do Supabase

Dados do banco chegam como `any[]`, forçando type assertions manuais por todo o codebase.

**Solução — Codegen de tipos Supabase:**

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
```

Gera automaticamente:

```typescript
export type Database = {
  public: {
    Tables: {
      tasks: { Row: { id: string; title: string; ... } }
      members: { Row: { id: string; name: string; role: 'Designer' | 'Developer'; ... } }
    }
  }
}
```

Uso com o client:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const supabase = createClient<Database>(url, key)
// Agora supabase.from('tasks').select() retorna Task['Row'][] — zero any
```

**Prioridade:** Alta

---

### ~~Problema: Props gigantes em AppLayout~~ ✅ Resolvido

`AppLayoutProps` tinha 28 propriedades. **Corrigido:** criado `LayoutContext` (`src/contexts/LayoutContext.tsx`) com três namespaces (`header`, `sidebar`, `router`). `AppLayout` fornece o Provider; `AppHeader`, `AppSidebar` e `AppRouter` são agora zero-props e consomem via `useLayoutContext()`.

**Prioridade:** ~~Alta~~ Concluído

---

### Problema: sem validação em runtime dos dados do banco

Tipos TypeScript não existem em runtime. Se o schema muda, o código quebra silenciosamente.

**Solução — Zod para validar respostas da API:**

```bash
npm install zod
```

```typescript
// src/lib/validators.ts
const TaskStepSchema = z.object({
  id: z.string().min(1), // .uuid() evitado: Zod v4 rejeita UUIDs fora do strict RFC 4122
  type: z.enum(['design', 'approval', 'dev', 'qa']),
  start_date: z.string().date().nullable(),
  end_date: z.string().date().nullable(),
  step_assignees: z.array(z.object({ member_id: z.string() })).default([]),
})

const DbTaskRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  task_steps: z.array(TaskStepSchema).default([]),
})

// Em useTaskStore.ts
const parsed = DbTaskRowSchema.parse(row) // lança erro com mensagem clara se inválido
```

> **Nota:** campos `id` usam `z.string().min(1)` em vez de `z.string().uuid()`. O Zod v4 endureceu a validação UUID para exigir bits de variante RFC 4122 (`[89abAB]`), rejeitando UUIDs válidos gerados pelo Supabase que não seguem esse padrão estrito.

**Prioridade:** ~~Média~~ Concluído

---

## 3. Performance

### Problema: sem code splitting

Todas as views são importadas no top-level de `AppRouter.tsx`. O bundle inicial carrega 100% do código independente de qual view o usuário acessa.

**Solução — React.lazy + Suspense:**

```typescript
// src/components/AppRouter.tsx
import { lazy, Suspense } from 'react'

const DashboardView = lazy(() => import('@/views/dashboard'))
const MembersView   = lazy(() => import('@/views/MembersView'))
const ReportsView   = lazy(() => import('@/views/reports'))
// ... demais views

function AppRouter({ view, ...props }: AppRouterProps) {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      {view === 'calendar' && <DashboardView subview="calendar" {...props} />}
      {view === 'members'  && <MembersView {...props} />}
      {/* ... */}
    </Suspense>
  )
}
```

**Impacto estimado:** bundle inicial reduz ~40%. Cada view carrega sob demanda.

**Prioridade:** Alta

---

### Problema: listas sem virtualização

`MembersView`, `TasksView` e listas de notificações podem crescer para 200+ itens. Cada item gera um nó DOM, mesmo se fora da viewport.

**Solução — react-window para listas > 50 items:**

```bash
npm install react-window
```

```typescript
import { FixedSizeList as List } from 'react-window'

<List height={600} itemCount={members.length} itemSize={60} width="100%">
  {({ index, style }) => (
    <div style={style}>
      <MemberRow member={members[index]} />
    </div>
  )}
</List>
```

**Impacto:** renderiza apenas ~10-15 itens visíveis por vez, -90% de nós DOM para listas grandes.

**Prioridade:** Média (aplicar quando listas crescerem)

---

### Problema: componentes UI não memoizados

`NotificationBell` e `MemberRow` re-renderizam desnecessariamente quando props de contexto mudam.

**Solução — `memo` com comparação customizada:**

```typescript
const NotificationBell = memo(
  function NotificationBell({ notifications, unreadCount, ...props }: Props) { ... },
  (prev, next) =>
    prev.unreadCount === next.unreadCount &&
    prev.notifications.length === next.notifications.length
)
```

**Prioridade:** Média

---

## 4. Segurança

### CRÍTICO: Service Role Key exposta no cliente

```typescript
// src/lib/supabase.ts
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = serviceRoleKey ? createClient(url, serviceRoleKey) : null
```

A service role bypassa toda RLS. Se a `.env` vazar (bundle público, log, etc.), qualquer pessoa pode deletar ou modificar todos os dados.

**Solução — mover operações admin para um backend:**

```typescript
// ❌ REMOVER do cliente
export const supabaseAdmin = createClient(url, serviceRoleKey)

// ✅ Chamar endpoint autenticado
async function inviteUser(email: string) {
  return fetch('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ email }),
  })
}

// Backend (ex: Supabase Edge Function ou Node.js)
// Apenas aqui a service role fica
```

**Prioridade:** Crítica — resolver antes do próximo deploy

---

### ~~ALTA: sem rate limiting em mutations~~ ✅ Resolvido

`useThrottledMutation` adicionado em `useSupabase.ts`. As três mutations (`createTask`, `updateTask`, `deleteTask`) são envolvidas por throttle de 500ms via `useRef` — sem lodash. Chamadas dentro do intervalo retornam `false` com toast de aviso.

---

### MÉDIA: sem Content Security Policy

Sem CSP, scripts injetados (ex: via XSS ou extensão) podem exfiltrar tokens do Supabase.

**Solução:**

```typescript
// vite.config.ts
server: {
  headers: {
    'Content-Security-Policy':
      "default-src 'self'; connect-src 'self' https://*.supabase.co; script-src 'self'",
  },
}
```

**Prioridade:** Média

---

## 5. Realtime Subscriptions

### ~~Problema: cleanup não robusto~~ ✅ Resolvido

`channelRef` adicionado em `useNotifications.ts` para prevenir múltiplas subscriptions. O channel é nomeado por `userId` (`notifications-realtime:${userId}`), o cleanup usa `unsubscribe()` em vez de `removeChannel()`, e um guard impede que um componente remount crie subscriptions duplicadas.

**Prioridade:** ~~Média~~ Concluído

---

## 6. Testes

### Situação atual

Cobertura estimada: ~5%. Existem testes em `AdminView`, `ProfileView` e algumas rotas de API. Os principais hooks, stores, contexts e utils não têm testes.

### ~~Arquivos sem cobertura (alta criticidade)~~ ✅ Resolvido

Testes unitários adicionados para:

| Arquivo | Cobertura |
|---|---|
| `src/store/useTaskStore.ts` | 3 testes (applyOptimisticUpdate, clearOptimistic) |
| `src/lib/accessControl.ts` | 15 testes (hasRolePermission, canAccessView, resolveAccessRole) |
| `src/utils/dateUtils.ts` | 18 testes (cascadePhases, addBusinessDays, nextBusinessDay, businessDaysBetween) |

Total: **37 novos testes**. Bug corrigido em `addBusinessDays` (`< daysToAdd` → `< daysToAdd - 1`).

**Prioridade:** ~~Alta~~ Concluído

### Setup de cobertura recomendado

```bash
npm install -D @vitest/coverage-v8
```

```json
// package.json
"test:coverage": "vitest run --coverage"
```

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  thresholds: { lines: 60, functions: 60, branches: 50 },
  include: ['src/lib/**', 'src/store/**', 'src/hooks/**'],
}
```

### Exemplo de teste de store

```typescript
// src/store/__tests__/useTaskStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '@/store/useTaskStore'

describe('useTaskStore', () => {
  beforeEach(() => useTaskStore.setState({ tasks: [], loading: false, cacheKey: undefined }))

  it('invalidate reseta o estado', () => {
    useTaskStore.setState({ tasks: [{ id: '1' }] as any, loading: true })
    useTaskStore.getState().invalidate()
    expect(useTaskStore.getState().tasks).toEqual([])
  })
})
```

**Prioridade:** Alta

---

## 7. Developer Experience

### Env vars sem validação no boot

`import.meta.env.VITE_*` são acessados diretamente por todo o código. Se uma var faltar, o erro aparece tarde (runtime, não boot).

**Solução:**

```typescript
// src/lib/env.ts
const required = (key: string): string => {
  const v = import.meta.env[key]
  if (!v) throw new Error(`Env var ${key} não configurada`)
  return v
}

export const config = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
  allowedDomain: required('VITE_ALLOWED_DOMAIN'),
} as const
```

**Prioridade:** Baixa

---

### Sem ADRs (Architecture Decision Records)

Não há registro de por que Zustand, por que roteamento manual, por que sem Next.js.

**Solução — criar `docs/decisions.md`** com entradas como:

```markdown
## ADR-001: Zustand vs Redux

**Status:** Aceito (Abr 2026)
**Decision:** 4 stores Zustand independentes
**Rationale:** minimal boilerplate, bundle 2 KB, devtools built-in, sem Provider
**Consequências:** sem time-travel debug; logging manual necessário
```

**Prioridade:** Baixa

---

## 8. Tabela de Prioridades

| Prioridade | Item | Esforço |
|---|---|---|
| **Crítica** | Remover service role key do cliente | 2h |
| **Alta** | TanStack Query (caching + invalidação seletiva) | 16h |
| **Alta** | Code splitting com React.lazy | 6h |
| **Alta** | Codegen de tipos Supabase (zero `any`) | 4h |
| ~~**Alta**~~ ✅ | ~~Agrupar props AppLayout em Context~~ | ~~4h~~ |
| ~~**Alta**~~ ✅ | ~~Testes unitários de stores e hooks críticos~~ | ~~8h~~ |
| **Média** | Rate limiting em mutations | 2h |
| **Média** | Cleanup robusto de Realtime subscriptions | ~~2h~~ ✅ |
| **Média** | Memoização com `memo` em componentes UI | 4h |
| **Média** | Validação de dados com Zod | 6h |
| **Média** | CSP headers | 1h |
| **Baixa** | Virtual scrolling (listas > 50 items) | 4h |
| **Baixa** | Centralizar env vars em `config` | 1h |
| **Baixa** | ADR documentation | 3h |

**Total:** ~63h ≈ 8 dias de trabalho

---

## 9. O que está bem e deve ser mantido

- Estrutura de views como pastas com co-location (convençã de `views/<nome>/`)
- Zustand com stores separadas por responsabilidade
- `useAppOrchestrator` como ponto único de orquestração
- Domain validation e session expiration em AuthContext
- `getSafeRedirectUrl()` e `toSafeUiErrorMessage()` no fluxo de auth
- RLS policies no Supabase bem-pensadas (sem recursão)
- `cascadePhases` isolado em `dateUtils`
- CLAUDE.md + docs/ detalhados e atualizados
- CI/CD com Gitleaks, CodeQL e block-on-friday
