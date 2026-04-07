# Request Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `useDataStore` por dois stores separados (`useTaskStore` e `useMemberStore`) com fetch lazy por view, eliminando requests desnecessárias no boot e overfetching de members.

**Architecture:** Dois stores Zustand independentes com cache por `clientId` e idempotência. Cada view dispara seu próprio fetch no mount. `App.tsx` para de buscar dados no boot e deixa de passar tasks/members via props.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/store/useTaskStore.ts` |
| Criar | `src/store/useMemberStore.ts` |
| Deletar | `src/store/useDataStore.ts` |
| Deletar | `src/store/appStore.ts` |
| Modificar | `src/App.tsx` |
| Modificar | `src/hooks/useSupabase.ts` |
| Modificar | `src/views/dashboard/DashboardView.tsx` |
| Modificar | `src/views/calendar/CalendarView.tsx` *(não usa store direto — recebe props de DashboardView, sem mudança)* |
| Modificar | `src/views/timeline/TimelineView.tsx` *(idem — sem mudança)* |
| Modificar | `src/views/MembersView/MembersView.tsx` |
| Modificar | `src/views/reports/ReportsView.tsx` |
| Modificar | `src/components/TaskModal.tsx` |

> CalendarView e TimelineView recebem `tasks` e `members` via props de DashboardView — não leem store diretamente. Sem alteração necessária.

---

## Task 1: Criar `useTaskStore`

**Files:**
- Create: `src/store/useTaskStore.ts`

- [ ] **Step 1: Criar o arquivo com store e fetcher**

```ts
// src/store/useTaskStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow } from '@/types/db'

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

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchTasks(clientId: string | null | undefined, isAdmin: boolean): Promise<void>
  invalidate(): void
}

export const useTaskStore = create<TaskState>()(devtools((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  cachedClientId: undefined,

  fetchTasks: async (clientId, isAdmin) => {
    if (clientId === undefined) return

    const state = get()
    if (
      clientId === state.cachedClientId &&
      state.tasks.length > 0 &&
      !state.loading
    ) return

    set({ loading: true, error: null })

    try {
      const tasks = await fetchTasksFromDb(clientId, isAdmin)
      set({ tasks, cachedClientId: clientId, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erro ao carregar tarefas',
        loading: false,
      })
    }
  },

  invalidate: () => {
    set({ tasks: [], cachedClientId: undefined, error: null })
  },
}), { name: 'TaskStore' }))
```

- [ ] **Step 2: Verificar que não há erros de tipo**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 2: Criar `useMemberStore`

**Files:**
- Create: `src/store/useMemberStore.ts`

- [ ] **Step 1: Criar o arquivo com store e fetcher filtrado por cliente**

```ts
// src/store/useMemberStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/hooks/useSupabase'

async function fetchMembersFromDb(clientId: string | null | undefined): Promise<Member[]> {
  if (clientId === undefined) return []

  if (clientId === null) {
    // Admin sem filtro: todos os members
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
      .order('name')
    if (error) throw new Error(error.message)
    return data ?? []
  }

  // Filtrado por cliente via join
  const { data, error } = await supabase
    .from('members')
    .select(`
      id, name, role, avatar, avatar_url, email, auth_user_id, access_role,
      step_assignees!inner (
        task_steps!inner (
          tasks!inner ( client_id )
        )
      )
    `)
    .eq('step_assignees.task_steps.tasks.client_id', clientId)
    .order('name')

  if (error) throw new Error(error.message)

  // Deduplicar (join pode retornar duplicatas)
  const seen = new Set<string>()
  return (data ?? []).filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  }).map(({ step_assignees: _sa, ...m }) => m as Member)
}

interface MemberState {
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchMembers(clientId: string | null | undefined): Promise<void>
  invalidate(): void
}

export const useMemberStore = create<MemberState>()(devtools((set, get) => ({
  members: [],
  loading: false,
  error: null,
  cachedClientId: undefined,

  fetchMembers: async (clientId) => {
    if (clientId === undefined) return

    const state = get()
    if (
      clientId === state.cachedClientId &&
      state.members.length > 0 &&
      !state.loading
    ) return

    set({ loading: true, error: null })

    try {
      const members = await fetchMembersFromDb(clientId)
      set({ members, cachedClientId: clientId, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erro ao carregar membros',
        loading: false,
      })
    }
  },

  invalidate: () => {
    set({ members: [], cachedClientId: undefined, error: null })
  },
}), { name: 'MemberStore' }))
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 3: Migrar `useSupabase.ts`

**Files:**
- Modify: `src/hooks/useSupabase.ts`

- [ ] **Step 1: Substituir import e uso de `useAppStore` por `useTaskStore`**

Localizar e substituir as seguintes seções em `src/hooks/useSupabase.ts`:

**Remover:**
```ts
import { useAppStore } from '@/store/appStore'
```

**Adicionar:**
```ts
import { useTaskStore } from '@/store/useTaskStore'
```

**Remover:**
```ts
  const { invalidate, fetchData } = useAppStore()

  const refresh = useCallback(async () => {
    invalidate()
    await fetchData(clientId, isAdmin ?? false)
  }, [clientId, isAdmin, invalidate, fetchData])
```

**Adicionar:**
```ts
  const refresh = useCallback(async () => {
    useTaskStore.getState().invalidate()
    await useTaskStore.getState().fetchTasks(clientId, isAdmin ?? false)
  }, [clientId, isAdmin])
```

- [ ] **Step 2: Substituir referências `useAppStore` no corpo de `updateTask` e `deleteTask`**

Em `updateTask`, substituir:
```ts
    const store = useAppStore.getState()
    const previousTasks = store.tasks
    const prevTask = previousTasks.find(t => t.id === taskData.id)

    useAppStore.setState(s => ({
      tasks: s.tasks.map(t => t.id === taskData.id ? taskData : t)
    }))
```
Por:
```ts
    const previousTasks = useTaskStore.getState().tasks
    const prevTask = previousTasks.find(t => t.id === taskData.id)

    useTaskStore.setState(s => ({
      tasks: s.tasks.map(t => t.id === taskData.id ? taskData : t)
    }))
```

E os dois rollbacks `useAppStore.setState({ tasks: previousTasks })` por:
```ts
    useTaskStore.setState({ tasks: previousTasks })
```

Em `deleteTask`, substituir:
```ts
    const deletedTask = useAppStore.getState().tasks.find(t => t.id === id)
```
Por:
```ts
    const deletedTask = useTaskStore.getState().tasks.find(t => t.id === id)
```

E substituir:
```ts
    useAppStore.setState(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
```
Por:
```ts
    useTaskStore.setState(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 4: Migrar `DashboardView`

**Files:**
- Modify: `src/views/dashboard/DashboardView.tsx`

- [ ] **Step 1: Adicionar fetch lazy e ler stores**

Substituir o conteúdo de `src/views/dashboard/DashboardView.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { useTaskFilters } from './hooks/useTaskFilters';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterBar } from './components/FilterBar';
import { MetricsBar } from './components/MetricsBar';
import { StepsLegend } from './components/StepsLegend';
import type { DashboardViewProps } from '@/types/props';

const DashboardView: React.FC<DashboardViewProps> = ({ onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
  const { isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const [calView, setCalView] = useState<'calendar' | 'timeline'>('calendar');

  useEffect(() => {
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  const {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps, hasActiveFilters,
    clearFilters, toggleStepFilter,
    filteredTasks, blockedCount, activeCount,
  } = useTaskFilters(tasks ?? []);

  return (
    <div className="space-y-5">
      <DashboardHeader
        calView={calView}
        onChangeView={setCalView}
        onExport={onExport}
        onOpenNew={onOpenNew}
      />
      <MetricsBar
        totalCount={(tasks ?? []).length}
        activeCount={activeCount}
        blockedCount={blockedCount}
      />

      <FilterBar
        members={members ?? []}
        filterAssignee={filterAssignee}
        onChangeAssignee={setFilterAssignee}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        filterSteps={filterSteps}
        onToggleStep={toggleStepFilter}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        filteredCount={filteredTasks.length}
        totalCount={(tasks ?? []).length}
      />

      {calView === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} />
      ) : (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} />
      )}

      <StepsLegend />
    </div>
  );
};

export default DashboardView;
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 5: Migrar `MembersView`

**Files:**
- Modify: `src/views/MembersView/MembersView.tsx`

- [ ] **Step 1: Substituir imports e adicionar fetch lazy**

```tsx
import React, { useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import MemberCard from './components/MemberCard';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MembersView: React.FC = () => {
  const { isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const today = todayStr();

  useEffect(() => {
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipe</h2>
        <p className="text-muted-foreground">Alocação por step ativo por membro.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map(member => (
          <MemberCard key={member.id} member={member} tasks={tasks} today={today} />
        ))}
      </div>
    </div>
  );
};

export default MembersView;
```

- [ ] **Step 2: Atualizar `MembersViewProps` em `src/types/props.ts` — remover prop `members` se não for mais usada por outras views**

Verificar se `MembersViewProps` é usado em mais algum lugar:
```bash
grep -r "MembersViewProps" src/
```
Se apenas em `MembersView.tsx`, remover a interface ou deixar vazia. Se usado em outros lugares, manter compatibilidade.

- [ ] **Step 3: Atualizar `App.tsx` — remover `members={clientMembers}` do `<MembersView>`**

Em `src/App.tsx`, alterar:
```tsx
) : view === "members" ? (
  <MembersView members={clientMembers} />
```
Para:
```tsx
) : view === "members" ? (
  <MembersView />
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 6: Migrar `ReportsView`

**Files:**
- Modify: `src/views/reports/ReportsView.tsx`

- [ ] **Step 1: Substituir imports e adicionar fetch lazy**

```tsx
import React, { useMemo, useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { BarChart2 } from 'lucide-react';
import { todayStr, enrichTask, computeMemberLoad } from './utils';
import type { StepType } from '@/lib/steps';
import KpiCards from './components/KpiCards';
import DemandsTable from './components/DemandsTable';
import UpcomingDeadlines from './components/UpcomingDeadlines';
import TeamCapacity from './components/TeamCapacity';
import StepLoadChart from './components/StepLoadChart';
import StateDistribution from './components/StateDistribution';
import AlertsSection from './components/AlertsSection';

const ReportsView: React.FC = () => {
  const { isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const today = todayStr();

  useEffect(() => {
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  const enriched = useMemo(
    () => tasks.map(task => enrichTask(task, today, members)),
    [tasks, today, members]
  );

  const total = enriched.length;
  const active = enriched.filter(t => t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
  const atrasadas = enriched.filter(t => t.risk === 'atrasado').length;
  const emRisco = enriched.filter(t => t.risk === 'risco').length;
  const bloqueadas = enriched.filter(t => t.isBlocked).length;
  const semSteps = enriched.filter(t => t.visibleSteps.length === 0).length;

  const upcomingDeadlines = useMemo(
    () => enriched
      .filter(t => t.lastDeadline && t.daysLeft >= 0 && t.daysLeft <= 14 && !t.isBlocked)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [enriched]
  );

  const stepLoad = useMemo(() => {
    const counts: Partial<Record<StepType, number>> = {};
    for (const t of enriched) {
      for (const step of t.visibleSteps) {
        if (step.start <= today && step.end >= today) {
          counts[step.type as StepType] = (counts[step.type as StepType] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [enriched, today]);
  const maxStepLoad = Math.max(...Object.values(stepLoad), 1);

  const memberLoad = useMemo(
    () => members.map(m => computeMemberLoad(m, enriched, today)),
    [members, enriched, today]
  );

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-lg font-medium">Sem demandas para analisar</p>
        <p className="text-sm">Crie demandas no Calendário para ver os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground text-sm">Visão analítica das demandas · Hoje: {today}</p>
      </div>

      <KpiCards total={total} active={active} atrasadas={atrasadas} emRisco={emRisco} bloqueadas={bloqueadas} semSteps={semSteps} />

      <DemandsTable enriched={enriched} members={members} />

      <div className="grid md:grid-cols-2 gap-6">
        <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
        <TeamCapacity memberLoad={memberLoad} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <StepLoadChart stepLoad={stepLoad} maxStepLoad={maxStepLoad} />
        <StateDistribution total={total} bloqueadas={bloqueadas} active={active} semSteps={semSteps} />
      </div>

      <AlertsSection enriched={enriched} />
    </div>
  );
};

export default ReportsView;
```

- [ ] **Step 2: Remover `members={clientMembers}` do `<ReportsView>` em `App.tsx`**

Em `src/App.tsx`, alterar:
```tsx
          <ReportsView members={clientMembers} />
```
Para:
```tsx
          <ReportsView />
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 7: Migrar `TaskModal` — fetch members ao abrir

**Files:**
- Modify: `src/components/TaskModal.tsx`

O `TaskModal` já recebe `members` via prop de `App.tsx`. Com a nova arquitetura, ele deve buscar do `useMemberStore` internamente para garantir que a lista esteja carregada ao abrir.

- [ ] **Step 1: Adicionar fetch de members ao abrir o modal**

No topo de `src/components/TaskModal.tsx`, adicionar imports:
```ts
import { useEffect } from 'react';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
```

Dentro do componente `TaskModal`, antes do `return`, adicionar:
```tsx
  const { selectedClientId } = useClientStore();
  const { fetchMembers, members: storeMembers } = useMemberStore();

  useEffect(() => {
    fetchMembers(selectedClientId);
  }, [selectedClientId, fetchMembers]);

  // Usa storeMembers se disponível, fallback para prop members
  const resolvedMembers = storeMembers.length > 0 ? storeMembers : members;
```

E substituir todas as referências a `members` no JSX por `resolvedMembers`.

- [ ] **Step 2: Em `App.tsx`, o `<TaskModal members={members}>` pode agora passar `members={[]}` ou continuar passando — manter `members={members}` por compatibilidade com o fallback acima. Nenhuma mudança necessária em App.tsx para este passo.**

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

## Task 8: Limpar `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remover `useDataStore`, fetch boot e `clientMembers` useMemo**

Remover os seguintes imports:
```ts
import { useDataStore } from "@/store/useDataStore";
import type { Task } from "./lib/steps";  // se não for mais usado em outro lugar
```

Remover a linha:
```ts
const { tasks, members, fetchData, invalidate } = useDataStore();
```

Remover o `useEffect` de boot fetch:
```ts
  useEffect(() => {
    if (!authLoading && session && effectiveClientId !== undefined) {
      fetchData(effectiveClientId, isAdmin);
    }
  }, [authLoading, session, effectiveClientId, isAdmin, fetchData]);
```

Remover o `useMemo` de `clientMembers`:
```ts
  const clientMembers = useMemo(() => {
    if (effectiveClientId === null) return members;
    const assignedIds = new Set<string>();
    tasks.forEach(t => t.steps.forEach(s => s.assignees.forEach(id => assignedIds.add(id))));
    return members.filter(m => assignedIds.has(m.id));
  }, [tasks, members, effectiveClientId]);
```

- [ ] **Step 2: Atualizar `handleSelectClient` para invalidar ambos os stores**

Adicionar imports:
```ts
import { useTaskStore } from "@/store/useTaskStore";
import { useMemberStore } from "@/store/useMemberStore";
```

Substituir:
```ts
  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    invalidate();
    setClient(clientId);
    setView("home");
  }, [invalidate, setClient, setView]);
```

Por:
```ts
  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    useTaskStore.getState().invalidate();
    useMemberStore.getState().invalidate();
    setClient(clientId);
    setView("home");
  }, [setClient, setView]);
```

- [ ] **Step 3: Verificar que `members` ainda é passado ao `TaskModal` — usar `useMemberStore` no App**

Adicionar no App.tsx:
```ts
  const { members } = useMemberStore();
```

Manter `<TaskModal members={members} ...>` como está (o modal usa como fallback).

- [ ] **Step 4: Remover import de `useMemo` se não for mais utilizado (verificar outros usos antes)**

Verificar e ajustar a linha de imports do React conforme necessário.

- [ ] **Step 5: Verificar tipos e rodar build**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -20
```

---

## Task 9: Deletar stores obsoletos

**Files:**
- Delete: `src/store/useDataStore.ts`
- Delete: `src/store/appStore.ts`

- [ ] **Step 1: Verificar que nenhum arquivo ainda importa esses módulos**

```bash
grep -r "useDataStore\|appStore\|useAppStore" src/ --include="*.ts" --include="*.tsx"
```

Se houver resultados, corrigi-los antes de prosseguir.

- [ ] **Step 2: Deletar os arquivos**

```bash
rm src/store/useDataStore.ts src/store/appStore.ts
```

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build bem-sucedido sem erros.
