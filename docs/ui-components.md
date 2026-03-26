# Design System — `src/components/ui/`

Componentes básicos reutilizáveis. Importar via barrel:

```ts
import { Button, Input, Label, Badge } from '../components/ui';
```

---

## Button

```tsx
<Button variant="primary" type="submit">Salvar</Button>
```

| Variant | Aparência |
|---------|-----------|
| `primary` (padrão) | Fundo azul (`bg-blue-600`) |
| `secondary` | Fundo cinza (`bg-slate-600`) |
| `outline` | Borda cinza, fundo transparente |
| `destructive` | Fundo vermelho (`bg-red-600`) |
| `ghost` | Sem borda, hover cinza claro |

Aceita todos os atributos HTML `<button>` (incluindo `form`, `type`, `disabled`, etc.).

---

## Input

```tsx
<Input
  id="title"
  type="text"
  value={value}
  onChange={e => setValue(e.target.value)}
  placeholder="Placeholder..."
/>
```

Wrapper fino sobre `<input>` com classes Tailwind pré-definidas. Aceita todos os atributos HTML `<input>`.

---

## Label

```tsx
<Label htmlFor="title">Título</Label>
```

Wrapper sobre `<label>` com estilo `text-sm font-medium text-slate-700`. Inclui estilo `peer-disabled` para inputs desabilitados.

---

## Badge

```tsx
<Badge variant="design">Design</Badge>
```

| Variant | Cor | Uso típico |
|---------|-----|------------|
| `default` | Cinza | Estado genérico |
| `design` | Azul | Fase de Design |
| `approval` | Amarelo | Fase de Aprovação |
| `dev` | Roxo | Fase de Dev |
| `qa` | Verde | Fase de QA |

---

## Notas

- Todos os componentes são puramente visuais, sem lógica de negócio
- Tailwind v4 — usar classes utilitárias diretamente; sem `tailwind.config.js`
- Não criar novos componentes UI para uso único — usar as classes Tailwind diretamente no JSX
