# Plano de Implementação — ClientPickerView (Opção B)

## Problema

Após o login, o router cai em `/` sem `clientSlug`. O orquestrador resolve isso pegando `clients[0]` como `effectiveClient` implicitamente (linha 34–35 de `useAppOrchestrator.ts`). Isso causa estado ambíguo: o usuário nunca escolheu um cliente, mas a app opera como se tivesse.

## Solução

Transformar `/` em uma **tela de boas-vindas obrigatória** que exibe cards dos clientes disponíveis. Só após o usuário escolher um cliente, ele é redirecionado para `/:clientSlug`. O fallback `clients[0]` é removido do orquestrador.

**Atalho para 1 cliente:** Se `clients.length === 1`, a view faz o redirect automaticamente sem renderizar a tela (transparente ao usuário).

---

## Arquitetura da Solução

### Nova view: `src/views/client-picker/`

Estrutura (seguindo convenção de views-como-pastas):

```
src/views/client-picker/
├── ClientPickerView.tsx   # componente principal
├── components/
│   └── ClientCard.tsx     # card de cliente (reutiliza estilo de QuickAccessCard)
└── index.ts
```

### Novo layout: `ClientPickerLayout`

A tela de boas-vindas não usa `AppLayout` (sidebar de navegação completa seria ruído). Ela tem um layout próprio mais leve:

- **Header:** mesmo `AppHeader` (logo + toggle de tema + notificações) — sem o `selectedClientId` relevante, mas mantém consistência visual
- **Sidebar:** sidebar simplificada — **apenas o botão de Início (ativo) + footer recolhido** (`open = false` fixo, sem toggle)
- **Main:** `ClientPickerView`

Isso evita criar um componente de sidebar completamente novo — aproveitamos `AppSidebar` com contexto simplificado, passando `sidebarOpen: false` fixo e somente o item "Início" visível (ou simplesmente omitindo a sidebar e usando um mini-sidebar dedicado).

> **Decisão de implementação:** Criar um `ClientPickerSidebar` separado e simples (não reutilizar `AppSidebar` com mocks) — a sidebar de picker tem apenas footer recolhido com avatar/logout, sem nav items. Mais simples e sem risco de regressão na sidebar principal.

---

## Mudanças por Arquivo

### 1. `src/views/client-picker/ClientPickerView.tsx` *(novo)*

```
Props:
  userName: string
  clients: ClientOption[]
  onSelectClient: (client: ClientOption) => void

Comportamento:
  - Se clients.length === 1: chama onSelectClient(clients[0]) no mount, renderiza null (ou spinner curto)
  - Se clients.length === 0: exibe mensagem de "nenhum cliente associado" + link para /clients
  - Se clients.length > 1: exibe grid de ClientCards

Visual (inspirado em HomeView):
  - Mesmo fundo com gradiente + dot pattern
  - Saudação: "Olá, {firstName}" + data atual
  - Subtítulo: "Selecione um cliente para continuar"
  - Grid de ClientCard (2 col mobile, 3–4 col desktop)
```

### 2. `src/views/client-picker/components/ClientCard.tsx` *(novo)*

```
Props:
  client: ClientOption
  onClick: () => void

Visual:
  - Mesmo padrão de QuickAccessCard (border, rounded-xl, hover, dark mode)
  - Avatar com iniciais (2 chars, bg-primary text-primary-foreground)
  - Nome do cliente em font-medium
  - Sem description ou ícone de categoria — foco no nome
```

### 3. `src/views/client-picker/index.ts` *(novo)*

```ts
export { ClientPickerView } from "./ClientPickerView"
```

### 4. `src/components/ClientPickerLayout.tsx` *(novo)*

Layout exclusivo para a rota `/`:

```
Header: AppHeader (reaproveitado via LayoutContext, com selectedClientId: null)
Sidebar: mini-sidebar recolhida (sem ClientPickerSidebar, sem nav)
  - Apenas footer: avatar do usuário + logout
  - Sem toggle de expand (sempre recolhida)
Main: ClientPickerView
```

Evita alterar `AppLayout` — cria uma composição paralela simples.

### 5. `src/components/AppRoutes.tsx` *(alterar)*

A rota `/` passa a ter um `element` real (não `null`) — mas como `AppRoutes` só declara rotas sem renderizar, nenhuma mudança aqui. A renderização condicional fica no `App.tsx` ou `AppRouter.tsx`.

### 6. `src/components/AppRouter.tsx` *(alterar)*

Remover o guard atual que vai para `NoClientView` quando `hasClients && !effectiveClientId`. A rota `/` sem slug agora é tratada como `ClientPickerView`, não como estado de erro.

Mudança no guard (linha 62–64):
```
// ANTES
if (hasClients && !effectiveClientId && view !== "clients" && view !== "profile" && view !== "admin") {
  return <NoClientView hasClients={true} onGoToClients={goToClients} />;
}

// DEPOIS — removido; essa situação é válida (tela de picker)
```

### 7. `src/hooks/useAppOrchestrator.ts` *(alterar)*

Remover o fallback `clients[0]`:

```ts
// ANTES
const effectiveClient =
  nav.currentClient ??
  (hasClients ? auth.clients[0] : null);

// DEPOIS
const effectiveClient = nav.currentClient ?? null;
```

Também ajustar o `useEffect` de redirect (linhas 40–53): remover o `return` que bloqueia o redirect na raiz. Em vez disso, não há mais lógica de redirect automático — a rota `/` é intencional.

### 8. `src/App.tsx` *(alterar — verificar)*

Verificar se `App.tsx` precisa detectar a rota `/` e renderizar `ClientPickerLayout` em vez de `AppLayout`. Isso depende de como `App.tsx` está estruturado — se ele delega ao `AppRouter` via `AppLayout`, pode ser necessário adicionar um gate condicional no topo.

Lógica:
```
se pathname === "/" e session existe e !currentSlug → renderiza ClientPickerLayout
senão → renderiza AppLayout normal
```

---

## Fluxo Completo Após Mudança

```
Login → AuthContext carrega clients
  → Router em "/"
  → App detecta: sem slug, pathname="/" → renderiza ClientPickerLayout
      → ClientPickerView:
          1 cliente? → redirect automático para /:slug
          0 clientes? → mensagem + link /clients
          N clientes? → grid de ClientCards → usuário clica → navigate(/:slug)
  → App volta ao fluxo normal (AppLayout + AppRouter)
```

---

## O Que NÃO Muda

- `AppLayout`, `AppSidebar`, `AppHeader` — sem alterações
- `HomeView` — continua existindo como view pós-seleção de cliente (`/:slug`)
- `urlToView` / `viewToPath` em `useAppNavigation` — sem alterações
- Rotas existentes — sem alterações
- `NoClientView` — continua sendo usado para usuários sem nenhum cliente associado

---

## Ordem de Implementação

1. Criar `ClientCard.tsx`
2. Criar `ClientPickerView.tsx` (com lógica de 1 cliente = redirect)
3. Criar `ClientPickerView/index.ts`
4. Criar `ClientPickerLayout.tsx` (header + mini-sidebar recolhida + main)
5. Alterar `useAppOrchestrator.ts` — remover fallback `clients[0]`
6. Alterar `AppRouter.tsx` — remover guard `!effectiveClientId`
7. Alterar `App.tsx` — adicionar gate para renderizar `ClientPickerLayout` na raiz sem slug
8. Testes: `ClientPickerView.test.tsx` (redirect com 1 cliente, render com N, mensagem com 0)
9. Atualizar `docs/architecture.md` e `docs/decisions.md`

---

## ADR (para `docs/decisions.md`)

**Decisão:** Substituir o fallback implícito `clients[0]` por uma tela de seleção de cliente obrigatória na rota `/`.  
**Racional:** O estado implícito causava bugs onde funcionalidades operavam com um cliente que o usuário não escolheu. A tela de picker torna a escolha explícita e elimina a ambiguidade.  
**Consequências:** Usuários com múltiplos clientes veem a tela de seleção a cada login (ou ao navegar para `/`). Usuários com 1 cliente têm redirect transparente (sem fricção).
