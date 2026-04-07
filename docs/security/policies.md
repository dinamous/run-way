# Politicas de Seguranca (CORS, Redirect, Sessao)

## CORS por ambiente

As rotas de API usam allowlist de origem. Por padrao, a API aceita:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://homol.capacity-dashboard.com`
- `https://capacity-dashboard.com`

Para customizar, passe `corsAllowedOrigins` ao criar a API (`createTasksApi`).

## Redirect seguro (OAuth)

Antes de redirecionar no login OAuth, a URL e validada por:

1. allowlist de origins (`VITE_REDIRECT_ALLOWED_ORIGINS`)
2. allowlist de paths (`VITE_REDIRECT_ALLOWED_PATHS`)

Se falhar, usa fallback seguro (`<origin-atual>/`).

Exemplo de configuracao:

```env
VITE_REDIRECT_ALLOWED_ORIGINS=http://localhost:5173,https://homol.capacity-dashboard.com,https://capacity-dashboard.com
VITE_REDIRECT_ALLOWED_PATHS=/,/auth/callback
```

## RBAC + permissao em rotas protegidas

Rotas protegidas de tarefas agora exigem:

- usuario autenticado
- role valida (`admin` ou `user`)
- permissao explicita por metodo:
  - `GET`: `tasks:read`
  - `POST`: `tasks:create`
  - `PUT`: `tasks:update`
  - `DELETE`: `tasks:delete`

No frontend, views protegidas tambem validam role + permissao antes de navegar.

## Rate limit por usuario autenticado

O limitador de requisicoes so roda apos autenticacao valida e consome por chave de usuario (`userId`).

## Erros seguros para UI

Mensagens tecnicas (SQL, stack, detalhes de auth) sao convertidas em mensagens seguras para o utilizador final.

Implementado em:

- `src/lib/errorSanitizer.ts`
- `src/hooks/useSupabase.ts`
- `src/views/admin/hooks/useAdminData.ts`
- `src/contexts/AuthContext.tsx`

## Expiracao de sessao

Foi adicionado limite de idade maxima da sessao no cliente com politica minima de 48h.

- variavel: `VITE_SESSION_MAX_AGE_HOURS`
- default: `168` (7 dias)
- valores abaixo de 48h sao ajustados para 48h

Ao exceder o limite, o utilizador e desconectado e orientado a autenticar novamente.
