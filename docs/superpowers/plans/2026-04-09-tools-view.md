# Tools View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a view "Ferramentas" como skeleton com 5 tool cards mockados, navegável via sidebar.

**Architecture:** Nova view em `src/views/tools/` com co-location de componentes privados. Modificações mínimas nos arquivos de configuração existentes (UIStore, accessControl, AppSidebar, App.tsx). Sem lógica real — apenas mocks e estados de UI.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, lucide-react

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/views/tools/index.ts` | Criar | Re-exporta `ToolsView` |
| `src/views/tools/ToolsView.tsx` | Criar | Orquestra estado (hardcoded `'success'`) e switch de render |
| `src/views/tools/tools.mock.ts` | Criar | Array de 5 `Tool` com ícones Lucide |
| `src/views/tools/components/ToolCard.tsx` | Criar | Card individual de ferramenta |
| `src/views/tools/components/ToolGrid.tsx` | Criar | Grid responsivo de `ToolCard`s |
| `src/views/tools/components/ToolLoadingState.tsx` | Criar | 6 skeleton cards com `animate-pulse` |
| `src/views/tools/components/ToolEmptyState.tsx` | Criar | Estado vazio com ícone `Inbox` |
| `src/views/tools/components/ToolErrorState.tsx` | Criar | Estado de erro com botão outline |
| `src/store/useUIStore.ts` | Modificar | Adicionar `'tools'` ao `ViewType` |
| `src/lib/accessControl.ts` | Modificar | Adicionar regra `tools` + permissão `'view:tools'` |
| `src/components/AppSidebar.tsx` | Modificar | Adicionar item `tools` em `BASE_NAV_ITEMS` |
| `src/App.tsx` | Modificar | Importar `ToolsView` e adicionar branch `view === "tools"` |

---

## Task 1: Tipos e Mocks

**Files:**
- Create: `src/views/tools/tools.mock.ts`

- [ ] **Step 1: Criar o arquivo de mocks com tipos e dados**

```ts
// src/views/tools/tools.mock.ts
import { LinkIcon, FileText, BarChart, Code, Sparkles } from 'lucide-react'
import type React from 'react'

export type Tool = {
  id: string
  title: string
  description: string
  icon: React.ElementType
}

export type ViewState = 'loading' | 'empty' | 'error' | 'success'

export const MOCK_TOOLS: Tool[] = [
  {
    id: 'link-shortener',
    title: 'Encurtador de Link',
    description: 'Gere links curtos e rastreáveis para suas campanhas.',
    icon: LinkIcon,
  },
  {
    id: 'briefing',
    title: 'Gerador de Briefing',
    description: 'Crie briefings estruturados para novos projetos rapidamente.',
    icon: FileText,
  },
  {
    id: 'utm',
    title: 'Gerador de UTM',
    description: 'Monte parâmetros UTM para rastrear suas campanhas de marketing.',
    icon: BarChart,
  },
  {
    id: 'json',
    title: 'Validador de JSON',
    description: 'Valide e formate estruturas JSON de forma simples.',
    icon: Code,
  },
  {
    id: 'campaign-name',
    title: 'Nome de Campanha',
    description: 'Gere nomes padronizados para campanhas seguindo convenções internas.',
    icon: Sparkles,
  },
]
```

---

## Task 2: Componentes privados da view

**Files:**
- Create: `src/views/tools/components/ToolCard.tsx`
- Create: `src/views/tools/components/ToolGrid.tsx`
- Create: `src/views/tools/components/ToolLoadingState.tsx`
- Create: `src/views/tools/components/ToolEmptyState.tsx`
- Create: `src/views/tools/components/ToolErrorState.tsx`

- [ ] **Step 1: Criar `ToolCard.tsx`**

```tsx
// src/views/tools/components/ToolCard.tsx
import type { Tool } from '../tools.mock'

interface ToolCardProps {
  tool: Tool
}

export function ToolCard({ tool }: ToolCardProps) {
  const { icon: Icon, title, description } = tool
  return (
    <div className="border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-lg font-medium">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
```

- [ ] **Step 2: Criar `ToolGrid.tsx`**

```tsx
// src/views/tools/components/ToolGrid.tsx
import type { Tool } from '../tools.mock'
import { ToolCard } from './ToolCard'

interface ToolGridProps {
  tools: Tool[]
}

export function ToolGrid({ tools }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Criar `ToolLoadingState.tsx`**

```tsx
// src/views/tools/components/ToolLoadingState.tsx
export function ToolLoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 rounded bg-muted" />
            <div className="h-5 w-32 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Criar `ToolEmptyState.tsx`**

```tsx
// src/views/tools/components/ToolEmptyState.tsx
import { Inbox } from 'lucide-react'

export function ToolEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <Inbox className="w-10 h-10 text-muted-foreground" />
      <p className="text-base font-medium">Nenhuma ferramenta disponível</p>
      <p className="text-sm text-muted-foreground">Volte mais tarde para ver as ferramentas disponíveis.</p>
    </div>
  )
}
```

- [ ] **Step 5: Criar `ToolErrorState.tsx`**

```tsx
// src/views/tools/components/ToolErrorState.tsx
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

export function ToolErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <AlertTriangle className="w-10 h-10 text-destructive" />
      <p className="text-base font-medium">Erro ao carregar ferramentas</p>
      <Button variant="outline">Tentar novamente</Button>
    </div>
  )
}
```

---

## Task 3: ToolsView e index

**Files:**
- Create: `src/views/tools/ToolsView.tsx`
- Create: `src/views/tools/index.ts`

- [ ] **Step 1: Criar `ToolsView.tsx`**

```tsx
// src/views/tools/ToolsView.tsx
import type { ViewState } from './tools.mock'
import { MOCK_TOOLS } from './tools.mock'
import { ToolGrid } from './components/ToolGrid'
import { ToolLoadingState } from './components/ToolLoadingState'
import { ToolEmptyState } from './components/ToolEmptyState'
import { ToolErrorState } from './components/ToolErrorState'

const viewState: ViewState = 'success'

export function ToolsView() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ferramentas</h1>
      {viewState === 'loading' && <ToolLoadingState />}
      {viewState === 'error' && <ToolErrorState />}
      {viewState === 'empty' && <ToolEmptyState />}
      {viewState === 'success' && <ToolGrid tools={MOCK_TOOLS} />}
    </div>
  )
}
```

- [ ] **Step 2: Criar `index.ts`**

```ts
// src/views/tools/index.ts
export { ToolsView } from './ToolsView'
```

---

## Task 4: Configuração — UIStore

**Files:**
- Modify: `src/store/useUIStore.ts:4`

- [ ] **Step 1: Adicionar `'tools'` ao ViewType**

Em [src/store/useUIStore.ts](src/store/useUIStore.ts), linha 4, alterar:

```ts
export type ViewType = 'home' | 'dashboard' | 'members' | 'reports' | 'admin' | 'clients'
```

para:

```ts
export type ViewType = 'home' | 'dashboard' | 'members' | 'reports' | 'admin' | 'clients' | 'tools'
```

---

## Task 5: Configuração — accessControl

**Files:**
- Modify: `src/lib/accessControl.ts`

- [ ] **Step 1: Adicionar permissão e regra para `tools`**

Em [src/lib/accessControl.ts](src/lib/accessControl.ts):

1. Adicionar `'view:tools'` ao tipo `AppPermission` (linha 6-13):

```ts
export type AppPermission =
  | 'view:home'
  | 'view:clients'
  | 'view:dashboard'
  | 'view:members'
  | 'view:reports'
  | 'view:admin'
  | 'view:tools'
```

2. Adicionar `'view:tools'` ao set de `admin` e `user` em `ROLE_PERMISSIONS`:

```ts
const ROLE_PERMISSIONS: Record<AccessRole, ReadonlySet<AppPermission>> = {
  admin: new Set([
    'view:home',
    'view:clients',
    'view:dashboard',
    'view:members',
    'view:reports',
    'view:admin',
    'view:tools',
  ]),
  user: new Set([
    'view:home',
    'view:clients',
    'view:dashboard',
    'view:members',
    'view:reports',
    'view:tools',
  ]),
}
```

3. Adicionar regra `tools` em `VIEW_RULES`:

```ts
const VIEW_RULES: Record<ViewType, ViewRule> = {
  home: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:home' },
  clients: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:clients' },
  dashboard: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:dashboard' },
  members: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:members' },
  reports: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  admin: { requiresClient: false, roles: ['admin'], permission: 'view:admin' },
  tools: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
}
```

---

## Task 6: Configuração — AppSidebar

**Files:**
- Modify: `src/components/AppSidebar.tsx:1,35-42`

- [ ] **Step 1: Adicionar import de `Wrench` e item na nav**

Em [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx):

1. Alterar a linha 1 para incluir `Wrench`:

```ts
import { CalendarDays, Users, BarChart2, ChevronLeft, ChevronRight, Home, Building2, Settings, X, Sun, Moon, User, LogOut, Wrench } from "lucide-react";
```

2. Adicionar item ao `BASE_NAV_ITEMS` (após `clients`, antes de `admin`):

```ts
const BASE_NAV_ITEMS: { view: ViewType; label: string; Icon: React.ElementType; requiresClient?: boolean; isAdminOnly?: boolean }[] = [
  { view: "home",      label: "Início",      Icon: Home },
  { view: "dashboard", label: "Calendário",  Icon: CalendarDays, requiresClient: true },
  { view: "members",   label: "Membros",     Icon: Users, requiresClient: true },
  { view: "reports",   label: "Relatórios",  Icon: BarChart2, requiresClient: true },
  { view: "clients",   label: "Clientes",    Icon: Building2, requiresClient: false },
  { view: "tools",     label: "Ferramentas", Icon: Wrench, requiresClient: false },
  { view: "admin",     label: "Admin",       Icon: Settings, requiresClient: false, isAdminOnly: true },
];
```

---

## Task 7: Configuração — App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar `ToolsView` e adicionar branch**

Em [src/App.tsx](src/App.tsx):

1. Adicionar import após os imports de views existentes (após linha 11):

```ts
import { ToolsView } from './views/tools'
```

2. Adicionar branch no switch de views (após `view === "members"`, antes do fallback `ReportsView`):

```tsx
) : view === "members" ? (
  <MembersView />
) : view === "tools" ? (
  <ToolsView />
) : (
  <ReportsView />
```
