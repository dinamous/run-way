# Paleta Preto + Logo Invertido no Dark Mode — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a cor primária da aplicação de azul para preto e inverter as cores do logo no header quando o tema dark estiver ativo.

**Architecture:** Duas mudanças isoladas e independentes: (1) tokens CSS em `index.css` e (2) classes Tailwind condicionais no `AppHeader.tsx`. Nenhuma lógica JS nova é necessária — o dark mode já está configurado via classe `.dark` no `<html>`.

**Tech Stack:** Tailwind CSS v4, React 19, TypeScript, oklch color space

---

### Task 1: Trocar tokens --primary e --ring de azul para preto

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Alterar tokens no light mode**

Em `src/index.css`, dentro de `:root`, trocar:

```css
/* ANTES */
--primary: oklch(0.546 0.185 264.1);
--primary-foreground: oklch(1 0 0);
--ring: oklch(0.546 0.185 264.1);

/* DEPOIS */
--primary: oklch(0.145 0 0);
--primary-foreground: oklch(1 0 0);
--ring: oklch(0.145 0 0);
```

- [ ] **Step 2: Alterar tokens no dark mode**

Em `src/index.css`, dentro de `.dark`, trocar:

```css
/* ANTES */
--primary: oklch(0.623 0.214 259.815);
--primary-foreground: oklch(0.145 0 0);
--ring: oklch(0.623 0.214 259.815);

/* DEPOIS */
--primary: oklch(0.985 0 0);
--primary-foreground: oklch(0.145 0 0);
--ring: oklch(0.985 0 0);
```

- [ ] **Step 3: Verificar visualmente no browser**

Rodar `npm run dev` e abrir `http://localhost:5173`.

Verificar em light mode:
- Avatar do usuário no header deve ser preto (antes era azul)
- Ring/focus em inputs e botões deve ser preto

Verificar em dark mode (toggle no header):
- Avatar do usuário deve ser branco
- Ring/focus deve ser branco

---

### Task 2: Inverter cores do logo no dark mode

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Trocar classes fixas por classes com dark variant**

Em `src/components/AppHeader.tsx`, linha 63-65, trocar:

```tsx
/* ANTES */
<div className="bg-black p-2 rounded-lg">
  <LayoutDashboard className="w-5 h-5 text-white" />
</div>

/* DEPOIS */
<div className="bg-black dark:bg-white p-2 rounded-lg">
  <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
</div>
```

- [ ] **Step 2: Verificar visualmente no browser**

Com `npm run dev` rodando, verificar em `http://localhost:5173`:

Light mode:
- Logo box deve ser preta com ícone branco (comportamento atual, sem regressão)

Dark mode (toggle no header):
- Logo box deve ser branca com ícone preto
- O texto "Run/Way" ao lado deve permanecer visível (usa `text-foreground`, adapta automaticamente)
