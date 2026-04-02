# MembersView

**Ficheiro:** `src/views/MembersView.tsx`

## Props

```ts
interface MembersViewProps {
  tasks: (Task | LegacyTask)[];
  members: Member[];
}
```

## Responsabilidade

Exibe um card por membro com indicador de carga atual (steps ativos hoje) e lista de demandas alocadas.

## Normalização de Tasks

Todas as tasks passam por `normalizeTask()` antes do processamento:

```ts
function normalizeTask(task: Task | LegacyTask): Task
```

Usa `migrateLegacyTask` para converter tasks no formato antigo (fases `design/approval/dev/qa`) para o modelo de steps. Garante que `task.steps` e `task.status` estejam no formato correto independente da origem dos dados.

## Lógica de Capacidade

Para cada membro, coleta todos os steps onde:
- `step.active === true`
- `step.start` e `step.end` existem
- `step.assignees.includes(member.id)`

A **carga atual** (`activeCount`) é o subconjunto desses steps cujo intervalo inclui hoje (`step.start <= today && step.end >= today`).

| `activeCount` | Status | Cor do badge |
|---|---|---|
| 0 | Capacidade Livre | Verde (`bg-green-500`) |
| 1–3 | Alocado | Azul (`bg-blue-500`) |
| >3 | Sobrecarregado | Vermelho (`bg-red-500`) |

## Agrupamento por Task

Após coletar os steps do membro, agrupa por `task.id` usando um `Map<string, { task, steps[] }>`. Cada entry representa uma demanda com todos os seus steps atribuídos ao membro.

## Layout do Card

```
┌──────────────────────────────────────────────────────┐
│  [Avatar]  Nome                         [Badge status]│
│            Role                                       │
│                                                       │
│  Demandas com steps (N) — X steps ativos hoje         │
│  ┌────────────────────────────────────────────────┐   │
│  │ ● Título da task                   [Bloqueado] │   │
│  │   [TAG] [TAG] [TAG]                            │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

- **Avatar:** iniciais do membro (`member.avatar`) em círculo cinza
- **Indicador de step:** bolinha colorida via `STEP_META[currentStep.type].dot`; vermelha se bloqueado
- **Tags de step:** `STEP_META[step.type].tag` com cor condicional:
  - Step bloqueado (`step.start >= status.blockedAt`): vermelho
  - Step ativo hoje: cor do tipo (`meta.color`) com borda
  - Step fora do intervalo atual: muted
- **Tooltip de cada tag:** `"YYYY-MM-DD → YYYY-MM-DD"` via `title`

## Dependências Internas

| Import | Uso |
|---|---|
| `STEP_META` | Metadados de cor, tag e dot por tipo de step |
| `migrateLegacyTask` | Converte tasks antigas para o modelo de steps |
| `getCurrentStep` | Retorna o step ativo no dia fornecido |
| `Badge` (`@/components/ui`) | Badge de status do membro |
| `MembersViewProps` (`@/types/props`) | Tipagem das props |

## Notas

- `todayStr()` gera a data atual em `YYYY-MM-DD` sem depender de timezone (usa `getFullYear/getMonth/getDate`)
- O grid é `md:grid-cols-2` — dois cards por linha em telas médias
- `normalizeTask` é chamada duas vezes para cada entry da lista (coleta + renderização) — não há impacto perceptível dado o volume esperado de dados
