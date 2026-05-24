# Evolução do Sistema de Workload — Flow-Based

## Contexto

O sistema atual mede carga por contagem simples: `subtaskCount / capacity`. Uma task de 30 minutos e uma task travada há semanas pesam igual. Esta evolução migra para um modelo orientado a fluxo real com estimativas em horas, score de pressão composto, detecção de travamento e previsibilidade de entrega.

---

## Novos Campos nas Tasks

| Campo DB | Tipo | Campo TS | Descrição |
|---|---|---|---|
| `expected_hours` | `NUMERIC(6,2)` | `expectedHours` | Estimativa em horas (obrigatório em tasks novas) |
| `complexity` | `TEXT` | `complexity` | `baixa` \| `media` \| `alta` \| `avancada` \| `extrema` |
| `task_type` | `TEXT` | `taskType` | `feature` \| `bug` \| `support` \| `meeting` |
| `due_date` | `DATE` | `dueDate` | Prazo de entrega ao cliente (`YYYY-MM-DD`) |
| `started_at` | `TIMESTAMPTZ` | `startedAt` | Setado pela app quando primeira subtask vai para `in-progress` |

Todas as colunas nullable — dados existentes não quebram.

---

## Estimativa com Planning Poker

- Unidade: **horas** (float) — suporta tasks sub-diárias (`0.5h` = 30min)
- Sequência de referência: `0.5 · 1 · 2 · 3 · 5 · 8 · 13` (Fibonacci)
- No TaskModal: chips clicáveis abaixo do campo numérico — clicar preenche o valor
- Campo livre: o time pode digitar qualquer valor, os chips são só guia visual
- Obrigatório apenas em tasks novas (tasks existentes sem o campo não bloqueiam o save)

---

## Modelo de Workload por Membro

### Métricas calculadas (`MemberWorkloadMetrics`)

| Métrica | Descrição |
|---|---|
| `tasksInProgress` | Tasks ativas atribuídas ao membro |
| `totalActiveSubtasks` | Contagem de subtasks ativas do membro |
| `totalActiveHours` | Soma de horas das subtasks ativas (base do `loadRatio`) |
| `lateCount` | Tasks com `dueDate < hoje` e não concluídas |
| `stuckTasksCount` | Tasks onde `ageHours > expectedHours * 1.5` |
| `avgTaskAgeHours` | Média de horas desde `startedAt` |
| `oldestTaskAgeHours` | Idade da task mais antiga em andamento |
| `throughput7dHours` | Soma de `expectedHours` das tasks concluídas nos últimos 7 dias |
| `throughput14dHours` | Idem, janela de 14 dias |
| `pressureScore` | Score composto 0–1 (ver fórmula abaixo) |
| `estimatedCompletionDate` | Previsão de conclusão baseada no throughput |

### Carga por subtask

Cada subtask tem `start` e `end` (YYYY-MM-DD) e **exatamente 1 responsável** (`assignees[0]`). A carga em horas é calculada pela task-mãe por agrupamento:

```
subtaskHours = businessDaysBetween(start, end) × 8
totalActiveHours = Σ subtaskHours das subtasks ativas do membro
```

Fallback: se `start` ou `end` estiver ausente, usa `8h` (1 dia).

### Fórmula do Pressure Score

```
pressureScore = (loadRatio * 0.5) + (delayFactor * 0.2) + (stuckFactor * 0.2) + (timeFactor * 0.1)

loadRatio    = totalActiveHours / (capacity × 8)   ← horas vs capacidade diária em horas
delayFactor  = min(lateCount * 0.15, 1)
stuckFactor  = min(stuckCount * 0.20, 1)
timeFactor   = min(avgTaskAgeHours / expectedCycleHours, 1)
```

### Status derivado do `pressureScore`

| Score | Status |
|---|---|
| `>= 0.8` | `overloaded` |
| `>= 0.5` | `busy` |
| `< 0.5` | `available` |

### Throughput

```
throughput7dHours = soma de expectedHours das tasks concluídas nos últimos 7 dias
```

Tasks concluídas sem `expectedHours` usam fallback de `1h` para não zerar o histórico.

### Estimativa de conclusão

```
estimatedCompletionDate = hoje + (remainingHours / (throughput7dHours / 7))
```

Retorna `null` quando `throughput7dHours === 0`.

### Detecção de travamento

Uma task é considerada travada quando:
```
startedAt presente  AND  ageHours > expectedHours * 1.5
```

---

## Insights Gerados Automaticamente

| Condição | Mensagem |
|---|---|
| `pressureScore >= 0.8` | "Carga crítica — risco de entrega comprometida." |
| `pressureScore >= 0.6` | "Carga elevada — atenção ao fluxo." |
| `stuckTasksCount > 0` | "X demanda(s) parada(s) além do tempo esperado." |
| `throughput7d === 0 && tasksInProgress > 0` | "Nenhuma entrega nos últimos 7 dias." |
| `estimatedCompletionDate` presente | "Estimativa de conclusão: DD/MM/YYYY." |

---

## Arquivos Afetados

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/20260522000000_task_flow_fields.sql` | NOVO — 5 colunas na tabela `tasks` |
| `src/lib/steps.ts` | `TaskComplexity`, `TaskType`, estender `Task` |
| `src/lib/validators.ts` | `DbTaskRowSchema` com novos campos |
| `src/types/db.ts` | `DbTaskRow` com novos campos |
| `src/lib/queries.ts` | `TASK_SELECT`, `dbRowToTask`, 2 novas funções fetch |
| `src/lib/workloadEngine.ts` | NOVO — engine pura (zero imports React/Supabase) |
| `src/lib/__tests__/workloadEngine.test.ts` | NOVO — testes unitários |
| `src/views/overview/hooks/overviewWorkload.ts` | Reescrita consumindo o engine |
| `src/views/overview/hooks/useOverviewData.ts` | Novas queries de tasks e throughput |
| `src/components/TaskModal/components/TaskSidebar.tsx` | Novos campos no formulário |
| `src/components/TaskModal/hooks/useTaskForm.ts` | Novos estados + dirty check |
| `src/components/workload/CapacityTeam.tsx` | `WorkloadMember` estendido + UI |
| `docs/decisions.md` | ADR-007 |

---

## Ordem de Implementação

```
Fase 1  DB migration        → independente, pode ir a prod sozinha
Fase 2  Tipos de domínio    → aditivo, sem breaking change
Fase 4  Workload engine     → paralela com 2 e 3 (funções puras)
Fase 3  Query layer         → depende de 1 + 2
Fase 5  Hook rewrite        → depende de 3 + 4
Fase 6  TaskModal UI        → depende de 2 + 3
Fase 7  CapacityTeam UI     → ✅ concluída
Fase 8  Testes              → começa após 4, completa após 5–7
Fase 9  ADR                 → escrever junto com 1, finalizar após 8
```
