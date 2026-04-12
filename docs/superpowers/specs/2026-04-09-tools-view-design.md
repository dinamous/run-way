# Design: View de Ferramentas

**Data:** 2026-04-09  
**Status:** Aprovado

---

## Objetivo

Criar uma nova view chamada **Ferramentas** (`tools`) dentro da aplicação, seguindo os padrões atuais do projeto. A view é estrutural (skeleton), sem lógica funcional real, usando mocks. Base preparada para plugar funcionalidades futuras.

---

## Decisões de Design

- **Sidebar:** item flat sem subitens — "Ferramentas" navega direto para `ToolsView`; os 5 itens do spec viram cards na página
- **Acesso:** sem requisito de cliente — acessível a todos os usuários logados (`requiresClient: false`, roles `['admin', 'user']`)
- **Estrutura:** padrão `src/views/<nome>/` com co-location de componentes privados

---

## Arquivos a Criar

```
src/views/tools/
  index.ts
  ToolsView.tsx
  tools.mock.ts
  components/
    ToolCard.tsx
    ToolGrid.tsx
    ToolLoadingState.tsx
    ToolEmptyState.tsx
    ToolErrorState.tsx
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/store/useUIStore.ts` | Adicionar `'tools'` ao `ViewType` |
| `src/lib/accessControl.ts` | Adicionar regra `tools` sem cliente, todos os roles |
| `src/components/AppSidebar.tsx` | Adicionar `{ view: 'tools', label: 'Ferramentas', Icon: Wrench }` ao `BASE_NAV_ITEMS` |
| `src/App.tsx` | Importar `ToolsView` e adicionar branch `view === "tools"` |

---

## Tipos

```ts
type Tool = {
  id: string
  title: string
  description: string
  icon: React.ElementType  // componente Lucide direto
}

type ViewState = 'loading' | 'empty' | 'error' | 'success'
```

---

## Componentes

### `ToolsView.tsx`
- `ViewState` hardcoded como `'success'`
- Renderiza título "Ferramentas"
- Switch de estado: `loading` → `ToolLoadingState`, `error` → `ToolErrorState`, `empty` → `ToolEmptyState`, `success` → `ToolGrid`

### `ToolCard.tsx`
- Props: `tool: Tool`
- `<Icon className="w-5 h-5" />` + título + descrição
- `border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer`
- Título: `text-lg font-medium`; Descrição: `text-sm text-muted-foreground`
- Sem `onClick` funcional

### `ToolGrid.tsx`
- Props: `tools: Tool[]`
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- Mapeia para `<ToolCard />`

### `ToolLoadingState.tsx`
- 6 cards com `animate-pulse` (Tailwind, sem lib externa)
- Mesma estrutura visual do `ToolCard`

### `ToolEmptyState.tsx`
- Ícone `Inbox` (lucide-react), centralizado
- Título: "Nenhuma ferramenta disponível"
- Subtexto em `text-muted-foreground`

### `ToolErrorState.tsx`
- Ícone `AlertTriangle` (lucide-react)
- Título: "Erro ao carregar ferramentas"
- Botão `<Button variant="outline">` com label "Tentar novamente" (sem handler real)

---

## Mock de Dados (`tools.mock.ts`)

5 ferramentas:
- `link-shortener` — Encurtador de Link (`LinkIcon`)
- `briefing` — Gerador de Briefing (`FileText`)
- `utm` — Gerador de UTM (`BarChart`)
- `json` — Validador de JSON (`Code`)
- `campaign-name` — Nome de Campanha (`Sparkles`)

---

## Regras

- Sem lógica real, sem integração de API, sem novas libs
- Apenas mocks
- Código limpo e preparado para evolução futura
