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

**Regra:** Não criar novos componentes UI para uso único — usar Tailwind diretamente.
