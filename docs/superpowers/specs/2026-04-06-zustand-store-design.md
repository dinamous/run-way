# Spec: Zustand Store — Persistência de Dados e Filtro por Cliente

**Data:** 2026-04-06  
**Status:** Aprovado  
**Contexto:** React + Vite (curto prazo) → Next.js App Router (próxima sessão)

---

## Problema

A aplicação tem três problemas de persistência interligados:

1. **Vazamento entre clientes (c):** Tasks, members e outros dados de um cliente aparecem quando outro cliente está selecionado. Raiz: `useSupabase` fetcha imediatamente, antes de `selectedClientId` estar resolvido.
2. **Re-fetch desnecessário ao trocar de view (d):** Cada troca de view causa re-render em `App.tsx` sem cache, disparando novos fetches de dados que não mudaram.
3. **Race condition no update otimista (e):** `updateTask` aplica estado localmente e pode ser revertido por um `fetchTasks()` concorrente.
4. **Ordem de inicialização incorreta:** `clientId = undefined` chega ao Supabase antes de `useUserClients` retornar, causando queries sem filtro.

---

## Solução: Zustand Store com Guard de Inicialização

### Arquitetura

```
src/store/
└── appStore.ts        # Store única com dois slices
```

### `clientSlice`

```ts
interface ClientSlice {
  selectedClientId: string | null | undefined   // undefined = não inicializado
  effectiveClientId: string | null              // getter derivado
  setSelectedClientId: (id: string | null | undefined) => void
}
```

- `setSelectedClientId` invalida o cache de dados ao mudar o cliente
- `effectiveClientId` encapsula a lógica que hoje existe em `App.tsx`:
  - `undefined` → usa primeiro cliente disponível (resolvido externamente)
  - `null` → admin vê tudo (sem filtro)
  - `string` → cliente específico

### `dataSlice`

```ts
interface DataSlice {
  tasks: Task[]
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined     // qual cliente está em cache

  fetchData: (clientId: string | null | undefined, isAdmin: boolean) => Promise<void>
  hydrate: (tasks: Task[], members: Member[]) => void   // para Next.js Server Components
  invalidate: () => void
}
```

**Guard de inicialização:** `fetchData` retorna imediatamente se `clientId === undefined`. Só fetcha quando o clientId está resolvido.

**Cache hit:** Se `clientId === cachedClientId` e `tasks.length > 0`, `fetchData` não re-fetcha. Cache é invalidado explicitamente via `invalidate()`.

### Fluxo de inicialização corrigido

```
1. AuthContext resolve sessão → member, isAdmin, clients
2. App.tsx monta → store: selectedClientId = undefined → nenhum fetch
3. useUserClients() retorna clientes
4. App.tsx chama setSelectedClientId(userClients[0].id)
5. store.invalidate() → tasks=[], members=[], cachedClientId=undefined
6. fetchData(clientId, isAdmin) → queries Supabase com filtro correto
7. store.tasks e store.members populados → views renderizam dados corretos
```

### Troca de cliente

```
setSelectedClientId(novoId)
  → invalidate()        # limpa dados imediatamente (zero vazamento)
  → fetchData(novoId)   # fetcha com novo clientId
```

### Mutations

`createTask`, `updateTask`, `deleteTask` permanecem como funções (não estado). Após sucesso, chamam `store.invalidate()` + `store.fetchData()` em vez de `fetchTasks()` local.

`updateTask` mantém o update otimista local, mas a reversão usa `store.tasks` (snapshot da store) — eliminando race condition com fetch concorrente.

---

## Integração com App.tsx

### Antes

```ts
// App.tsx
const { tasks, members, loading, createTask, updateTask, deleteTask } = useSupabase({...})
const [selectedClientId, setSelectedClientId] = useState(...)
```

### Depois

```ts
// App.tsx
const { tasks, members, loading, fetchData, invalidate } = useAppStore()
const { selectedClientId, setSelectedClientId, effectiveClientId } = useAppStore()
// mutations vêm de funções separadas (não da store)
```

Props drilling de `tasks` e `members` para views é eliminado — views leem da store diretamente com `useAppStore()`.

---

## useSupabase refatorado

O hook `useSupabase` vira um serviço de mutations sem estado próprio:

```ts
// src/hooks/useSupabase.ts — apenas mutations
export function useSupabase(options: UseSupabaseOptions) {
  // sem useState de tasks/members/loading
  // retorna apenas: createTask, updateTask, deleteTask
  // após cada mutação: store.invalidate() + store.fetchData()
}
```

Os fetchers (`fetchTasks`, `fetchMembers`) e mappers (`dbRowToTask`) movem para `src/store/appStore.ts` ou um módulo auxiliar `src/lib/fetchers.ts`.

---

## Portabilidade para Next.js App Router

### Estratégia de migração

A store **não é removida** na migração — ela reduz de responsabilidade:

| Responsabilidade | React+Vite | Next.js |
|---|---|---|
| Fonte de verdade de tasks/members | Store (fetch client-side) | Server Components (fetch server-side) |
| Estado de UI (cliente selecionado, filtros) | Store | Store (mantida) |
| Hidratação inicial | `fetchData()` | `hydrate(tasks, members)` via props de Server Component |

### `hydrate(tasks, members)`

Método adicionado desde o início na store. Hoje chamado internamente pelo `fetchData`. Na migração Next.js, chamado pelo Client Component raiz recebendo props do Server Component:

```tsx
// Next.js — layout ou page Server Component
const tasks = await supabase.from('tasks').select(...)  // server-side, com cookies
const members = await supabase.from('members').select(...)

// passa para Client Component
<AppShell initialTasks={tasks} initialMembers={members} />

// AppShell ('use client')
useEffect(() => store.hydrate(initialTasks, initialMembers), [])
```

A interface da store permanece idêntica — apenas a fonte dos dados muda.

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/store/appStore.ts` | **Novo** — store Zustand com clientSlice + dataSlice |
| `src/hooks/useSupabase.ts` | Refatorado — remove estado, mantém só mutations |
| `src/App.tsx` | Lê da store em vez de `useSupabase` para tasks/members/loading |
| Views (`MembersView`, `ReportsView`, etc.) | Removem props de tasks/members, leem da store |

---

## O que NÃO muda

- Lógica de `upsertSteps`, `createTask`, `updateTask`, `deleteTask` — mesma lógica, nova localização
- `AuthContext` — não é afetado
- `useUserClients` — não é afetado
- RLS policies no Supabase — não são alteradas agora (ficam para a migração Next.js onde o backend será reforçado)
- UI e views — só removem props que já virão da store
