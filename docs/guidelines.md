# Convenções e Padrões

## Idioma
- **UI:** Português (PT-BR)
- **Código/variáveis:** Inglês
- **Commits:** Português, Conventional Commits + gitmoji (`feat: :sparkles:`, `fix: :bug:`, `perf: :zap:`)

## Datas
- Formato: `YYYY-MM-DD`
- Parse seguro: `new Date(str + 'T00:00:00')` — evita problemas UTC vs local
- Helper: `toLocalDate(str)` nas views

## TypeScript
- `any` intencional em dados vindos do Supabase/Drive sem schema fixo — não tipar forçadamente
- Não criar tipos/interfaces para uso único

## Componentes
- Funcionais com hooks
- Sem abstrações prematuras — 3 linhas similares > helper desnecessário
- Estado global em `App.tsx`; estado local no componente
- Usar `src/components/ui/` antes de criar componentes novos

## Estilização
- Tailwind CSS v4 — config via plugin Vite, sem `tailwind.config.js`
- Print: header e controlos com `print:hidden`
- **Tailwind primeiro:** toda estilização deve usar classes Tailwind no `className`. CSS global em `src/index.css` só é permitido para:
  1. Tokens de design (variáveis CSS `--*`) em `@layer base` e `@theme inline`
  2. `@keyframes` e classes de animação que dependem deles (ex: `.overview-item-enter`). Animações simples usam `animation-[nome_duração_easing_forwards]` inline via Tailwind arbitrary values (ex: `animation-[blur-fade-in_300ms_ease-out_forwards]`)
  3. Pseudo-elementos (`::after`/`::before`) com hover/transition que Tailwind não consegue expressar (ex: `.view-breadcrumb-ancestor::after`)
  4. Classes com `radial-gradient` ou valores `oklch` precisos fora dos tokens mapeados (ex: `.overview-ambient`, `.view-ink-strip`, `.overview-card`, `.app-header`, `.app-header-logo-box`, `.app-header-wordmark`). Dentro dessas classes, **todas as propriedades expressáveis em Tailwind** (position, inset, z-index, border-radius, pointer-events, etc.) devem ser movidas para o elemento via `className` — o CSS guarda só o que não tem equivalente Tailwind
  5. `@media (prefers-reduced-motion)` aplicado a keyframes globais
- Nunca adicionar CSS global para estilos que são expressáveis com classes Tailwind (cores, spacing, typography, flex, grid, shadow, border, etc.)
- Valores `oklch` hardcoded no CSS devem ser promovidos a tokens em `:root`/`.dark` e mapeados no `@theme inline` — use `var(--*)` no corpo das classes, não oklch inline. Exceção: gradientes com alfa variável (`oklch(... / 0.5)`) e sombras pretas/brancas puras sem semântica de token

### Tokens cromáticos (`src/index.css`)

Além dos tokens base do design system, existem tokens de superfície com matiz azul-acinzentada (`250`/`255`) usados nas views de overview e no breadcrumb:

| Token | Classe Tailwind | Uso |
|---|---|---|
| `--surface-tinted` | `bg-surface-tinted` | Background do AppHeader e do ink strip (ViewShell) — superfície contínua |
| `--surface-tinted-card` | `bg-surface-tinted-card` | Background dos overview cards |
| `--border-tinted` | `border-border-tinted` | Borda dos overview cards |
| `--border-strip` | — | Sombra/borda inferior do ink strip (só via CSS) |
| `--text-crumb` | `text-text-crumb` | Cor do breadcrumb ancestor |
| `--text-crumb-hover` | `text-text-crumb-hover` | Cor do breadcrumb no hover |
| `--text-crumb-current` | `text-text-crumb-current` | Cor do breadcrumb current |

## Segurança

### Content Security Policy (CSP)
Configurada em `vite.config.ts` via `server.headers` para o dev server:

```
default-src 'self'
connect-src 'self' https://*.supabase.co
script-src  'self' 'unsafe-inline'
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com
font-src    'self' https://fonts.gstatic.com
img-src     'self' data: https:
```

**Em produção** os headers devem ser replicados na plataforma de hospedagem (Vercel `vercel.json`, Netlify `_headers`, etc.) — o `server.headers` do Vite só se aplica ao dev server.

## Variáveis de Ambiente
```bash
VITE_GOOGLE_CLIENT_ID=...   # Google OAuth 2.0 Client ID
VITE_SUPABASE_URL=...       # Supabase project URL
VITE_SUPABASE_ANON_KEY=...  # Supabase anon key
```
Ficheiro `.env` na raiz. **Nunca commitar.**
