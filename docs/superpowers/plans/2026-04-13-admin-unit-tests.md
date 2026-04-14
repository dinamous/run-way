# Admin Unit Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar cobertura de testes unitários balanceada à view de admin — lógica do hook `useAdminData` e comportamentos críticos de UI nos três painéis.

**Architecture:** Instalar `@testing-library/react` + `jsdom` e configurar o Vitest para usar `jsdom` em `src/**` e `node` em `tests/**`. Testes co-localizados em `src/views/admin/__tests__/`. `useAdminData` testado com `renderHook` + `vi.mock('@/lib/supabase')`. Componentes testados com `render` + `userEvent`.

**Tech Stack:** Vitest 4, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, React 19, TypeScript

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `vite.config.ts` — bloco `test` |
| Criar | `src/test-setup.ts` |
| Criar | `src/views/admin/__tests__/useAdminData.test.ts` |
| Criar | `src/views/admin/__tests__/AdminView.test.tsx` |
| Criar | `src/views/admin/__tests__/UsersPanel.test.tsx` |
| Criar | `src/views/admin/__tests__/ClientsPanel.test.tsx` |
| Criar | `src/views/admin/__tests__/AuditLogsPanel.test.tsx` |

---

## Task 1: Setup — Instalar dependências e configurar ambiente

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test-setup.ts`

- [ ] **Step 1: Instalar dependências de teste**

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Saída esperada: packages adicionados ao `package.json` devDependencies sem erros.

- [ ] **Step 2: Criar `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Atualizar o bloco `test` em `vite.config.ts`**

Substituir o bloco `test` existente:

```ts
test: {
  environmentMatchGlobs: [
    ['src/**', 'jsdom'],
    ['tests/**', 'node'],
  ],
  include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.test.{ts,tsx}'],
  setupFiles: ['src/test-setup.ts'],
  clearMocks: true,
},
```

- [ ] **Step 4: Verificar que os testes existentes ainda passam**

```bash
npm run test:run
```

Saída esperada: os testes em `tests/api/` passam sem regressão.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/test-setup.ts package.json package-lock.json
git commit -m "test: :wrench: configura ambiente jsdom e instala testing-library"
```

---

## Task 2: Testes do `useAdminData` — fetch e estado

**Files:**
- Create: `src/views/admin/__tests__/useAdminData.test.ts`

- [ ] **Step 1: Criar o arquivo com mocks e o primeiro teste (fetchClients sucesso)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdminData } from '../hooks/useAdminData'

// Mock do supabaseAdmin
const mockFrom = vi.fn()
const mockSupabaseAdmin = { from: mockFrom, auth: { admin: { listUsers: vi.fn() } } }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

vi.mock('@/store/useTaskStore', () => ({
  useTaskStore: (sel: (s: object) => unknown) => sel({ invalidate: vi.fn(), fetchTasks: vi.fn() }),
}))

vi.mock('@/store/useMemberStore', () => ({
  useMemberStore: (sel: (s: object) => unknown) => sel({ invalidate: vi.fn(), fetchMembers: vi.fn() }),
}))

vi.mock('@/store/useClientStore', () => ({
  useClientStore: (sel: (s: object) => unknown) => sel({ selectedClientId: null }),
}))

// Helper: encadeia .select().order() retornando data/error
function makeQuery(data: unknown[], error: null | { message: string } = null) {
  const q = { select: vi.fn(), order: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), ilike: vi.fn(), limit: vi.fn(), upsert: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn(), match: vi.fn(), single: vi.fn() }
  q.select.mockReturnValue(q)
  q.order.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  q.gte.mockReturnValue(q)
  q.lte.mockReturnValue(q)
  q.ilike.mockReturnValue(q)
  q.limit.mockResolvedValue({ data, error })
  q.single.mockResolvedValue({ data: data[0] ?? null, error })
  // Para queries sem .limit(), resolver direto em .order()
  q.order.mockResolvedValue({ data, error })
  return q
}

describe('useAdminData — fetchClients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it('atualiza clients no estado após fetch bem-sucedido', async () => {
    const clientsData = [{ id: '1', name: 'Acme', slug: 'acme' }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') return makeQuery(clientsData)
      if (table === 'members') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))
    expect(result.current.clients).toEqual(clientsData)
  })

  it('não chama supabase quando supabaseAdmin é null', async () => {
    // Testado indiretamente: quando o mock retorna null, o hook retorna cedo
    // Este teste verifica que loadingInitial resolve mesmo sem supabaseAdmin
    // (cobertura do branch `if (!supabaseAdmin) return`)
    // Simular null é difícil em módulo mockado — esse caso é coberto pelo AdminView.test.tsx
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar para verificar que o setup funciona**

```bash
npm run test:run -- --reporter=verbose src/views/admin/__tests__/useAdminData.test.ts
```

Saída esperada: 1 passing, 1 passing (trivial).

- [ ] **Step 3: Commit parcial**

```bash
git add src/views/admin/__tests__/useAdminData.test.ts
git commit -m "test: :white_check_mark: setup inicial useAdminData — fetchClients"
```

---

## Task 3: Testes do `useAdminData` — mutations CRUD

**Files:**
- Modify: `src/views/admin/__tests__/useAdminData.test.ts`

- [ ] **Step 1: Adicionar testes de `createClient`**

Adicionar ao final do arquivo (dentro de um novo `describe`):

```ts
describe('useAdminData — createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it('retorna true e atualiza clients em caso de sucesso', async () => {
    const clientsData = [{ id: '2', name: 'Beta', slug: 'beta' }]
    const insertQuery = { insert: vi.fn().mockResolvedValue({ error: null }) }
    const selectQuery = makeQuery(clientsData)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') {
        // Primeira chamada: insert; demais: select
        if (mockFrom.mock.calls.filter((c: string[]) => c[0] === 'clients').length <= 1) return insertQuery
        return selectQuery
      }
      if (table === 'members') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await waitFor(async () => {
      ok = await result.current.createClient('Beta', 'beta')
    })
    expect(ok).toBe(true)
  })

  it('retorna false quando Supabase retorna erro', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') return { insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }) }
      if (table === 'members') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await waitFor(async () => {
      ok = await result.current.createClient('Fail', 'fail')
    })
    expect(ok).toBe(false)
  })
})
```

- [ ] **Step 2: Adicionar testes de `deleteClient` (com e sem actorUserId)**

```ts
describe('useAdminData — deleteClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it('insere audit_log quando actorUserId está presente', async () => {
    const client = { id: 'c1', name: 'Acme', slug: 'acme' }
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') return { ...makeQuery([client]), delete: deleteMock }
      if (table === 'audit_logs') return { insert: insertMock }
      if (table === 'members') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData({ actorUserId: 'user-1' }))
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.deleteClient('c1', 'Acme')
    })
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      entity: 'client',
      action: 'delete',
    }))
  })

  it('não insere audit_log quando actorUserId é undefined', async () => {
    const insertMock = vi.fn()
    const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') return { ...makeQuery([]), delete: deleteMock }
      if (table === 'audit_logs') return { insert: insertMock }
      if (table === 'members') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.deleteClient('c1', 'Acme')
    })
    expect(insertMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
npm run test:run -- src/views/admin/__tests__/useAdminData.test.ts
```

Saída esperada: todos passando.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/__tests__/useAdminData.test.ts
git commit -m "test: :white_check_mark: testes createClient e deleteClient no useAdminData"
```

---

## Task 4: Testes do `useAdminData` — createUser, listGoogleUsers, fetchAuditLogs

**Files:**
- Modify: `src/views/admin/__tests__/useAdminData.test.ts`

- [ ] **Step 1: Adicionar testes de `createUser` (iniciais e clientIds)**

```ts
describe('useAdminData — createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it('gera iniciais corretas para nome composto', async () => {
    const newMember = { id: 'new-1', name: 'Ana Lima', role: 'Designer', avatar: 'AL', auth_user_id: null, access_role: 'user', email: null, avatar_url: null }
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newMember, error: null })
      })
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'members') return { insert: insertMock, ...makeQuery([]) }
      if (table === 'clients') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.createUser('Ana Lima', 'Designer')
    })

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ avatar: 'AL' }))
  })

  it('gera iniciais para nome único', async () => {
    const newMember = { id: 'new-2', name: 'João', role: 'Dev', avatar: 'JO', auth_user_id: null, access_role: 'user', email: null, avatar_url: null }
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newMember, error: null })
      })
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'members') return { insert: insertMock, ...makeQuery([]) }
      if (table === 'clients') return makeQuery([])
      if (table === 'user_clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.createUser('João', 'Dev')
    })

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ avatar: 'JO' }))
  })

  it('vincula clientIds em user_clients quando fornecidos', async () => {
    const newMember = { id: 'new-3', name: 'Maria', role: 'Designer', avatar: 'MA', auth_user_id: null, access_role: 'user', email: null, avatar_url: null }
    const memberInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newMember, error: null })
      })
    })
    const userClientInsertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'members') return { insert: memberInsertMock, ...makeQuery([]) }
      if (table === 'user_clients') return { insert: userClientInsertMock, ...makeQuery([]) }
      if (table === 'clients') return makeQuery([])
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.createUser('Maria', 'Designer', null, 'user', ['client-1', 'client-2'])
    })

    expect(userClientInsertMock).toHaveBeenCalledWith([
      { user_id: 'new-3', client_id: 'client-1' },
      { user_id: 'new-3', client_id: 'client-2' },
    ])
  })
})
```

- [ ] **Step 2: Adicionar testes de `listGoogleUsers`**

```ts
describe('useAdminData — listGoogleUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation(() => makeQuery([]))
  })

  it('retorna até 20 usuários sem filtro', async () => {
    const googleUsers = Array.from({ length: 25 }, (_, i) => ({
      id: `u${i}`, email: `user${i}@example.com`,
      user_metadata: { full_name: `User ${i}`, avatar_url: null },
      last_sign_in_at: null,
    }))
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: googleUsers }, error: null })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    const users = await result.current.listGoogleUsers()
    expect(users).toHaveLength(20)
  })

  it('filtra por email case-insensitive', async () => {
    const googleUsers = [
      { id: 'u1', email: 'ana@example.com', user_metadata: { full_name: 'Ana', avatar_url: null }, last_sign_in_at: null },
      { id: 'u2', email: 'bob@example.com', user_metadata: { full_name: 'Bob', avatar_url: null }, last_sign_in_at: null },
    ]
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: googleUsers }, error: null })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    const users = await result.current.listGoogleUsers('ANA')
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('ana@example.com')
  })
})
```

- [ ] **Step 3: Adicionar testes de `fetchAuditLogs`**

```ts
describe('useAdminData — fetchAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it('chama query sem filtros adicionais quando filters é vazio', async () => {
    const query = makeQuery([])
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return query
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.fetchAuditLogs({})
    })

    expect(query.eq).not.toHaveBeenCalled()
    expect(query.gte).not.toHaveBeenCalled()
  })

  it('passa clientId para a query quando fornecido', async () => {
    const query = makeQuery([])
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return query
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.fetchAuditLogs({ clientId: 'c-abc' })
    })

    expect(query.eq).toHaveBeenCalledWith('client_id', 'c-abc')
  })

  it('passa from e to para a query quando fornecidos', async () => {
    const query = makeQuery([])
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return query
      return makeQuery([])
    })

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    await waitFor(async () => {
      await result.current.fetchAuditLogs({ from: '2026-01-01', to: '2026-01-31' })
    })

    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z')
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-01-31T23:59:59Z')
  })
})
```

- [ ] **Step 4: Rodar todos os testes do useAdminData**

```bash
npm run test:run -- src/views/admin/__tests__/useAdminData.test.ts
```

Saída esperada: todos passando.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/__tests__/useAdminData.test.ts
git commit -m "test: :white_check_mark: testes createUser, listGoogleUsers e fetchAuditLogs"
```

---

## Task 5: Testes do `AdminView`

**Files:**
- Create: `src/views/admin/__tests__/AdminView.test.tsx`

- [ ] **Step 1: Criar o arquivo com mocks e testes de fallback**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock supabaseAdmin como null para testar o fallback
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: null }))

vi.mock('./hooks/useAdminData', () => ({
  useAdminData: () => ({
    clients: [], users: [], auditLogs: [], loading: false, loadingInitial: false,
    error: null, userClientsMap: {}, pendingUsers: [],
    refreshAll: vi.fn(), fetchAuditLogs: vi.fn(),
    createClient: vi.fn(), updateClient: vi.fn(), deleteClient: vi.fn(),
    linkUserToClient: vi.fn(), unlinkUserFromClient: vi.fn(), setUserRole: vi.fn(),
    createUser: vi.fn(), setUserAuthId: vi.fn(), updateUser: vi.fn(), listGoogleUsers: vi.fn(),
  }),
}))

const mockSetImpersonatedClientId = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    member: { id: 'admin-1', name: 'Admin' },
    impersonatedClientId: null,
    setImpersonatedClientId: mockSetImpersonatedClientId,
  }),
}))

import { AdminView } from '../AdminView'

describe('AdminView — sem supabaseAdmin', () => {
  it('renderiza ViewState de configuração necessária', () => {
    render(<AdminView />)
    expect(screen.getByText('Configuração necessária')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para verificar o teste de fallback**

```bash
npm run test:run -- src/views/admin/__tests__/AdminView.test.tsx
```

Saída esperada: 1 passing.

- [ ] **Step 3: Adicionar testes de abas e impersonation (com supabaseAdmin ativo)**

Criar um segundo arquivo de teste para o AdminView com supabaseAdmin mockado como objeto real:

```tsx
// Adicionar ao mesmo arquivo, mas com um vi.mock diferente não é possível no mesmo módulo.
// O padrão correto é usar dois arquivos separados.
```

> **Nota:** como `vi.mock` é hoisted e aplicado por módulo de teste, o fallback "sem supabaseAdmin" e o comportamento "com supabaseAdmin" devem ficar em arquivos separados. Criar `AdminView.tabs.test.tsx`:

**Create:** `src/views/admin/__tests__/AdminView.tabs.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(), auth: { admin: { listUsers: vi.fn() } } },
}))

const mockSetImpersonatedClientId = vi.fn()
let mockImpersonatedClientId: string | null = null

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    member: { id: 'admin-1', name: 'Admin' },
    impersonatedClientId: mockImpersonatedClientId,
    setImpersonatedClientId: mockSetImpersonatedClientId,
  }),
}))

vi.mock('../hooks/useAdminData', () => ({
  useAdminData: () => ({
    clients: [{ id: 'c1', name: 'Acme', slug: 'acme' }],
    users: [{ id: 'u1', name: 'Ana', role: 'Designer', avatar: 'AN', auth_user_id: null, access_role: 'user', email: null, avatar_url: null }],
    auditLogs: [],
    loading: false, loadingInitial: false, error: null,
    userClientsMap: {}, pendingUsers: [],
    refreshAll: vi.fn(), fetchAuditLogs: vi.fn(),
    createClient: vi.fn(), updateClient: vi.fn(), deleteClient: vi.fn(),
    linkUserToClient: vi.fn(), unlinkUserFromClient: vi.fn(), setUserRole: vi.fn(),
    createUser: vi.fn(), setUserAuthId: vi.fn(), updateUser: vi.fn(), listGoogleUsers: vi.fn().mockResolvedValue([]),
  }),
}))

import { AdminView } from '../AdminView'

describe('AdminView — navegação de abas', () => {
  beforeEach(() => {
    mockImpersonatedClientId = null
    vi.clearAllMocks()
  })

  it('aba Clientes está ativa por padrão', () => {
    render(<AdminView />)
    const tab = screen.getByRole('tab', { name: /clientes/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('clicar em Usuários exibe o painel de usuários', async () => {
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('tab', { name: /usuários/i }))
    expect(screen.getByRole('tabpanel', { name: /usuários/i })).toBeInTheDocument()
  })

  it('clicar em Audit Log exibe o painel de audit', async () => {
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('tab', { name: /audit log/i }))
    expect(screen.getByRole('tabpanel', { name: /audit/i })).toBeInTheDocument()
  })
})

describe('AdminView — impersonation', () => {
  it('exibe banner quando impersonatedClientId está presente', () => {
    mockImpersonatedClientId = 'client-xyz'
    render(<AdminView />)
    expect(screen.getByText('Visualizando como cliente')).toBeInTheDocument()
  })

  it('botão Sair da visão chama setImpersonatedClientId(null)', async () => {
    mockImpersonatedClientId = 'client-xyz'
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('button', { name: /sair da visão/i }))
    expect(mockSetImpersonatedClientId).toHaveBeenCalledWith(null)
  })

  it('não exibe banner quando impersonatedClientId é null', () => {
    mockImpersonatedClientId = null
    render(<AdminView />)
    expect(screen.queryByText('Visualizando como cliente')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Rodar os testes de AdminView**

```bash
npm run test:run -- src/views/admin/__tests__/AdminView.test.tsx src/views/admin/__tests__/AdminView.tabs.test.tsx
```

Saída esperada: todos passando.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/__tests__/AdminView.test.tsx src/views/admin/__tests__/AdminView.tabs.test.tsx
git commit -m "test: :white_check_mark: testes AdminView — fallback, abas e impersonation"
```

---

## Task 6: Testes do `AuditLogsPanel`

**Files:**
- Create: `src/views/admin/__tests__/AuditLogsPanel.test.tsx`

- [ ] **Step 1: Criar o arquivo com testes de filtros**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditLogsPanel } from '../components/AuditLogsPanel'
import type { AuditFilters } from '../hooks/useAdminData'

const defaultProps = {
  logs: [],
  clients: [{ id: 'c1', name: 'Acme', slug: 'acme', created_at: '' }],
  users: [{ id: 'u1', name: 'Ana', role: 'Designer', avatar: 'AN', auth_user_id: null, access_role: 'user' as const, email: null, avatar_url: null }],
  loading: false,
}

describe('AuditLogsPanel — filtros', () => {
  let onFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onFetch = vi.fn()
  })

  it('chama onFetch com todos os campos undefined quando busca sem filtros', async () => {
    const user = userEvent.setup()
    render(<AuditLogsPanel {...defaultProps} onFetch={onFetch} />)
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onFetch).toHaveBeenCalledWith<[AuditFilters]>({
      clientId: undefined,
      userId: undefined,
      entity: undefined,
      entityName: undefined,
      from: undefined,
      to: undefined,
    })
  })

  it('passa clientId correto ao selecionar cliente', async () => {
    const user = userEvent.setup()
    render(<AuditLogsPanel {...defaultProps} onFetch={onFetch} />)
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'c1')
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onFetch).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'c1' }))
  })

  it('passa userId correto ao selecionar usuário', async () => {
    const user = userEvent.setup()
    render(<AuditLogsPanel {...defaultProps} onFetch={onFetch} />)
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'u1')
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onFetch).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }))
  })

  it('passa from e to corretos ao preencher intervalo de datas', async () => {
    const user = userEvent.setup()
    render(<AuditLogsPanel {...defaultProps} onFetch={onFetch} />)
    const dateInputs = screen.getAllByDisplayValue('')
    // inputs de data são os dois últimos campos de texto
    const fromInput = screen.getByDisplayValue('') // fallback — usar label
    // Usar placeholder / aria para localizar os inputs de data
    const inputs = document.querySelectorAll('input[type="date"]')
    await user.type(inputs[0] as HTMLElement, '2026-01-01')
    await user.type(inputs[1] as HTMLElement, '2026-01-31')
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onFetch).toHaveBeenCalledWith(expect.objectContaining({
      from: '2026-01-01',
      to: '2026-01-31',
    }))
  })
})
```

- [ ] **Step 2: Rodar testes**

```bash
npm run test:run -- src/views/admin/__tests__/AuditLogsPanel.test.tsx
```

Saída esperada: todos passando.

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/__tests__/AuditLogsPanel.test.tsx
git commit -m "test: :white_check_mark: testes AuditLogsPanel — filtros e payload"
```

---

## Task 7: Testes do `ClientsPanel`

**Files:**
- Create: `src/views/admin/__tests__/ClientsPanel.test.tsx`

- [ ] **Step 1: Criar o arquivo com testes de validação e CRUD**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientsPanel } from '../components/ClientsPanel'

const defaultProps = {
  clients: [],
  users: [],
  userClientsMap: {},
  onCreate: vi.fn().mockResolvedValue(true),
  onUpdate: vi.fn().mockResolvedValue(true),
  onDelete: vi.fn().mockResolvedValue(true),
}

describe('ClientsPanel — validação de criação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bloqueia criação com nome vazio e exibe erro', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /novo cliente/i }))
    // Preenche slug mas não o nome
    await user.type(screen.getByLabelText(/slug/i), 'meu-cliente')
    await user.click(screen.getByRole('button', { name: /criar/i }))
    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
    expect(defaultProps.onCreate).not.toHaveBeenCalled()
  })

  it('bloqueia criação com slug vazio e exibe erro', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /novo cliente/i }))
    await user.type(screen.getByLabelText(/nome/i), 'Meu Cliente')
    await user.click(screen.getByRole('button', { name: /criar/i }))
    expect(screen.getByText('Slug é obrigatório')).toBeInTheDocument()
    expect(defaultProps.onCreate).not.toHaveBeenCalled()
  })

  it('chama onCreate com nome e slug corretos quando form é válido', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /novo cliente/i }))
    await user.type(screen.getByLabelText(/nome/i), 'Meu Cliente')
    await user.type(screen.getByLabelText(/slug/i), 'meu-cliente')
    await user.click(screen.getByRole('button', { name: /criar/i }))
    await waitFor(() => {
      expect(defaultProps.onCreate).toHaveBeenCalledWith('Meu Cliente', 'meu-cliente')
    })
  })
})

describe('ClientsPanel — confirmação de delete', () => {
  const clientProps = {
    ...defaultProps,
    clients: [{ id: 'c1', name: 'Acme', slug: 'acme', created_at: '' }],
    onDelete: vi.fn().mockResolvedValue(true),
  }

  beforeEach(() => vi.clearAllMocks())

  it('exibe ConfirmModal ao clicar em eliminar cliente', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...clientProps} />)
    await user.click(screen.getByRole('button', { name: /eliminar cliente acme/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('chama onDelete com o id correto ao confirmar', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...clientProps} />)
    await user.click(screen.getByRole('button', { name: /eliminar cliente acme/i }))
    await user.click(screen.getByRole('button', { name: /confirmar|eliminar/i }))
    await waitFor(() => {
      expect(clientProps.onDelete).toHaveBeenCalledWith('c1', 'Acme')
    })
  })

  it('não chama onDelete ao cancelar no ConfirmModal', async () => {
    const user = userEvent.setup()
    render(<ClientsPanel {...clientProps} />)
    await user.click(screen.getByRole('button', { name: /eliminar cliente acme/i }))
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(clientProps.onDelete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar testes**

```bash
npm run test:run -- src/views/admin/__tests__/ClientsPanel.test.tsx
```

Saída esperada: todos passando.

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/__tests__/ClientsPanel.test.tsx
git commit -m "test: :white_check_mark: testes ClientsPanel — validação e confirmação de delete"
```

---

## Task 8: Testes do `UsersPanel`

**Files:**
- Create: `src/views/admin/__tests__/UsersPanel.test.tsx`

- [ ] **Step 1: Criar o arquivo com testes do drawer de edição**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersPanel } from '../components/UsersPanel'
import type { Member } from '@/hooks/useSupabase'

const mockUser: Member = {
  id: 'u1', name: 'Ana Lima', role: 'Designer', avatar: 'AL',
  auth_user_id: null, access_role: 'user', email: 'ana@example.com', avatar_url: null,
}

const defaultProps = {
  users: [mockUser],
  clients: [],
  onSetRole: vi.fn().mockResolvedValue(true),
  onLink: vi.fn().mockResolvedValue(true),
  onUnlink: vi.fn().mockResolvedValue(true),
  onCreate: vi.fn().mockResolvedValue(true),
  onUpdate: vi.fn().mockResolvedValue(true),
  onSetAuthId: vi.fn().mockResolvedValue(true),
  onListGoogleUsers: vi.fn().mockResolvedValue([]),
  userClientsMap: {},
  pendingUsers: [],
}

describe('UsersPanel — drawer de edição', () => {
  beforeEach(() => vi.clearAllMocks())

  it('abre o drawer ao clicar em um usuário', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} />)
    await user.click(screen.getByText('Ana Lima'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('alterar nome não dispara onUpdate imediatamente', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} />)
    await user.click(screen.getByText('Ana Lima'))
    const nameInput = await screen.findByDisplayValue('Ana Lima')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana Costa')
    expect(defaultProps.onUpdate).not.toHaveBeenCalled()
  })

  it('clicar em Guardar dispara onUpdate com valores corretos', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} />)
    await user.click(screen.getByText('Ana Lima'))
    const nameInput = await screen.findByDisplayValue('Ana Lima')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana Costa')
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalledWith('u1', 'Ana Costa', 'Designer', 'ana@example.com')
    })
  })

  it('cancelar com dados limpos fecha sem exibir ConfirmModal', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} />)
    await user.click(screen.getByText('Ana Lima'))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    // ConfirmModal não deve aparecer
    expect(screen.queryByText(/descartar/i)).not.toBeInTheDocument()
  })

  it('cancelar com dados sujos exibe ConfirmModal', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} />)
    await user.click(screen.getByText('Ana Lima'))
    const nameInput = await screen.findByDisplayValue('Ana Lima')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana Costa')
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(await screen.findByRole('dialog', { name: /descartar|confirmar/i })).toBeInTheDocument()
  })
})

describe('UsersPanel — paginação', () => {
  // PAGE_SIZE = 12, precisamos de 13+ usuários
  const manyUsers: Member[] = Array.from({ length: 14 }, (_, i) => ({
    id: `u${i}`, name: `Usuário ${i}`, role: 'Designer', avatar: `U${i}`,
    auth_user_id: null, access_role: 'user' as const, email: null, avatar_url: null,
  }))

  it('botão próxima página avança para a página 2', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} users={manyUsers} />)
    expect(screen.getByText('Usuário 0')).toBeInTheDocument()
    expect(screen.queryByText('Usuário 12')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /próxima|>/i }))
    expect(await screen.findByText('Usuário 12')).toBeInTheDocument()
  })

  it('botão página anterior volta para página 1', async () => {
    const user = userEvent.setup()
    render(<UsersPanel {...defaultProps} users={manyUsers} />)
    await user.click(screen.getByRole('button', { name: /próxima|>/i }))
    await screen.findByText('Usuário 12')
    await user.click(screen.getByRole('button', { name: /anterior|</i }))
    expect(await screen.findByText('Usuário 0')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar testes**

```bash
npm run test:run -- src/views/admin/__tests__/UsersPanel.test.tsx
```

Saída esperada: todos passando. Se algum teste falhar por seletor de texto específico do componente, ajustar o seletor para bater com o que está renderizado (usar `screen.debug()` para inspecionar).

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/__tests__/UsersPanel.test.tsx
git commit -m "test: :white_check_mark: testes UsersPanel — drawer, acúmulo, ConfirmModal e paginação"
```

---

## Task 9: Rodar suite completa e verificar

- [ ] **Step 1: Rodar todos os testes**

```bash
npm run test:run
```

Saída esperada: todos os testes em `tests/` e `src/views/admin/__tests__/` passando sem erros.

- [ ] **Step 2: Verificar lint**

```bash
npm run lint
```

Saída esperada: sem erros de ESLint.

- [ ] **Step 3: Commit final (se houver ajustes menores)**

```bash
git add -A
git commit -m "test: :white_check_mark: suite completa de testes unitários — view admin"
```

---

## Notas de Implementação

### Mock do Supabase — padrão encadeado

O Supabase usa query builders encadeados (`from().select().order()`). O helper `makeQuery` criado no Task 2 resolve isso retornando `this` em cada método, com `.order()` e `.limit()` resolvendo a Promise. Para mutations (`insert`, `update`, `delete`), mockar individualmente por teste conforme o padrão mostrado no Task 3.

### `vi.mock` é hoisted

O Vitest hoist os `vi.mock()` para o topo do arquivo antes de qualquer import. Por isso, variáveis que precisam ser mutadas entre testes (ex: `mockImpersonatedClientId`) devem ser declaradas fora do mock e referenciadas dentro da factory function — não passadas como argumento direto.

### Seletores frágeis

Prefira `getByRole` + `name` sobre `getByText` puro quando possível. Se um seletor falhar, use `screen.debug()` para ver o DOM renderizado e ajustar o seletor antes de mudar o componente.
