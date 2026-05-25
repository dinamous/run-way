---
name: Run/Way
description: Ferramenta de capacity planning para times multidisciplinares de design e desenvolvimento.
colors:
  foreground: "oklch(0.145 0 0)"
  foreground-dark: "oklch(0.985 0 0)"
  background: "oklch(0.96 0 0)"
  background-dark: "oklch(0.145 0 0)"
  surface: "oklch(1 0 0)"
  surface-dark: "oklch(0.205 0 0)"
  surface-raised: "oklch(0.92 0 0)"
  surface-raised-dark: "oklch(0.269 0 0)"
  muted-text: "oklch(0.48 0 0)"
  muted-text-dark: "oklch(0.708 0 0)"
  border: "oklch(0.87 0 0)"
  border-dark: "oklch(0.269 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  destructive-dark: "oklch(0.704 0.191 22.216)"
typography:
  display:
    fontFamily: "'Syne', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "0.125rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "oklch(0.25 0 0)"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Run/Way

## 1. Overview

**Creative North Star: "A Pista de Controle"**

O Run/Way não é um dashboard. É um painel operacional, projetado para quem precisa de informação imediata, não de exploração. A metáfora é uma torre de controle: cada elemento tem uma posição fixa, cada cor tem um significado, e a ausência de ruído visual é parte do trabalho. O olhar do usuário deve chegar na informação certa em menos de três segundos.

A paleta é restrita e inteiramente tonal: preto, branco e uma escala de cinzas com chroma zero. Não há cor de acento decorativa. A cor aparece apenas para comunicar estado (fase da subtask, erro, sucesso) e nunca para criar hierarquia visual por si só. Esse comprometimento com o tonal é deliberado: em uma ferramenta de planejamento carregada de dados, cor com significado precisa de espaço para respirar.

O sistema rejeita explicitamente: o peso visual do Jira e Azure DevOps; a vibração cromática do Monday e Asana; o colapso estrutural do Notion; e a genericidade dos dashboards corporativos com hero-metric e card grids idênticos.

**Key Characteristics:**
- Tonal absoluto: chroma zero em todos os neutros
- Tipografia dual: Syne 800 exclusivo para a marca, DM Sans para tudo mais
- Densidade com respiro: informação compacta, espaçamento variado
- Estado sempre visível sem hover obrigatório
- Flat por disposição, sombra como separação estrutural (não decoração)

## 2. Colors: A Escala Tonal

A paleta é monocromática e tonal. Não há acento cromático global; cor aparece apenas em badges de status de subtask (fases de entrega).

### Primary
- **Carvão Profundo** (`oklch(0.145 0 0)`): foreground principal em light mode. Texto, ícones, botão primário de fundo. Usado para comunicar autoridade e clareza.
- **Branco Quase Puro** (`oklch(0.985 0 0)`): foreground em dark mode. Mesmo papel, polaridade invertida.

### Neutral
- **Cinza Página** (`oklch(0.96 0 0)`): background da aplicação em light mode. A tela de trabalho.
- **Noite Profunda** (`oklch(0.145 0 0)`): background em dark mode.
- **Superfície Branca** (`oklch(1 0 0)`): cards, modais, popovers em light mode. Um grau acima do fundo.
- **Superfície Elevada** (`oklch(0.205 0 0)`): cards em dark mode.
- **Cinza Secundário** (`oklch(0.92 0 0)`): muted, accent, secondary backgrounds. Hover suave, chips inativos.
- **Texto Atenuado** (`oklch(0.48 0 0)`): muted-foreground em light; `oklch(0.708 0 0)` em dark. Metadados, labels secundários.
- **Borda Estrutural** (`oklch(0.87 0 0)`): border e input em light; `oklch(0.269 0 0)` em dark. Divisores e contornos de campo.

### Status (subtask phases)
Usados exclusivamente em badges de fase. Não extravasar para outros contextos.
- **Azul Análise** (`blue-100/blue-800`): análise UX e dev
- **Amarelo Aprovação** (`yellow-100/yellow-800`): aprovação de design
- **Roxo Dev** (`purple-100/purple-800`): desenvolvimento
- **Verde QA** (`green-100/green-800`): QA, publicação

### Named Rules
**A Regra do Tonal Absoluto.** Nenhum acento cromático aparece fora de badges de status. Se a tentação for adicionar "um toque de cor" para hierarquia visual, a resposta é peso tipográfico ou escala, nunca cor.

**A Regra da Cor com Significado.** Cada cor de status tem um domínio exclusivo. Não reutilizar azul de análise para links, nem verde de QA para sucesso genérico. A escassez mantém o significado.

## 3. Typography

**Display Font:** Syne (800 weight) — exclusivo para o logotipo "Run/Way"
**Body Font:** DM Sans (regular, medium, semibold) — toda a interface

**Character:** Syne em 800 é largo e assertivo; aparece uma única vez por tela, no cabeçalho de navegação. DM Sans é humanista e legível a tamanhos pequenos; carrega toda a densidade informacional do app sem fadiga. O contraste entre as duas fontes não é para efeito: é distinção de identidade versus informação.

### Hierarchy
- **Display** (Syne 800, 1.5rem, lh 1.1): nome da marca no AppHeader e LoginView. Proibido em qualquer outro contexto.
- **Title** (DM Sans 600, 1.125rem, lh 1.3): títulos de seção, headings de modal, nome de tarefa em destaque.
- **Body** (DM Sans 400, 0.875rem, lh 1.5): todo o conteúdo de interface. Máximo 65–75ch por linha.
- **Label** (DM Sans 500, 0.75rem, ls 0.01em): metadados, timestamps, contadores, labels de campo.

### Named Rules
**A Regra da Fonte Única da Marca.** Syne 800 pertence ao nome "Run/Way". Usar Syne em qualquer outro elemento é diluir a identidade. DM Sans é a fonte de trabalho; Syne é o selo.

## 4. Elevation

O sistema usa sombra como separação estrutural, não como efeito decorativo. Superfícies são diferenciadas principalmente por tonalidade de fundo (background → surface → surface-raised), com uma sombra sutil nos cards para ancorá-los visualmente na página.

**Filosofia:** a sombra não cria drama. Ela cria separação legível entre a página e o conteúdo interativo. Em dark mode, a separação é feita prioritariamente por tonalidade (dark surfaces mais claras que o background), com sombra reduzida.

### Shadow Vocabulary
- **Separação de Card** (`box-shadow: 0 1px 3px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.06)`): cards de demanda, painéis laterais, modais. Presente em repouso.
- **Popover / Dropdown** (`box-shadow: 0 4px 16px oklch(0 0 0 / 0.10)`): menus flutuantes, tooltips, popovers. Presença mais forte por estarem acima do conteúdo.

### Named Rules
**A Regra da Sombra Estrutural.** Sombra aparece apenas em superfícies que se separam do fundo (cards, modais, dropdowns). Nunca em texto, ícones, divisores ou bordas. Sombra não é estilo; é hierarquia espacial.

## 5. Components

### Buttons
Contidos e precisos. Altura 36px padrão, raio 6px, transição de 150ms ease-out.
- **Shape:** gently rounded (6px, `rounded-md`)
- **Primary:** fundo Carvão Profundo, texto branco, padding 8px 16px. Hover: `oklch(0.25 0 0)` (um grau mais claro). O botão primário é raro: apenas a ação mais importante da tela.
- **Secondary:** fundo Cinza Secundário, texto Carvão Profundo. Para ações de suporte.
- **Outline:** borda Borda Estrutural, fundo transparente. Para ações terciárias.
- **Ghost:** sem borda nem fundo. Hover em Cinza Secundário. Para ações contextuais inline.
- **Destructive:** fundo `oklch(0.577 0.245 27.325)` (vermelho), texto branco. Apenas para ações irreversíveis com confirmação.
- **Focus:** ring 3px em `ring/50` — visível e acessível, sem distorcer o layout.
- **Loading state:** ícone Loader2 animado substitui o conteúdo; `aria-busy=true`.

### Cards / Containers
- **Corner Style:** gently rounded (8px, `rounded-lg`)
- **Background:** Superfície Branca em light / Superfície Elevada em dark
- **Shadow Strategy:** Separação de Card (sempre presente, não apenas no hover)
- **Border:** border Borda Estrutural para reforço em contextos densos
- **Internal Padding:** 24px padrão (`p-6`); reduzir para 16px em cards compactos de lista

### Inputs / Fields
- **Style:** borda Borda Estrutural (1px), fundo background, raio 6px, altura 36px
- **Focus:** ring 1px em `ring` (sem glow excessivo). A borda fica em ring-color.
- **Placeholder:** texto em muted-foreground
- **Disabled:** `opacity-50`, cursor-not-allowed
- **Error:** borda e ring em destructive

### Badges (Status de Fase)
- **Shape:** pill (rounded-full), padding 2px 10px, texto 12px semibold
- **Color:** variantes semânticas por fase (design, approval, dev, qa). Sempre com fundo tonal, texto escuro. Nunca filled com cor saturada pura.
- **Regra:** badges de status são os únicos portadores de cor cromática. Nenhum outro componente usa cor de fundo não-tonal.

### Navigation (AppHeader)
- **Style:** barra horizontal superior, fundo surface, border-bottom em Borda Estrutural
- **Logo:** ícone LayoutDashboard em box preta (light) / box branca (dark), nome "Run/Way" em Syne 800
- **Links:** DM Sans 500, 14px. Estado ativo: foreground + indicador (underline ou background sutil). Hover: background em Cinza Secundário.

### ViewTabs
Abas de navegação entre views (Calendar, Timeline, Lista). Estilo pill ou underline por contexto. Estado ativo em foreground; inativo em muted-foreground. Sem borda lateral nem stripe colorida.

## 6. Do's and Don'ts

### Do:
- **Do** usar peso tipográfico (600 vs 400) para criar hierarquia antes de usar cor.
- **Do** variar padding e espaçamento entre seções para criar ritmo visual. Monotonia é padding igual em tudo.
- **Do** exibir estados (bloqueado, atrasado, em andamento) sem dependência de hover. O estado deve ser legível no scroll.
- **Do** manter bordas finas (1px) e raios consistentes com a escala (`rounded-md` para campos, `rounded-lg` para cards).
- **Do** usar a animação `blur-fade-in` para entradas de conteúdo assíncrono (300ms ease-out).
- **Do** suportar `prefers-reduced-motion`: remover animações não essenciais quando ativo.
- **Do** garantir contraste mínimo 4.5:1 para texto e 3:1 para elementos UI. WCAG 2.1 AA é o piso, não o teto.

### Don't:
- **Don't** usar Syne em qualquer elemento que não seja o nome "Run/Way". É a fonte exclusiva da marca.
- **Don't** adicionar cor cromática fora de badges de status de fase. Nenhum acento azul para links, nenhum verde para confirmação genérica.
- **Don't** criar grids de cards idênticos com ícone + título + texto repetidos. É o padrão genérico de dashboard corporativo que o Run/Way rejeita.
- **Don't** usar `border-left` maior que 1px como stripe colorida de acento em cards, alertas ou itens de lista. Nunca.
- **Don't** aplicar glassmorphism, blur decorativo ou gradiente de texto. Nenhum dos três.
- **Don't** construir um "hero metric" (número grande + label pequeno + stats de suporte). É o template SaaS que o Run/Way recusa.
- **Don't** usar modal como primeira resposta a uma ação. Esgote alternativas inline ou progressivas antes.
- **Don't** fazer o app parecer o Jira (menus pesados aninhados), o Monday (paleta vibrante), o Notion (sem estrutura visual) ou um BI tool genérico. Esses são os anti-references nomeados no PRODUCT.md e valem aqui com a mesma força.
