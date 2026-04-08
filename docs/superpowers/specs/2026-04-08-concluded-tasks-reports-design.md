# Spec: Tarefas Concluídas nos Relatórios e Métricas

**Data:** 2026-04-08  
**Status:** Aprovado

## Problema

O campo `concludedAt` já existe no modelo `Task` e no banco (`tasks.concluded_at`), mas não é usado em nenhuma lógica de relatório ou capacidade. Tarefas concluídas são tratadas como atrasadas (`risk = 'atrasado'`) quando `today > lastDeadline`, inflando métricas de bloqueio, carga de membros e contadores de "em andamento".

## Objetivo

- Tarefas com `concludedAt` preenchido devem ser reconhecidas como `'concluido'` em todas as métricas.
- Elas **não contam** para carga/capacidade de membros nem para "em andamento" ou "bloqueadas".
- Elas **continuam** nas métricas históricas (lead time, throughput, tempo médio por step, timeline por mês).
- Os steps **não são alterados** — `concludedAt` é o único sinalizador.

## Abordagem

Centralizar em duas funções em `src/views/reports/utils.ts`. Todos os componentes já consomem `risk` e `isBlocked`, então a mudança se propaga sem alterar componentes individuais.

## Mudanças por arquivo

### `src/views/reports/utils.ts`

**`getRisk()`** — adicionar verificação de `concludedAt` como primeira condição:

```ts
export function getRisk(task, today) {
  const norm = normalizeTask(task);
  if (norm.concludedAt) return 'concluido';       // <-- novo
  const lastDeadline = getLastDeadline(task);
  if (!lastDeadline) return 'ok';
  if (today > lastDeadline) return 'atrasado';
  const daysLeft = calDaysBetween(today, lastDeadline);
  if (norm.status?.blocked) return 'risco';
  if (daysLeft <= 2) return 'risco';
  return 'ok';
}
```

**`enrichTask()`** — forçar `isBlocked = false` quando concluída:

```ts
isBlocked: risk === 'concluido' ? false : (norm.status?.blocked ?? false),
```

**`computeMemberLoad()`** — excluir concluídas do loop de carga ativa:

```ts
for (const t of enriched) {
  if (t.risk === 'concluido') continue;  // <-- novo
  for (const step of t.visibleSteps) { ... }
}
```

### `src/views/reports/ReportsView.tsx`

**`active` count** — excluir concluídas:

```ts
const active = filteredEnriched.filter(
  t => t.risk !== 'concluido' && t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today
).length;
```

**`bloqueadas` count** — já correto via `isBlocked` (que será `false` para concluídas após mudança em `enrichTask`).

**`stepLoad`** — excluir concluídas do step load atual:

```ts
for (const t of filteredEnriched) {
  if (t.risk === 'concluido') continue;  // <-- novo
  for (const step of t.visibleSteps) { ... }
}
```

**`StateDistribution`** — calcular e passar `concluidasCount`:

```ts
const concluidas = filteredEnriched.filter(t => t.risk === 'concluido').length;
```

### `src/views/dashboard/hooks/useTaskFilters.ts`

**`activeCount`** — excluir concluídas:

```ts
return tasks.filter(t => {
  const norm = normaliseTask(t);
  if (norm.concludedAt) return false;
  const step = getCurrentStep(norm.steps ?? [], today);
  return step && step.start <= today && step.end >= today;
}).length;
```

**`blockedCount`** — excluir concluídas:

```ts
tasks.filter(t => {
  const norm = normaliseTask(t);
  return !norm.concludedAt && norm.status?.blocked;
}).length;
```

### `src/views/reports/components/StateDistribution.tsx`

Adicionar categoria "Concluídas" ao gráfico de distribuição de estados, recebendo `concluidasCount` como prop.

## O que NÃO muda

- Steps no banco — `concludedAt` é o único sinalizador, steps mantêm suas datas originais.
- `upsertSteps` em `useSupabase.ts` — sem alteração.
- Métricas históricas (lead time, throughput, `avgTimeData`, `timelineData`) — continuam recebendo todas as tarefas incluindo concluídas.
- `flowMetrics` (`completedTasks`) — já filtra por `t.risk === 'concluido'` ou `lastDeadline < today`, continua correto.

## Critérios de aceitação

1. Tarefa com `concludedAt` preenchido não aparece como "atrasada" nos relatórios.
2. Membro com apenas tarefas concluídas tem carga = 0 ("Livre").
3. MetricsBar no Dashboard não conta tarefas concluídas em "Em andamento" ou "Bloqueadas".
4. `StateDistribution` exibe categoria "Concluídas" separada.
5. Lead time, throughput e tempo médio por step continuam incluindo tarefas concluídas.
