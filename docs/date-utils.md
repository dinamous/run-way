# Utilitários de Datas — `src/utils/dateUtils.ts`

Todas as funções trabalham com datas no formato `YYYY-MM-DD` (string) ou objetos `Date`.

## Funções Exportadas

### `formatDate(date: Date | string): string`
Converte um `Date` ou string para `YYYY-MM-DD`.

```ts
formatDate(new Date('2025-03-15')) // "2025-03-15"
```

---

### `addBusinessDays(startDate: Date | string, daysToAdd: number): string`
Avança `daysToAdd` dias úteis a partir de `startDate`. Ignora sábados e domingos.

- Com `daysToAdd = 0`: devolve o próprio dia (ou o próximo dia útil se for fim de semana)
- A duração é **inclusiva**: `addBusinessDays('2025-01-01', 5)` retorna o 5.º dia útil a partir de 1 de Janeiro

```ts
addBusinessDays('2025-01-06', 5) // Semana de 6 a 10 Jan = "2025-01-10"
```

---

### `nextBusinessDay(date: Date | string): string`
Retorna o **próximo** dia útil após a data dada (nunca o mesmo dia).

```ts
nextBusinessDay('2025-01-10') // "2025-01-13" (pula fim de semana)
```

---

### `businessDaysBetween(start: string, end: string): number`
Conta o número de dias úteis entre `start` e `end`, **inclusive** em ambos. Mínimo de 1.

```ts
businessDaysBetween('2025-01-06', '2025-01-10') // 5
```

---

### `cascadePhases(startDesignDate: Date | string)`
Gera automaticamente as 4 fases a partir de uma data de início de Design, usando as durações padrão.

**Retorna:**
```ts
{
  design:   { start: string; end: string },
  approval: { start: string; end: string },
  dev:      { start: string; end: string },
  qa:       { start: string; end: string },
}
```

**Lógica de encadeamento:**
1. Design: `[startDesignDate, startDesignDate + 5 dias úteis]`
2. Approval: `[próximo dia útil após design.end, + 3 dias úteis]`
3. Dev: `[próximo dia útil após approval.end, + 7 dias úteis]`
4. QA: `[próximo dia útil após dev.end, + 3 dias úteis]`

---

## `DEFAULT_DURATIONS`

```ts
export const DEFAULT_DURATIONS = {
  design:   5,
  approval: 3,
  dev:      7,
  qa:       3
};
```

---

## Atenção: Timezone

As funções criam `new Date(str)` internamente. No `DashboardView.tsx`, as datas são sempre parseadas com `new Date(str + 'T00:00:00')` para forçar hora local e evitar problemas de UTC vs. local.

Ao adicionar novas funções que usem `new Date(dateString)`, usar sempre o sufixo `'T00:00:00'` para strings no formato `YYYY-MM-DD`.
