# MembersView

**Ficheiro:** `src/views/MembersView/MembersView.tsx`

## Responsabilidade

Exibe a equipa ativa em dois níveis hierárquicos fixos (admins acima, users abaixo), com um card por membro mostrando avatar, nome, e-mail, capacidade, role e access_role. As linhas conectoras entre os níveis são desenhadas com SVG medido via `useLayoutEffect`.

## Fonte de dados

- `useMembersQuery(effectiveClientId)` — TanStack Query, dados do Supabase
- `useClients()` — resolve o `effectiveClientId` do cliente selecionado

## Lógica de hierarquia

A view exibe dois níveis fixos:

1. **Admins** (`access_role === 'admin'`) — linha superior, todos com igual importância
2. **Users** (`access_role !== 'admin'`) — linha inferior, todos com igual importância

Membros com `is_active === false` são filtrados antes da renderização.

## Conector SVG

As linhas entre os dois níveis são calculadas com `useLayoutEffect` após o render, medindo as posições reais dos cards via `getBoundingClientRect()`. Lógica:

- Linha vertical descendo do bottom de cada admin até o ponto médio (`midY`)
- Barra horizontal em `midY` abrangendo do admin mais à esquerda ao user mais à direita (só desenhada se há mais de 1 nó no total)
- Linha vertical subindo de `midY` até o top de cada user

O SVG fica posicionado `absolute` sobre o wrapper `relative`, com `pointer-events-none`, `width="100%"` e `overflow: visible` para não cortar linhas nas extremidades. `height` é calculado como `max(uRects.bottom)` relativo ao topo do wrapper. As linhas usam keys derivadas das coordenadas (`x1-y1-x2-y2`) em vez de índice. Cada linha usa `stroke-dasharray` / `stroke-dashoffset` animados via Motion para o efeito de "desenho" na entrada.

Um `ResizeObserver` no `wrapperRef` re-computa as linhas ao redimensionar a janela; o observer é desconectado no cleanup do `useLayoutEffect`.

## Componentes internos

Extraídos para `src/views/MembersView/components/`:

| Componente | Ficheiro | Responsabilidade |
|---|---|---|
| `HierarchyMemberCard` | `HierarchyMemberCard.tsx` | Card hierárquico (`w-64`, `bg-card`, badges de `access_role` e `role`; prop `isAdmin` passada pelo pai mas sem indicador visual extra — diferenciação feita apenas pelo badge). Exibe também `capacity` (ícone `Zap`, quando não-nulo) e `created_at` (ícone `CalendarDays`) |
| `HierarchyAvatar` | `HierarchyAvatar.tsx` | Avatar com `avatar_url`; fallback para iniciais (`bg-muted`, `text-muted-foreground`) |
| `HierarchySkeleton` | `HierarchySkeleton.tsx` | Skeleton de carregamento com forma idêntica à hierarquia (1 admin + 3 users), substituindo o spinner genérico |

> **Nota:** `HierarchyMemberCard` e `HierarchyAvatar` são distintos de `MemberCard` (em `components/MemberCard.tsx`), que é o card de capacidade usado na view de capacidade.

## Animações (Motion)

A view usa `framer-motion` para três camadas de animação, todas desativadas quando `prefers-reduced-motion` está ativo:

1. **Stagger de entrada** — `containerVariants` com `staggerChildren: 0.07`; cada card entra com `y: 20 → 0`, `scale: 0.94 → 1` via `spring(stiffness: 300, damping: 24)`.
2. **Linhas SVG desenhadas** — cada `<motion.line>` usa `stroke-dashoffset` animado de `len → 0` com easing expo e delay escalonado por índice.
3. **Hover magnético** (`HierarchyMemberCard`) — `whileHover: { scale: 1.035 }` + rotação 3D suave via `useMotionValue` + `useSpring` no `onMouseMove`.

## Layout

A view usa `noPadding` no `ViewShell` e define seu próprio fundo e padding, seguindo o mesmo padrão do `ClientOverviewView`: `bg-[oklch(0.955_0.004_250)]` no light / `oklch(0.13_0.008_250)` no dark, com a classe `overview-ambient` para o efeito de gradiente ambiente. O padding interno é `p-4 md:p-6 lg:p-8` com `max-w-screen-xl mx-auto`.

Header (`space-y-5`) com `h2 "Membros"` e subtítulo dinâmico mostrando contagens: "X membros ativos · Y admins · Z colaboradores". Cards de 256 px (`w-64`) com `gap-8` entre eles. As duas rows (admins e users) têm `gap-20` (80 px) entre si para que os conectores SVG tenham espaço suficiente para respirar. Container `overflow-auto` para scroll horizontal.

Cada card exibe: avatar, nome, e-mail (truncado a 160 px), data de entrada no cliente (`created_at` formatada como "mês abrev. ano" em pt-BR, com ícone `CalendarDays`), capacidade (`capacity` com ícone `Zap`, ex: "Capacidade: 6 demandas/sem."), e badges de `access_role` e `role`.

### Token `--card` vs `--background`

Os tokens foram ajustados em `src/index.css` para criar contraste visível entre o card e o fundo da página:

| Modo | `--background` | `--card` |
|---|---|---|
| Light | `oklch(1 0 0)` | `oklch(0.98 0 0)` |
| Dark | `oklch(0.145 0 0)` | `oklch(0.205 0 0)` |
