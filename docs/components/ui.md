# Design System — `src/components/ui/`

Import via barrel: `import { Button, Input, Label, Badge } from '../components/ui'`

## Button
Variants: `primary` (preto/branco — segue `--primary`), `secondary` (cinza), `outline`, `destructive` (vermelho), `ghost`. Aceita todos attrs HTML `<button>`.

## Input
Wrapper sobre `<input>` com classes Tailwind. Aceita todos attrs HTML `<input>`.

## Label
Wrapper sobre `<label>` com `text-sm font-medium text-slate-700` + `peer-disabled`.

## Badge
Variants: `default` (cinza), `design` (azul), `approval` (amarelo), `dev` (roxo), `qa` (verde).

## Tabs
Wrapper sobre Radix `TabsPrimitive`. Exports: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

`TabsList` e `TabsTrigger` aceitam prop `variant`:
- `default` — fundo `bg-muted`, trigger com sombra quando ativo
- `underline` — borda inferior; trigger com `border-b-2` + hover suave no inativo
- `pills` — trigger com `bg-primary` quando ativo

`TabsTrigger` sempre tem `cursor-pointer` na base.

## ViewTabs
Componente leve **sem Radix** para grupos de botões estilo tab (`src/components/ui/ViewTabs.tsx`).

```tsx
import { ViewTabs, type ViewTab } from '@/components/ui/ViewTabs'

const TABS: readonly ViewTab<string>[] = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]

<ViewTabs tabs={TABS} value={active} onChange={setActive} />
```

Usar quando o conteúdo a alternar **não precisa** de acessibilidade de tabs do Radix (ex: filtros rápidos inline). Para navegação de views principais, preferir `Tabs` + Radix.

**Regra:** Não criar novos componentes UI para uso único — usar Tailwind diretamente.

## CardShell

Wrapper reutilizável para cards com carregamento independente. Centraliza os estados de loading (skeleton), erro e timeout por card/seção.

```tsx
import { CardShell } from '@/components/ui'

<CardShell
  loading={section.loading}
  error={section.error}
  onRetry={section.retry}
  skeleton={<MySkeleton />}
  timeoutMs={12000}
>
  <MyCard data={section.data} />
</CardShell>
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `loading` | `boolean` | — | Mostra `skeleton` enquanto verdadeiro |
| `error` | `string \| null` | — | Exibe estado de erro quando não nulo |
| `onRetry` | `() => void` | — | Exibe botão "Tentar novamente" quando fornecido |
| `skeleton` | `ReactNode` | — | Conteúdo exibido durante `loading` |
| `children` | `ReactNode` | — | Conteúdo exibido quando carregado |
| `timeoutMs` | `number` | `12000` | ms até mostrar "Tempo esgotado ao carregar" |
| `className` | `string` | `''` | Classes extras para o container de erro |

**Comportamento:**
- `loading=true` → renderiza `skeleton`
- `loading=true` por mais de `timeoutMs` ms → exibe estado de erro "Tempo esgotado"
- `error` não nulo → exibe `AlertCircle` + mensagem + botão retry
- `loading=false` e sem erro → renderiza `children`

Projetado para uso com `useClientSection` (ou qualquer hook que retorne `{ loading, error, retry }`).
