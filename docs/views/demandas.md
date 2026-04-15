# DemandasView — Lista de Demandas por Etapa

## Visão Geral

View que lista todas as demandas agrupadas pela **etapa atual** (step ativo). Focada em acompanhamento operacional: prazo, responsáveis por etapa, bloqueios e ações rápidas.

Localização: `src/views/demandas/`

## Estrutura de Arquivos

```
src/views/demandas/
  DemandasView.tsx              # componente principal (~115 linhas) — orquestração
  utils.ts                      # formatDueDate
  index.ts                      # barrel export
  components/
    ActionMenu.tsx              # dropdown de ações (shadcn DropdownMenu)
    TaskRow.tsx                 # linha de uma demanda
    StepGroup.tsx               # grupo colapsável por etapa
    DemandasFilters.tsx         # barra de filtros (shadcn Select)
```

Todos os subcomponentes são privados da view (co-located) pois não são usados em outro lugar.

## Subcomponentes

### `StepGroup`
Agrupa tasks por `StepType`. Colapsa/expande via `ChevronDown`/`ChevronRight`. Grupos vazios após filtro são ocultados.

### `TaskRow`
Linha de uma demanda. Exibe:
- Título com risco (`line-through`) quando bloqueada
- Ícone `Link2` inline ao lado do título para abrir o ClickUp diretamente
- Badge "Bloqueada" (vermelho) quando `task.status.blocked`
- Badge de prazo dinâmico (relativo a hoje) baseado no `end` do step ativo
- Avatares dos responsáveis **apenas do step atual** (não globais da tarefa)
- Menu de ações (`ActionMenu`)

### `ActionMenu`
Usa `DropdownMenu` / `DropdownMenuItem` do shadcn (`src/components/ui/DropdownMenu.tsx`). Ações:
- **Abrir demanda** — chama `onEdit(task)`
- **Abrir no ClickUp** — link externo (só aparece se `task.clickupLink` existe)
- **Concluir etapa** — chama `onConclude(task)` (oculto se já concluída)
- **Sinalizar bloqueio / Desbloquear** — chama `onToggleBlock(task)`

Não requer `useRef`/`useEffect` — o fechamento é gerenciado pelo Radix via `DropdownMenu`.

### `DemandasFilters`
Barra de filtros extraída em componente próprio. Recebe `FiltersState` + `onChange: (next: Partial<FiltersState>) => void`. Usa:
- `Select` / `SelectTrigger` / `SelectItem` do shadcn para etapa e responsável
- Tabs de período customizadas (botões simples)
- Toggle de bloqueadas

O estado dos filtros é um único objeto `FiltersState` no `DemandasView`, com `EMPTY_FILTERS` como constante de reset.

## Badge de Prazo (`formatDueDate`)

Utilitário local que compara `step.end` com hoje:

| Condição | Label | Cor |
|---|---|---|
| `diffDays < 0` | "Atrasada Xd" | vermelho |
| `diffDays === 0` | "Vence hoje" | amarelo |
| `diffDays === 1` | "Vence amanhã" | azul |
| `diffDays >= 2` | "Em X dias" | muted |

## Filtros

| Filtro | Implementação |
|---|---|
| Busca por texto/ID | `task.title` e `task.id` case-insensitive |
| Etapa | `currentStep.type === selectedStep` |
| Responsável | `member.id` — verifica em todos os steps da tarefa |
| Período (prazo) | Tabs "Todos / 7d / 15d / 30d" — compara `currentStep.end` com `today + N dias` |
| Bloqueadas | Toggle — filtra `task.status.blocked === true` |

"Etapa atual" é resolvida como `task.steps.find(s => s.active) ?? task.steps[0]`.

## Props

```ts
interface DemandasViewProps {
  onEdit: (task: Task) => void;   // abre TaskModal no modo edição
  onOpenNew: () => void;          // abre TaskModal para nova tarefa
}
```

## Dados

- **Tasks:** `useTaskStore` → `fetchTasks(effectiveClientId, isAdmin)`
- **Members:** `useMemberStore` → `fetchMembers(effectiveClientId)`
- **Client:** `useClients()` → `effectiveClientId`

Mutations vão direto ao Supabase (tabela `tasks`), depois chamam `invalidate()` + `fetchTasks()` para recarregar.

| Ação | Campo atualizado |
|---|---|
| Bloquear | `blocked = true`, `blocked_at = today` |
| Desbloquear | `blocked = false`, `blocked_at = null` |
| Concluir | `concluded_at = now`, `concluded_by = member.auth_user_id` |
