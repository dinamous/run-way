# Spec: Testes Unitários — View Admin

**Data:** 2026-04-13  
**Branch:** feature/briefing-tools  
**Escopo:** Adicionar cobertura de testes unitários à view de admin (`src/views/admin/`)

---

## Contexto

A view de admin não possui nenhum teste. Ela é composta por:

- `useAdminData` — hook central com todas as mutations e fetches (usa `supabaseAdmin` diretamente)
- `AdminView` — shell com abas, impersonation banner e fallbacks
- `UsersPanel` — drawer de edição com acúmulo de mudanças antes de salvar
- `ClientsPanel` — CRUD de clientes com validação e confirmação de delete
- `AuditLogsPanel` — filtros que constroem payload para `onFetch`

Não há `@testing-library/react` nem `jsdom` instalados. Os testes existentes (`tests/`) rodam em ambiente `node` e testam lógica pura.

---

## Decisões de Design

- **Abordagem:** cobertura balanceada — lógica do hook + comportamentos críticos de UI
- **Mocking de Supabase:** `vi.mock('@/lib/supabase')` com `vi.fn()` por teste
- **Testes de UI:** `@testing-library/react` + `@testing-library/user-event` com `jsdom`
- **Localização:** `src/views/admin/__tests__/` (co-location conforme CLAUDE.md)

---

## Setup

### Packages (devDependencies)

```
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
jsdom
```

### `vite.config.ts` — alterações no bloco `test`

```ts
test: {
  environmentMatchGlobs: [
    ['src/**', 'jsdom'],
    ['tests/**', 'node'],
  ],
  include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.test.{ts,tsx}'],
  setupFiles: ['src/test-setup.ts'],
  clearMocks: true,
}
```

### `src/test-setup.ts` (novo arquivo)

```ts
import '@testing-library/jest-dom'
```

---

## Estrutura de Arquivos

```
src/views/admin/__tests__/
├── useAdminData.test.ts
├── AdminView.test.tsx
├── UsersPanel.test.tsx
├── ClientsPanel.test.tsx
└── AuditLogsPanel.test.tsx
```

---

## Casos de Teste

### `useAdminData.test.ts`

Mock: `vi.mock('@/lib/supabase')`, `vi.mock('@/store/useTaskStore')`, `vi.mock('@/store/useMemberStore')`, `vi.mock('@/store/useClientStore')`

| Caso | Descrição |
|---|---|
| `fetchClients` sucesso | Retorna lista e atualiza `clients` no estado |
| `fetchClients` sem supabaseAdmin | Não chama nada, retorna sem erro |
| `createClient` sucesso | Retorna `true`, chama `fetchClients` e `reloadAppStores` |
| `createClient` erro Supabase | Retorna `false` |
| `deleteClient` com actorUserId | Insere registro em `audit_logs` |
| `deleteClient` sem actorUserId | Não insere audit_log |
| `createUser` iniciais | "Ana Lima" → avatar "AL"; "João" → "JO" |
| `createUser` com clientIds | Insere linhas em `user_clients` |
| `fetchPendingUsers` | Filtra usuários com `auth_user_id` já vinculado |
| `fetchPendingUsers` ALLOWED_DOMAIN | Filtra emails fora do domínio permitido |
| `fetchAuditLogs` sem filtros | Query sem `.eq` ou `.gte` extras |
| `fetchAuditLogs` com filtros | Passa `clientId`, `entity`, `from`, `to` para a query |
| `listGoogleUsers` sem search | Retorna até 20 usuários |
| `listGoogleUsers` com search | Filtra por email/nome case-insensitive |

### `AdminView.test.tsx`

Mock: `vi.mock('@/lib/supabase')`, `vi.mock('./hooks/useAdminData')`, `vi.mock('@/contexts/AuthContext')`

| Caso | Descrição |
|---|---|
| Sem supabaseAdmin | Renderiza `ViewState` com mensagem de configuração |
| Erro + listas vazias | Renderiza `ViewState` de erro com botão "Tentar novamente" |
| Troca aba Usuários | Painel de usuários fica visível; ClientsPanel fica oculto |
| Troca aba Audit Log | AuditLogsPanel fica visível |
| Banner impersonation | Aparece quando `impersonatedClientId` não é null |
| Botão "Sair da visão" | Chama `setImpersonatedClientId(null)` |

### `UsersPanel.test.tsx`

| Caso | Descrição |
|---|---|
| Drawer abre | Clicar em usuário abre o drawer |
| Acúmulo sem salvar | Alterar nome não dispara `onUpdate` imediatamente |
| Guardar dispara onUpdate | Clicar em Guardar chama `onUpdate` com valores corretos |
| Cancelar com dados limpos | Fecha sem exibir ConfirmModal |
| Cancelar com dados sujos | Exibe ConfirmModal |
| ConfirmModal — confirmar | Descarta mudanças, fecha drawer |
| ConfirmModal — cancelar | Mantém drawer aberto com dados |
| Paginação avança | Botão próxima página exibe usuários da página 2 |
| Paginação volta | Botão página anterior volta para página 1 |

### `ClientsPanel.test.tsx`

| Caso | Descrição |
|---|---|
| Validação nome vazio | Bloqueia submit, exibe erro de validação |
| Validação slug vazio | Bloqueia submit, exibe erro de validação |
| Criação bem-sucedida | Chama `onCreate` com nome e slug corretos |
| Confirmação delete | Clicar em deletar exibe ConfirmModal |
| ConfirmModal — confirmar delete | Chama `onDelete` com id correto |
| ConfirmModal — cancelar delete | Não chama `onDelete` |

### `AuditLogsPanel.test.tsx`

| Caso | Descrição |
|---|---|
| Busca sem filtros | `onFetch` chamado com todos os campos `undefined` |
| Filtro por cliente | `onFetch` chamado com `clientId` correto |
| Filtro por usuário | `onFetch` chamado com `userId` correto |
| Filtro por intervalo | `onFetch` chamado com `from` e `to` corretos |
| Filtro por entityName | `onFetch` chamado com `entityName` correto |

---

## Convenções

- Testes em português PT-BR para `describe`/`it` labels (alinhado com CLAUDE.md)
- Cada arquivo começa com `vi.mock` antes dos `describe`
- Não usar `render` de componentes que dependem de roteamento sem wrapper — usar contextos mínimos necessários
- `renderHook` do `@testing-library/react` para testar `useAdminData`
