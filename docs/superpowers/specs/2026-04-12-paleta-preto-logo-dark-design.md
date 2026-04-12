# Design: Paleta Preto + Logo Invertido no Dark Mode

**Data:** 2026-04-12  
**Status:** Aprovado

## Objetivo

Trocar a cor primária da aplicação de azul para preto, mantendo coerência com o branding do logo (que já usa `bg-black`). No tema dark, inverter as cores do logo no header para que o ícone continue contrastando com o fundo.

## Escopo

- Apenas `--primary`, `--primary-foreground` e `--ring` em `src/index.css`
- Apenas o bloco do ícone do logo em `src/components/AppHeader.tsx`
- Fases coloridas (Design, Approval, Dev, QA) **não são alteradas**

## Mudanças

### `src/index.css`

| Token | Antes (light) | Depois (light) |
|---|---|---|
| `--primary` | `oklch(0.546 0.185 264.1)` (azul) | `oklch(0.145 0 0)` (preto) |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(1 0 0)` (sem mudança) |
| `--ring` | `oklch(0.546 0.185 264.1)` (azul) | `oklch(0.145 0 0)` (preto) |

| Token | Antes (dark) | Depois (dark) |
|---|---|---|
| `--primary` | `oklch(0.623 0.214 259.815)` (azul) | `oklch(0.985 0 0)` (branco) |
| `--primary-foreground` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` (sem mudança) |
| `--ring` | `oklch(0.623 0.214 259.815)` (azul) | `oklch(0.985 0 0)` (branco) |

### `src/components/AppHeader.tsx`

O bloco do logo usa classes fixas `bg-black` e `text-white`. No dark mode o fundo já é escuro, então a box preta se perde.

**Antes:**
```tsx
<div className="bg-black p-2 rounded-lg">
  <LayoutDashboard className="w-5 h-5 text-white" />
</div>
```

**Depois:**
```tsx
<div className="bg-black dark:bg-white p-2 rounded-lg">
  <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
</div>
```

Usa Tailwind dark variant — sem prop extra, sem lógica JS.
