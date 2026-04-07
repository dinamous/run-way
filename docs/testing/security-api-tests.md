# Testes de Seguranca das APIs

## Objetivo

Esta suite cobre a camada de API com foco em seguranca para as rotas atuais de tarefas (`/api/tasks` e `/api/tasks/:id`).

Cobertura obrigatoria implementada:

- requests nao autorizadas retornam `401`
- CORS com allowlist de origin (`403` fora da allowlist)
- teste de IDOR (usuario A nao acessa recurso do usuario B)
- validacao de role + permissao por rota protegida (`403`)
- rate limit apenas para usuarios autenticados (`429`)
- prevencao de SQL injection por validacao + contrato de repositorio tipado
- tokens expirados rejeitados (`401`)
- validacao de input com casos de `null`, `undefined`, string vazia, string oversized e caracteres especiais

## Estrutura

- Integracao de seguranca: `tests/api/tasksRoutes.security.integration.test.ts`
- Unitarios de validacao: `tests/api/tasksRoutes.validation.unit.test.ts`
- Implementacao da API e regras: `src/api/tasksRoutes.ts`

## Como rodar

```bash
npm run test:run
```

Ou em watch mode:

```bash
npm run test
```

## Estrategia de mocking

Somente a camada de banco e mockada:

- `TaskRepository` usa implementacao in-memory nos testes
- autenticacao/token e rate limiter sao doubles de infra
- regras da rota, validacao e autorizacao sao executadas de ponta a ponta no handler

## Casos de seguranca cobertos

1. **Nao autenticado**: rota protegida sem `Authorization` retorna `401`
2. **Token expirado**: token com `exp` passado retorna `401`
3. **IDOR**: `GET /api/tasks/:id` bloqueia recurso de outro owner com `403`
4. **Rate limit autenticado**: apos limite por usuario, rota retorna `429`
5. **SQL injection na URL**: payload de injecao no `:id` retorna `400`
6. **SQL injection no body**: campo `title` malicioso retorna `400`
7. **Role/permissao obrigatorios**: operacao sem permissao requerida retorna `403`
8. **CORS fora da allowlist**: origin nao permitida retorna `403`
9. **Input validation por campo**:
   - `title`: null/undefined/vazio/oversized/especial inseguro
   - `clickupLink`: null/vazio/oversized/especial inseguro
   - `clientId`: undefined/null/vazio/especial inseguro/formato invalido

## Observacoes

- A protecao contra SQL injection usa duas camadas:
  - validacao defensiva de entrada (padroes inseguros)
  - contrato tipado de repositorio sem concatenacao de SQL na rota
- O parse de token foi isolado em `TokenVerifier` para permitir troca por JWT real sem alterar testes da regra de negocio.
