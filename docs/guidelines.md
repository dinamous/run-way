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

## Variáveis de Ambiente
```bash
VITE_GOOGLE_CLIENT_ID=...   # Google OAuth 2.0 Client ID
VITE_SUPABASE_URL=...       # Supabase project URL
VITE_SUPABASE_ANON_KEY=...  # Supabase anon key
```
Ficheiro `.env` na raiz. **Nunca commitar.**
