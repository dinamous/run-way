# Home View — Design Spec

**Data:** 2026-04-06  
**Status:** Aprovado

---

## Objetivo

Criar uma `HomeView` centralizada que serve como ponto de entrada após login e ao trocar de cliente. Resolve o problema atual onde trocar de cliente não redirecionava para nenhuma tela significativa.

---

## Arquitetura e Navegação

- `"home"` adicionado ao `ViewType` em `AppSidebar.tsx`
- Item "Início" na sidebar com ícone `Home` (lucide-react), sem `requiresClient`, sempre visível
- View padrão após login muda de `"dashboard"` para `"home"`
- Em `App.tsx`, ao chamar `setSelectedClientId`, também chama `setView("home")` automaticamente
- `canAccessFeature` não requer alteração — home não depende de cliente

**Localização:** `src/views/home/` (index.ts + HomeView.tsx + componentes internos)

---

## Layout da HomeView

Conteúdo centralizado verticalmente e horizontalmente na área de conteúdo principal:

### Saudação
- Linha principal: `"Olá, [nome do usuário]"` — fonte grande, destaque
- Subtítulo: `"Hoje é [dia] ([dia da semana]) de [mês]"` — texto secundário
- Badge sutil com nome do cliente ativo (se houver cliente selecionado)

### SearchLauncher
- Input centralizado, estilo command palette
- Ao digitar, filtra lista de ferramentas/páginas disponíveis
- Itens: Calendário, Membros, Relatórios, Clientes (e futuras ferramentas)
- Clicar em resultado chama `onViewChange(view)`
- Atalho de teclado: `/` ou `Ctrl+K` para focar o input

### QuickAccess (cards)
Grid de cards abaixo do launcher:

| Card | Ícone | Descrição | View destino | requiresClient |
|------|-------|-----------|--------------|----------------|
| Calendário | CalendarDays | Visualize demandas e fases no calendário | dashboard | sim |
| Membros | Users | Capacidade e alocação da equipe | members | sim |
| Relatórios | BarChart2 | Análise de progresso e entregas | reports | sim |
| Clientes | Building2 | Gerencie seus clientes e projetos | clients | não |

Cards sem cliente disponível ficam desabilitados com tooltip explicativo (reutiliza padrão da sidebar).

---

## Transição Blur+Fade

- Animação aplicada no `<main>` em `App.tsx` via `key={view}` (re-monta ao mudar view)
- Keyframes `blur-fade-in` definidos no CSS global (Tailwind v4 `@keyframes`)
- Ao navegar **para** home (troca de cliente): blur+fade in completo
- Ao navegar **saindo** da home (clique em card/sidebar): fade simples, mais rápido
- Keyframes: `from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); }`
- Duração: ~300ms com `ease-out`

---

## Arquivos a criar/modificar

**Criar:**
- `src/views/home/HomeView.tsx`
- `src/views/home/index.ts`
- `src/views/home/components/SearchLauncher.tsx`
- `src/views/home/components/QuickAccessCard.tsx`

**Modificar:**
- `src/components/AppSidebar.tsx` — adiciona item "Início" e `"home"` ao ViewType
- `src/App.tsx` — view padrão = `"home"`, redireciona para home ao trocar cliente
- `src/index.css` (ou equivalente) — adiciona keyframes `blur-fade-in`
