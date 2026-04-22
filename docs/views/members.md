# MembersView

**Ficheiro:** `src/views/MembersView/MembersView.tsx`

## Responsabilidade

Exibe a equipa ativa em dois níveis hierárquicos fixos (admins acima, users abaixo), com um card por membro mostrando avatar, nome, e-mail, role e access_role. As linhas conectoras entre os níveis são desenhadas com SVG medido via `useLayoutEffect`.

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

O SVG fica posicionado `absolute` sobre o wrapper `relative`, com `pointer-events-none`.

## Componentes internos

| Componente | Responsabilidade |
|---|---|
| `MemberCard` | Renderiza o card de um membro (`w-56`, `bg-card`, badges de role e access_role) |
| `Avatar` | Avatar com `avatar_url` quando disponível; fallback para iniciais (`bg-muted`, `text-muted-foreground`) |

## Layout

Header padrão (`space-y-5`, igual a `TasksView`) com `h2 "Membros"` e subtítulo. Cards de 288 px (`w-72`) com `gap-8` entre eles. Container `overflow-auto` para scroll horizontal.

Cada card exibe: avatar, nome, e-mail (sem truncamento), data de entrada no cliente (`created_at` formatada como "mês abrev. ano" em pt-BR, com ícone `CalendarDays`), e badges de `access_role` e `role`.

### Token `--card` vs `--background`

Os tokens foram ajustados em `src/index.css` para criar contraste visível entre o card e o fundo da página:

| Modo | `--background` | `--card` |
|---|---|---|
| Light | `oklch(1 0 0)` | `oklch(0.98 0 0)` |
| Dark | `oklch(0.145 0 0)` | `oklch(0.205 0 0)` |
