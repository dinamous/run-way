# Design Spec: View Lista de Demandas

**Data:** 2026-04-08  
**Status:** Aprovado

---

## Objetivo

Adicionar uma terceira tab "Lista" no Dashboard, que exibe todas as demandas agrupadas por mês (futuro → passado), com filtros de período, assignee e status, e actions rápidas de concluir/bloquear/excluir por linha.

---

## Arquitetura

### Integração no DashboardView

- `calView` passa a ser `'calendar' | 'timeline' | 'list'`
- `DashboardHeader` ganha botão "Lista" (ícone `List` do lucide)
- Quando `calView === 'list'`, renderiza `<ListView>` no lugar de Calendar/Timeline
- `FilterBar` existente **não** é exibido na view Lista (ela tem seu próprio `ListHeader`)

### Estrutura de arquivos

```
src/views/list/
  index.ts
  ListView.tsx
  hooks/
    useListFilters.ts
  components/
    ListHeader.tsx     # filtros de período / assignee / status
    MonthGroup.tsx     # cabeçalho do mês + lista de demandas
    DemandRow.tsx      # linha da demanda com actions
```

---

## Modelo de Dados

### Novas colunas em `tasks` (Supabase)

```sql
ALTER TABLE tasks ADD COLUMN concluded_at timestamptz;
ALTER TABLE tasks ADD COLUMN concluded_by uuid REFERENCES auth.users(id);
```

### Tipo `Task` (`src/types/task.ts`)

Adicionar campos opcionais:
```ts
concluded_at?: string;   // ISO timestamp
concluded_by?: string;   // UUID do usuário
```

---

## UI e Layout

### Agrupamento por mês

Ordenação: **futuro no topo → passado embaixo**.  
O mês atual recebe badge visual "Atual".

```
── Junho 2026 (2 demandas) ──────────────
── Maio 2026 (4 demandas) ───────────────
── Abril 2026 ● Atual (3 demandas) ──────
── Março 2026 (5 demandas) ──────────────
── Janeiro 2026 (1 demanda) ─────────────
```

Meses sem demandas **não** são exibidos.

### Critério de agrupamento

A demanda é alocada no mês em que sua **data de referência** cai:
- Data de referência = fim do último step ativo com `end` preenchido
- Fallback: `createdAt`

### DemandRow — colunas (esquerda → direita)

| Campo | Detalhes |
|---|---|
| Nome | Clicável → abre modal de edição (`onEdit`) |
| Link ClickUp | Ícone com `href` externo; só aparece se `clickupLink` preenchido |
| Criado em | `createdAt` formatado como `DD/MM` |
| Previsto | Data de referência formatada como `DD/MM/AAAA` |
| Assignees | Avatares/iniciais dos membros de todos os steps ativos |
| Status | Badge reutilizando componente existente |
| Actions | Botões icon-only: Concluir · Bloquear · Excluir |

### Actions

- **Concluir** (ícone check): atualiza `status = 'concluído'`, grava `concluded_at = now()` e `concluded_by = user.id` direto no Supabase, sem modal. Invalida store após sucesso.
- **Bloquear** (ícone lock): toggle — se não bloqueado, seta `status = 'bloqueado'`; se já bloqueado, reverte para status anterior (armazenado localmente antes do toggle).
- **Excluir** (ícone trash): chama `onDelete(task)` existente.

---

## Filtros (`ListHeader`)

| Filtro | Opções | Default |
|---|---|---|
| Período | 2 / 3 / 4 / 6 / 12 meses | 3 meses |
| Assignee | Select com membros | Todos |
| Status | Select com status | Todos |

O período define o range: `[hoje − N meses, hoje + N meses]`.  
Demandas cuja data de referência cai fora do range são ocultadas.

---

## Hook `useListFilters`

**Localização:** `src/views/list/hooks/useListFilters.ts`

**Estado:**
- `filterPeriodMonths: number` (default 3)
- `filterAssignee: string` (default `''`)
- `filterStatus: string` (default `''`)

**Saída:**
- `groupedTasks: Map<string, NormalisedTask[]>` — chave `'YYYY-MM'`, ordenado futuro→passado
- `rangeStart`, `rangeEnd` — datas do range ativo
- setters e `clearFilters`

---

## Integração com Relatórios e Audit

Os campos `concluded_at` e `concluded_by` ficam disponíveis na tabela `tasks` para uso futuro nos relatórios. A view Lista não implementa os relatórios — apenas persiste os dados necessários.

---

## Fora de Escopo

- Implementação dos relatórios que consomem `concluded_at`/`concluded_by`
- Paginação (período como filtro é suficiente)
- Drag-and-drop na lista
