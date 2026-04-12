# Concluded Tasks Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer tarefas com `concludedAt` preenchido serem reconhecidas como `'concluido'` em todas as métricas, excluindo-as de carga/capacidade mas mantendo-as em histórico.

**Architecture:** Centralizar a lógica em `getRisk()` e `enrichTask()` em `src/views/reports/utils.ts`. Como todos os componentes já consomem `risk` e `isBlocked`, a mudança se propaga sem alterar componentes individuais, exceto `StateDistribution` que ganha uma categoria "Concluídas" e `useTaskFilters` que corrige `activeCount`/`blockedCount` no Dashboard.

**Tech Stack:** React 19, TypeScript 5.9, Zustand

---

## Arquivos

| Ação | Arquivo | O que muda |
|---|---|---|
| Modify | `src/views/reports/utils.ts` | `getRisk`, `enrichTask`, `computeMemberLoad` |
| Modify | `src/views/reports/ReportsView.tsx` | `active`, `stepLoad`, passa `concluidasCount` |
| Modify | `src/views/reports/components/StateDistribution.tsx` | Nova prop + linha "Concluídas" |
| Modify | `src/views/dashboard/hooks/useTaskFilters.ts` | `activeCount`, `blockedCount` |

---

### Task 1: `getRisk()` reconhece `concludedAt`

**Files:**
- Modify: `src/views/reports/utils.ts:75-84`

- [ ] **Step 1: Editar `getRisk()`**

Em `src/views/reports/utils.ts`, substituir a função `getRisk`:

```ts
export function getRisk(task: Task | LegacyTask, today: string): 'ok' | 'risco' | 'atrasado' | 'concluido' {
  const norm = normalizeTask(task);
  if (norm.concludedAt) return 'concluido';
  const lastDeadline = getLastDeadline(task);
  if (!lastDeadline) return 'ok';
  if (today > lastDeadline) return 'atrasado';
  const daysLeft = calDaysBetween(today, lastDeadline);
  if (norm.status?.blocked) return 'risco';
  if (daysLeft <= 2) return 'risco';
  return 'ok';
}
```

- [ ] **Step 2: Verificar que o tipo de retorno inclui `'concluido'`**

O tipo `EnrichedTask.risk` em `src/views/reports/utils.ts:92` já inclui `'concluido'`:
```ts
risk: 'ok' | 'risco' | 'atrasado' | 'concluido';
```
Nenhuma mudança necessária.

- [ ] **Step 3: Commit**

```bash
git add src/views/reports/utils.ts
git commit -m "feat: getRisk retorna 'concluido' quando concludedAt está preenchido"
```

---

### Task 2: `enrichTask()` e `computeMemberLoad()` respeitam concluídas

**Files:**
- Modify: `src/views/reports/utils.ts:150-167` (enrichTask)
- Modify: `src/views/reports/utils.ts:169-191` (computeMemberLoad)

- [ ] **Step 1: Atualizar `isBlocked` em `enrichTask()`**

Localizar a linha `isBlocked: norm.status?.blocked ?? false,` em `enrichTask` (por volta da linha 161) e substituir:

```ts
isBlocked: risk === 'concluido' ? false : (norm.status?.blocked ?? false),
```

- [ ] **Step 2: Atualizar `computeMemberLoad()` para ignorar concluídas na carga ativa**

Localizar o loop `for (const t of enriched)` em `computeMemberLoad` (por volta da linha 175) e adicionar o `continue`:

```ts
for (const t of enriched) {
  if (t.risk === 'concluido') continue;
  for (const step of t.visibleSteps) {
    if (step.assignees.includes(member.id) && step.start <= today && step.end >= today) {
      activeCount++;
      wipCount++;
    }
  }
}
```

- [ ] **Step 3: Build para verificar tipos**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros de TypeScript relacionados às mudanças.

- [ ] **Step 4: Commit**

```bash
git add src/views/reports/utils.ts
git commit -m "feat: enrichTask e computeMemberLoad ignoram tarefas concluídas na carga"
```

---

### Task 3: `ReportsView` exclui concluídas de métricas ativas

**Files:**
- Modify: `src/views/reports/ReportsView.tsx:112-114` (active count)
- Modify: `src/views/reports/ReportsView.tsx:123-133` (stepLoad)
- Modify: `src/views/reports/ReportsView.tsx:407` (StateDistribution call)

- [ ] **Step 1: Corrigir `active` count**

Localizar a linha (por volta da 112):
```ts
const active = filteredEnriched.filter(t => t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
```
Substituir por:
```ts
const active = filteredEnriched.filter(t => t.risk !== 'concluido' && t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
```

- [ ] **Step 2: Calcular `concluidasCount`**

Após a linha `const semSteps = ...`, adicionar:
```ts
const concluidas = filteredEnriched.filter(t => t.risk === 'concluido').length;
```

- [ ] **Step 3: Corrigir `stepLoad` — excluir concluídas**

Localizar o bloco `useMemo` de `stepLoad` (por volta da linha 123). Dentro do `for (const t of filteredEnriched)`, adicionar `continue` para concluídas:

```ts
const stepLoad = useMemo(() => {
  const counts: Partial<Record<StepType, number>> = {};
  for (const t of filteredEnriched) {
    if (t.risk === 'concluido') continue;
    for (const step of t.visibleSteps) {
      if (step.start <= today && step.end >= today) {
        counts[step.type as StepType] = (counts[step.type as StepType] ?? 0) + 1;
      }
    }
  }
  return counts;
}, [filteredEnriched, today]);
```

- [ ] **Step 4: Passar `concluidasCount` ao `StateDistribution`**

Localizar o JSX `<StateDistribution ... />` (por volta da linha 407) e adicionar a prop:
```tsx
<StateDistribution total={total} bloqueadas={bloqueadas} active={active} semSteps={semSteps} concluidas={concluidas} />
```

- [ ] **Step 5: Commit**

```bash
git add src/views/reports/ReportsView.tsx
git commit -m "feat: ReportsView exclui concluídas de métricas de carga ativa"
```

---

### Task 4: `StateDistribution` exibe categoria Concluídas

**Files:**
- Modify: `src/views/reports/components/StateDistribution.tsx`

- [ ] **Step 1: Adicionar prop `concluidas` ao componente**

Substituir a interface e a assinatura do componente:

```tsx
interface StateDistributionProps {
  total: number;
  bloqueadas: number;
  active: number;
  semSteps: number;
  concluidas: number;
}

const StateDistribution: React.FC<StateDistributionProps> = ({ total, bloqueadas, active, semSteps, concluidas }) => {
```

- [ ] **Step 2: Adicionar linha "Concluídas" ao array `rows`**

```tsx
const rows = [
  { key: 'concluido', label: 'Concluídas',   count: concluidas, color: 'bg-emerald-500', tooltip: 'Tasks marcadas como concluídas' },
  { key: 'andamento', label: 'Em andamento', count: active,     color: 'bg-blue-500',    tooltip: 'Tasks com step ativo no período atual' },
  { key: 'bloqueado', label: 'Bloqueado',    count: bloqueadas, color: 'bg-red-500',     tooltip: 'Tasks com bloqueio ativo' },
  { key: 'sem-steps', label: 'Sem steps',    count: semSteps,   color: 'bg-muted-foreground', tooltip: 'Tasks sem steps definidos' },
];
```

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/views/reports/components/StateDistribution.tsx
git commit -m "feat: StateDistribution exibe categoria Concluídas"
```

---

### Task 5: Dashboard — `useTaskFilters` corrige `activeCount` e `blockedCount`

**Files:**
- Modify: `src/views/dashboard/hooks/useTaskFilters.ts:94-106`

- [ ] **Step 1: Corrigir `blockedCount`**

Localizar (por volta da linha 94):
```ts
const blockedCount = useMemo(
  () => tasks.filter(t => normaliseTask(t).status?.blocked).length,
  [tasks]
);
```
Substituir por:
```ts
const blockedCount = useMemo(
  () => tasks.filter(t => {
    const norm = normaliseTask(t);
    return !norm.concludedAt && norm.status?.blocked;
  }).length,
  [tasks]
);
```

- [ ] **Step 2: Corrigir `activeCount`**

Localizar (por volta da linha 99):
```ts
const activeCount = useMemo(() => {
  const today = todayStr();
  return tasks.filter(t => {
    const norm = normaliseTask(t);
    const step = getCurrentStep(norm.steps ?? [], today);
    return step && step.start <= today && step.end >= today;
  }).length;
}, [tasks]);
```
Substituir por:
```ts
const activeCount = useMemo(() => {
  const today = todayStr();
  return tasks.filter(t => {
    const norm = normaliseTask(t);
    if (norm.concludedAt) return false;
    const step = getCurrentStep(norm.steps ?? [], today);
    return step && step.start <= today && step.end >= today;
  }).length;
}, [tasks]);
```

- [ ] **Step 3: Build final completo**

```bash
npm run build 2>&1 | head -60
```

Esperado: sem erros. Se houver, corrigir antes de continuar.

- [ ] **Step 4: Verificação manual**

Abrir `npm run dev` e verificar:
1. Uma tarefa com `concludedAt` preenchido não aparece como "Atrasada" nos relatórios.
2. Membro com apenas tarefas concluídas aparece como "Livre" na aba Membros.
3. MetricsBar no Dashboard não conta tarefas concluídas em "Em andamento" ou "Bloqueadas".
4. `StateDistribution` exibe linha "Concluídas" separada.

- [ ] **Step 5: Commit final**

```bash
git add src/views/dashboard/hooks/useTaskFilters.ts
git commit -m "feat: useTaskFilters exclui tarefas concluídas de activeCount e blockedCount"
```
