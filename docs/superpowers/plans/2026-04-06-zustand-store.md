# Zustand Store — Persistência e Filtro por Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduzir uma Zustand store centralizada que resolve vazamento de dados entre clientes, re-fetches desnecessários e race conditions no update otimista, mantendo portabilidade para Next.js.

**Architecture:** Uma store Zustand com dois slices — `clientSlice` (seleção de cliente ativo) e `dataSlice` (cache de tasks/members com guard de inicialização). O `useSupabase` é refatorado para conter apenas mutations; os fetchers movem para a store. `App.tsx` e as views leem da store em vez de receberem props drilling.

**Tech Stack:** React 19 · TypeScript · Zustand · Supabase JS SDK · Sonner (toasts)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/store/appStore.ts` | **Criar** | Store Zustand: clientSlice + dataSlice + fetchers + mappers |
| `src/hooks/useSupabase.ts` | **Refatorar** | Apenas mutations (createTask, updateTask, deleteTask); remove estado |
| `src/App.tsx` | **Modificar** | Lê tasks/members/loading da store; remove useState de selectedClientId |
| `src/views/MembersView/MembersView.tsx` | **Modificar** | Remove props tasks/members, lê da store |
| `src/views/reports/ReportsView.tsx` | **Modificar** | Remove props tasks/members, lê da store |
| `src/views/dashboard/DashboardView.tsx` | **Modificar** | Remove prop tasks/members, lê da store |

---

## Task 1: Instalar Zustand

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Instalar zustand**

```bash
npm install zustand
```

Expected output: `added 1 package` (zustand ~4.x)

- [ ] **Step 2: Verificar instalação**

```bash
npm ls zustand
```

Expected: versão listada sem erros

---

## Task 2: Criar a store Zustand

**Files:**
- Create: `src/store/appStore.ts`

- [ ] **Step 1: Criar o arquivo da store**

Criar `src/store/appStore.ts` com o seguinte conteúdo completo:

```ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'

// ─── Mapper (copiado de useSupabase) ──────────────────────────────────────────

function dbRowToTask(row: DbTaskRow): Task {
  const steps: Step[] = (row.task_steps ?? [])
    .sort((a, b) => a.step_order - b.step_order)
    .map(s => ({
      id: s.id,
      type: s.type as StepType,
      order: s.step_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: (s.step_assignees ?? []).map((a: { member_id: string }) => a.member_id),
    }))

  return {
    id: row.id,
    title: row.title,
    clickupLink: row.clickup_link ?? undefined,
    clientId: row.client_id ?? undefined,
    status: {
      blocked: row.blocked,
      blockedAt: row.blocked_at ?? undefined,
    },
    createdAt: row.created_at,
    steps,
  }
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchTasksFromDb(
  clientId: string | null,
  isAdmin: boolean
): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      id, title, clickup_link, blocked, blocked_at, created_at, client_id,
      task_steps (
        id, type, step_order, active, start_date, end_date,
        step_assignees ( member_id )
      )
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin || clientId) {
    const ids = clientId ? [clientId] : []
    if (ids.length > 0) {
      query = query.in('client_id', ids)
    } else if (!isAdmin) {
      return []
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(dbRowToTask)
}

async function fetchMembersFromDb(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  // Client slice
  selectedClientId: string | null | undefined
  setSelectedClientId: (id: string | null | undefined) => void

  // Data slice
  tasks: Task[]
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchData: (clientId: string | null | undefined, isAdmin: boolean) => Promise<void>
  hydrate: (tasks: Task[], members: Member[]) => void
  invalidate: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Client slice ────────────────────────────────────────────────────────────
  selectedClientId: undefined,

  setSelectedClientId: (id) => {
    get().invalidate()
    set({ selectedClientId: id })
  },

  // ── Data slice ──────────────────────────────────────────────────────────────
  tasks: [],
  members: [],
  loading: false,
  error: null,
  cachedClientId: undefined,

  fetchData: async (clientId, isAdmin) => {
    // Guard: não fetcha se clientId ainda não está resolvido
    if (clientId === undefined) return

    // Cache hit: já temos dados deste cliente
    const state = get()
    if (
      clientId === state.cachedClientId &&
      state.tasks.length > 0 &&
      !state.loading
    ) return

    set({ loading: true, error: null })

    try {
      const [tasks, members] = await Promise.all([
        fetchTasksFromDb(clientId, isAdmin),
        fetchMembersFromDb(),
      ])
      set({ tasks, members, cachedClientId: clientId, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erro ao carregar dados',
        loading: false,
      })
    }
  },

  hydrate: (tasks, members) => {
    set({ tasks, members, loading: false, error: null })
  },

  invalidate: () => {
    set({ tasks: [], members: [], cachedClientId: undefined, error: null })
  },
}))
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
npm run build 2>&1 | head -40
```

Expected: sem erros de tipo no novo arquivo (pode haver outros erros existentes — ignorar por agora)

---

## Task 3: Refatorar useSupabase — apenas mutations

**Files:**
- Modify: `src/hooks/useSupabase.ts`

O objetivo é remover `useState` de tasks/members/loading, remover `fetchTasks`/`fetchMembers`, e fazer as mutations chamarem `store.invalidate()` + `store.fetchData()` após sucesso.

- [ ] **Step 1: Substituir o conteúdo de useSupabase.ts**

Substituir o arquivo inteiro por:

```ts
import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow } from '@/types/db'
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit'
import { useAppStore } from '@/store/appStore'

const devLog = import.meta.env.DEV
  ? (...args: unknown[]) => console.warn(...args)
  : () => undefined

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  avatar_url?: string | null
  email?: string | null
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
}

interface UseSupabaseOptions {
  memberId?: string
  clientId?: string | null
  isAdmin?: boolean
}

// ─── upsertSteps helper ───────────────────────────────────────────────────────

async function upsertSteps(taskId: string, steps: Step[]): Promise<boolean> {
  for (const step of steps) {
    const isNew = !step.id

    let stepId: string

    if (isNew) {
      const { data, error } = await supabase
        .from('task_steps')
        .insert({
          task_id: taskId,
          type: step.type,
          step_order: step.order,
          active: step.active,
          start_date: step.start || null,
          end_date: step.end || null,
        })
        .select('id')
        .single()

      if (error || !data) {
        devLog('[upsertSteps] Erro ao inserir step:', error?.message)
        return false
      }
      stepId = data.id
    } else {
      const { error } = await supabase
        .from('task_steps')
        .update({
          type: step.type,
          step_order: step.order,
          active: step.active,
          start_date: step.start || null,
          end_date: step.end || null,
        })
        .eq('id', step.id)

      if (error) {
        devLog('[upsertSteps] Erro ao atualizar step:', error.message)
        return false
      }
      stepId = step.id
    }

    await supabase.from('step_assignees').delete().eq('step_id', stepId)
    if (step.assignees.length > 0) {
      const { error: assigneeErr } = await supabase.from('step_assignees').insert(
        step.assignees.map(mid => ({ step_id: stepId, member_id: mid }))
      )
      if (assigneeErr) {
        devLog('[upsertSteps] Erro ao inserir assignees:', assigneeErr.message)
        return false
      }
    }
  }
  return true
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { memberId, clientId, isAdmin } = options
  const { invalidate, fetchData } = useAppStore()

  const refresh = useCallback(async () => {
    invalidate()
    await fetchData(clientId, isAdmin ?? false)
  }, [clientId, isAdmin, invalidate, fetchData])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<boolean> => {
    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
        client_id: taskData.clientId ?? null,
      })
      .select('id')
      .single()

    if (taskErr || !taskRow) {
      toast.error(taskErr?.message ?? 'Erro ao criar tarefa')
      return false
    }

    const ok = await upsertSteps(taskRow.id, taskData.steps)
    if (!ok) {
      toast.error('Tarefa criada mas erro ao guardar etapas')
      await refresh()
      return false
    }

    toast.success(`Demanda "${taskData.title}" criada`)
    if (memberId) {
      await logAudit({
        userId: memberId,
        clientId: taskData.clientId ?? null,
        entity: 'task',
        entityId: taskRow.id,
        entityName: taskData.title,
        action: 'create',
      })
    }

    await refresh()
    return true
  }, [memberId, refresh])

  const updateTask = useCallback(async (taskData: Task): Promise<boolean> => {
    const store = useAppStore.getState()
    const previousTasks = store.tasks
    const prevTask = previousTasks.find(t => t.id === taskData.id)

    // Optimistic update
    useAppStore.setState(s => ({
      tasks: s.tasks.map(t => t.id === taskData.id ? taskData : t)
    }))

    const { error: taskErr } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
      })
      .eq('id', taskData.id)

    if (taskErr) {
      useAppStore.setState({ tasks: previousTasks })
      toast.error(taskErr.message)
      return false
    }

    const keptIds = taskData.steps.map(s => s.id).filter(Boolean)
    if (keptIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)
        .not('id', 'in', `(${keptIds.join(',')})`)

      if (deleteErr) {
        useAppStore.setState({ tasks: previousTasks })
        toast.error(deleteErr.message)
        return false
      }
    } else {
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)

      if (deleteErr) {
        useAppStore.setState({ tasks: previousTasks })
        toast.error(deleteErr.message)
        return false
      }
    }

    const ok = await upsertSteps(taskData.id, taskData.steps)
    if (!ok) {
      toast.error('Tarefa atualizada mas erro ao guardar etapas')
      await refresh()
      return false
    }

    toast.success(`Demanda "${taskData.title}" atualizada`)
    if (memberId && prevTask) {
      if (prevTask.status?.blocked !== taskData.status?.blocked) {
        await logAudit({
          userId: memberId,
          clientId: taskData.clientId ?? null,
          entity: 'task',
          entityId: taskData.id,
          entityName: taskData.title,
          action: 'update',
          field: 'blocked',
          fromValue: String(prevTask.status?.blocked ?? false),
          toValue: String(taskData.status?.blocked ?? false),
        })
      }
      if (prevTask.title !== taskData.title) {
        await logAudit({
          userId: memberId,
          clientId: taskData.clientId ?? null,
          entity: 'task',
          entityId: taskData.id,
          entityName: taskData.title,
          action: 'update',
          field: 'title',
          fromValue: prevTask.title,
          toValue: taskData.title,
        })
      }
    }

    return true
  }, [memberId, refresh])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const deletedTask = useAppStore.getState().tasks.find(t => t.id === id)

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return false
    }

    useAppStore.setState(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    toast.success(`Demanda "${deletedTask?.title ?? id}" eliminada`)

    if (memberId && deletedTask) {
      await logAudit({
        userId: memberId,
        clientId: deletedTask.clientId ?? null,
        entity: 'task',
        entityId: id,
        entityName: deletedTask.title,
        action: 'delete',
      })
    }

    return true
  }, [memberId])

  return { createTask, updateTask, deleteTask }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build 2>&1 | head -60
```

Expected: erros apenas em `App.tsx` (que ainda usa a API antiga) — não em `useSupabase.ts` ou `appStore.ts`

---

## Task 4: Atualizar App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Substituir imports e remover estado local de dados**

No topo do arquivo, substituir:

```ts
import { useState, useEffect, useCallback, useMemo } from "react";
```
por:
```ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
```

- [ ] **Step 2: Remover useSupabase e estado local de selectedClientId**

Substituir o bloco:

```ts
  const [selectedClientId, setSelectedClientId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && session) {
      if (selectedClientId === undefined && hasClients) {
        // Inicialização: seleciona o primeiro cliente disponível
        setSelectedClientId(userClients[0].id);
      } else if (!hasClients) {
        // Usuário perdeu acesso a todos os clientes
        setSelectedClientId(undefined);
      } else if (typeof selectedClientId === 'string' && !userClients.find(c => c.id === selectedClientId)) {
        // Cliente selecionado não está mais acessível
        setSelectedClientId(userClients[0]?.id ?? undefined);
      }
    }
  }, [authLoading, session, hasClients, userClients]);

  // null só é válido para admin (ver todos); não-admin sempre precisa de um cliente
  const effectiveClientId = selectedClientId === undefined
    ? (hasClients ? userClients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (hasClients ? userClients[0].id : null)));

  const { tasks, members, createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  });
```

por:

```ts
  const {
    selectedClientId,
    setSelectedClientId: storeSetSelectedClientId,
    tasks,
    members,
    loading: dataLoading,
    fetchData,
    invalidate,
  } = useAppStore()

  // null só é válido para admin (ver todos); não-admin sempre precisa de um cliente
  const effectiveClientId = selectedClientId === undefined
    ? (hasClients ? userClients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (hasClients ? userClients[0].id : null)))

  // Inicialização e sincronização do clientId
  useEffect(() => {
    if (!authLoading && session) {
      if (selectedClientId === undefined && hasClients) {
        storeSetSelectedClientId(userClients[0].id)
      } else if (!hasClients) {
        storeSetSelectedClientId(undefined)
      } else if (typeof selectedClientId === 'string' && !userClients.find(c => c.id === selectedClientId)) {
        storeSetSelectedClientId(userClients[0]?.id ?? undefined)
      }
    }
  }, [authLoading, session, hasClients, userClients, selectedClientId, storeSetSelectedClientId])

  // Disparar fetch quando effectiveClientId estiver resolvido
  useEffect(() => {
    if (!authLoading && session && effectiveClientId !== undefined) {
      fetchData(effectiveClientId, isAdmin)
    }
  }, [authLoading, session, effectiveClientId, isAdmin, fetchData])

  const { createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  })
```

- [ ] **Step 3: Atualizar handleSelectClient para usar store**

Substituir:

```ts
  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    setSelectedClientId(clientId);
    setView("home");
  }, []);
```

por:

```ts
  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    storeSetSelectedClientId(clientId)
    setView("home")
  }, [storeSetSelectedClientId])
```

- [ ] **Step 4: Remover import de useSupabase do App.tsx**

Remover a linha:

```ts
import { useSupabase } from "./hooks/useSupabase";
```

Adicionar logo após o import do `useAppStore`:

```ts
import { useSupabase } from "./hooks/useSupabase";
```

(Manter o import de useSupabase — ele ainda é usado para createTask/updateTask/deleteTask)

- [ ] **Step 5: Verificar compilação**

```bash
npm run build 2>&1 | head -60
```

Expected: sem erros em `App.tsx`. Podem restar erros de props em views — resolvidos nos próximos tasks.

---

## Task 5: Atualizar DashboardView

**Files:**
- Modify: `src/views/dashboard/DashboardView.tsx`

- [ ] **Step 1: Verificar props atuais de DashboardView**

```bash
head -30 src/views/dashboard/DashboardView.tsx
```

- [ ] **Step 2: Adicionar leitura da store**

No topo do componente `DashboardView`, adicionar:

```ts
import { useAppStore } from '@/store/appStore'
```

E dentro do componente, antes de usar `tasks` e `members`, adicionar:

```ts
const { tasks, members } = useAppStore()
```

Remover `tasks` e `members` dos props destructuring (mantendo os demais props como `onEdit`, `onDelete`, `onUpdateTask`, etc.).

- [ ] **Step 3: Atualizar a interface de props**

Na interface `DashboardViewProps`, remover:

```ts
tasks: Task[]
members: Member[]
```

- [ ] **Step 4: Atualizar App.tsx — remover tasks/members da chamada de DashboardView**

Em `src/App.tsx`, na JSX de `DashboardView`, remover as props `tasks={tasks}` e `members={members}`.

- [ ] **Step 5: Verificar compilação**

```bash
npm run build 2>&1 | head -60
```

Expected: sem erros em DashboardView

---

## Task 6: Atualizar MembersView

**Files:**
- Modify: `src/views/MembersView/MembersView.tsx`

- [ ] **Step 1: Adicionar leitura da store**

Adicionar no topo:

```ts
import { useAppStore } from '@/store/appStore'
```

Dentro do componente, adicionar:

```ts
const { tasks, members: allMembers } = useAppStore()
```

- [ ] **Step 2: Recalcular clientMembers localmente**

`MembersView` hoje recebe `members` já filtrados como `clientMembers`. Com a store, o filtro precisa ser feito localmente. Adicionar dentro do componente:

```ts
const { effectiveClientId } = useAppStore()  // não existe na store — usar prop ou calcular
```

**Alternativa mais simples:** manter o prop `members` em `MembersView` como está (recebe `clientMembers` de `App.tsx`), e apenas remover o prop `tasks` se ele for usado internamente. Verificar se `MembersView` usa `tasks` diretamente e decidir.

Verificar com:

```bash
grep -n "tasks" src/views/MembersView/MembersView.tsx
```

Se `tasks` for prop, remover e ler da store. Se só receber `members`, manter prop `members` e apenas remover prop `tasks`.

- [ ] **Step 3: Atualizar interface de props conforme resultado acima**

Remover apenas os props que agora vêm da store.

- [ ] **Step 4: Atualizar App.tsx — remover props eliminados de MembersView**

- [ ] **Step 5: Verificar compilação**

```bash
npm run build 2>&1 | head -60
```

---

## Task 7: Atualizar ReportsView

**Files:**
- Modify: `src/views/reports/ReportsView.tsx`

- [ ] **Step 1: Verificar props de ReportsView**

```bash
grep -n "tasks\|members" src/views/reports/ReportsView.tsx | head -20
```

- [ ] **Step 2: Adicionar leitura da store**

```ts
import { useAppStore } from '@/store/appStore'
```

Dentro do componente:

```ts
const { tasks } = useAppStore()
```

Remover `tasks` dos props. Manter `members` se vier de `clientMembers` calculado em `App.tsx`.

- [ ] **Step 3: Atualizar interface de props**

Remover `tasks: Task[]` da interface de props.

- [ ] **Step 4: Atualizar App.tsx — remover prop tasks de ReportsView**

- [ ] **Step 5: Verificar compilação final**

```bash
npm run build 2>&1
```

Expected: zero erros de TypeScript

---

## Task 8: Verificação manual no browser

**Files:** nenhum

- [ ] **Step 1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Testar fluxo de inicialização**

1. Abrir `localhost:5173`
2. Fazer login
3. Verificar no console que não há fetch antes do cliente ser selecionado (não deve aparecer query Supabase com `client_id` vazio)
4. Verificar que as tasks carregam corretamente após login

- [ ] **Step 3: Testar troca de cliente**

1. Trocar de cliente no header
2. Verificar que tasks e members são limpos imediatamente (loading state)
3. Verificar que novos dados carregam apenas do cliente selecionado
4. Trocar de volta — verificar que dados do primeiro cliente carregam (sem vazamento)

- [ ] **Step 4: Testar cache entre views**

1. Navegar para Dashboard → Members → Reports → Dashboard
2. Verificar que ao voltar ao Dashboard não há re-fetch desnecessário (dados já em cache)

- [ ] **Step 5: Testar mutations**

1. Criar uma nova demanda → verificar toast de sucesso e dados atualizados
2. Editar uma demanda → verificar update otimista e sync correto
3. Deletar uma demanda → verificar remoção imediata da lista

---

## Task 9: Lint e build final

**Files:** nenhum

- [ ] **Step 1: Rodar lint**

```bash
npm run lint
```

Corrigir warnings de lint relacionados aos arquivos modificados.

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

Expected: build completo sem erros
