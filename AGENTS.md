# AGENTS.md — Capacity Dashboard

Consultar [CLAUDE.md](CLAUDE.md) para contexto completo. Este ficheiro é para agentes/subagentes.

**Stack:** React 19 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4 · Supabase

```bash
npm run dev       # localhost:5173
npm run build     # tsc + vite build
npm run lint      # ESLint
```

## Regras

- UI em PT-BR, código em inglês
- Datas: `YYYY-MM-DD`, parse com `new Date(str + 'T00:00:00')`
- Commits: Conventional Commits + gitmoji, português
- Usar `src/components/ui/` antes de criar novos
- Sem abstrações prematuras
- Consultar `docs/` para detalhes de implementação antes de modificar
