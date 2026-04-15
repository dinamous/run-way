# TasksView — Lista de Demandas por Etapa

## Visão Geral

View que lista todas as demandas agrupadas pela **etapa atual** (step ativo). Focada em acompanhamento operacional: prazo, responsáveis por etapa, bloqueios e ações rápidas.

Localização: `src/views/tasks/`

## Estrutura de Arquivos

```
src/views/tasks/
  TasksView.tsx                 # componente principal (~115 linhas) — orquestração
  utils.ts                      # formatDueDate
  index.ts                      # barrel export
  components/
    ActionMenu.tsx              # dropdown de ações (shadcn DropdownMenu)
    TaskRow.tsx                 # linha de uma demanda
    StepGroup.tsx               # grupo colapsável por etapa
    TasksFilters.tsx            # barra de filtros (shadcn Select)
```

Todos os subcomponentes são privados da view (co-located) pois não são usados em outro lugar.

## Subcomponentes

### `StepGroup`
Agrupa tasks por `StepType`. Colapsa/expande via `ChevronDown`/`ChevronRight`.

Recebe `hasActiveFilters?: boolean`. Comportamento por estado:
- **Com tasks:** expansível normalmente, cabeçalho com contador colorido
- **Vazio + filtros ativos:** cabeçalho apagado (contador `0`), mensagem de filtro em itálico, botão de expansão oculto
- **Vazio sem filtros:** renderizado normalmente com contador `0` — todas as 8 categorias são sempre exibidas

### `TaskRow`
Linha de uma demanda. A div inteira é clicável (chama `onEdit`) — o `ActionMenu` tem `stopPropagation` para não conflitar.

Exibe:
- Título com risco (`line-through`) quando bloqueada
- Ícone `Link2` inline ao lado do título para abrir o ClickUp diretamente
- Badge "Bloqueada" (vermelho) quando `task.status.blocked` — fundo da linha fica vermelho sutil
- Badge "Concluída" (muted) quando `task.concludedAt` — linha com opacidade reduzida
- Badge de prazo dinâmico (relativo a hoje) baseado no `end` do step ativo
- Avatares dos responsáveis **do step correspondente ao grupo** onde a task é exibida (recebe `stepType` via prop) — usa `bg-primary text-primary-foreground` (sólido)
- Menu de ações (`ActionMenu`)

### `ActionMenu`
Usa `DropdownMenu` / `DropdownMenuItem` do shadcn (`src/components/ui/DropdownMenu.tsx`). Ações:
- **Abrir demanda** — chama `onEdit(task)`
- **Abrir no ClickUp** — link externo (só aparece se `task.clickupLink` existe)
- **Concluir etapa** — chama `onConclude(task)` (oculto se já concluída)
- **Sinalizar bloqueio / Desbloquear** — chama `onToggleBlock(task)`

Não requer `useRef`/`useEffect` — o fechamento é gerenciado pelo Radix via `DropdownMenu`.

### `TasksFilters`
Barra de filtros extraída em componente próprio. Recebe `FiltersState` + `onChange: (next: Partial<FiltersState>) => void`. Usa:
- `Select` / `SelectTrigger` / `SelectItem` do shadcn para etapa e responsável
- Tabs de período customizadas (botões simples)
- Toggle de bloqueadas
- Botão "Limpar" em container de largura fixa (`w-[68px]`) para evitar layout shift ao aparecer/desaparecer

O estado dos filtros é um único objeto `FiltersState` no `TasksView`, com `EMPTY_FILTERS` como constante de reset.

## Badge de Prazo (`formatDueDate`)

Utilitário local que compara `step.end` com hoje:

| Condição | Label | Cor |
|---|---|---|
| `diffDays < 0` | "Atrasada Xd" | vermelho |
| `diffDays === 0` | "Vence hoje" | amarelo |
| `diffDays === 1` | "Vence amanhã" | azul |
| `diffDays >= 2` | "Em X dias" | muted |

## Ordenação

Dentro de cada grupo de etapa, as tasks são ordenadas pelo `end` do step correspondente — da mais atrasada para a mais recente. Tasks sem data de vencimento ficam no final.

## Filtros

| Filtro | Implementação |
|---|---|
| Busca por texto/ID | `task.title` e `task.id` case-insensitive |
| Etapa | `currentStep.type === selectedStep` |
| Responsável | `member.id` — verifica em todos os steps da tarefa |
| Período (prazo) | Tabs "Todos / 7d / 15d / 30d" — compara `currentStep.end` com `today + N dias` |
| Bloqueadas | Toggle — filtra `task.status.blocked === true` |

"Etapa atual" para fins de filtro é resolvida como `task.steps.find(s => s.active) ?? task.steps[0]`. Para agrupamento na listagem, uma task aparece em **todas** as categorias cujos steps estão `active: true` (podendo aparecer em múltiplas colunas simultaneamente).

## Props

```ts
interface TasksViewProps {
  onEdit: (task: Task) => void;   // abre TaskModal no modo edição
  onOpenNew: () => void;          // abre TaskModal para nova tarefa
}
```

## Dados

- **Tasks:** `useTaskStore` → `fetchTasks(effectiveClientId, isAdmin)`
- **Members:** `useMemberStore` → `fetchMembers(effectiveClientId)`
- **Client:** `useClients()` → `effectiveClientId`

Mutations vão direto ao Supabase (tabela `tasks`), depois chamam `invalidate()` + `fetchTasks()` para recarregar.

### Cache de tasks (`useTaskStore`)

Cache key é `"${clientId ?? 'all'}:${isAdmin}"` — invalida automaticamente quando `isAdmin` muda sem mudança de `clientId`. Antes era baseado só em `cachedClientId`.

### Fetch de membros (`useMemberStore`)

Para um `clientId` específico, busca todos os membros vinculados via `user_clients` — essa é a fonte de verdade de quem pertence ao cliente. Todos esses membros aparecem nos filtros e avatares, independentemente de terem tasks atribuídas.

| Ação | Campo atualizado |
|---|---|
| Bloquear | `blocked = true`, `blocked_at = today` |
| Desbloquear | `blocked = false`, `blocked_at = null` |
| Concluir | `concluded_at = now`, `concluded_by = member.auth_user_id` |
