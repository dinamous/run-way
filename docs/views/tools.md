# ToolsView — Ferramentas Utilitárias

## Visão Geral

View de ferramentas. A navegação entre ferramentas é feita via **roteamento global** (`useUIStore`): cada ferramenta tem uma `ViewType` própria (`tools-briefing-analyzer`, `tools-import`, `tools-export`, `tools-integrations`). A sidebar lista as ferramentas como subviews do grupo "Ferramentas". `ToolsView` recebe a prop `subview?: ToolsSubview` e renderiza diretamente a ferramenta correspondente.

## Estrutura de Arquivos

```
src/views/tools/
├── ToolsView.tsx                        # Root: gerencia activeTool, renderiza grid ou subview
├── index.ts
├── tools.mock.ts                        # Lista de ferramentas (Tool[]) — substituto de fetch real
└── components/
    ├── ToolCard.tsx                     # Card clicável; prop onClick?: () => void
    ├── ToolGrid.tsx                     # Grid de cards; prop onSelectTool: (id) => void
    ├── ToolLoadingState.tsx
    ├── ToolEmptyState.tsx
    ├── ToolErrorState.tsx
    └── BriefingAnalyzerView.tsx         # Subview: Analisador de Briefing
```

## Padrão de Navegação

A navegação é via `useUIStore`. A sidebar chama `setView('tools-briefing-analyzer')` etc. `App.tsx` repassa `subview` para `ToolsView`:

```tsx
// App.tsx
view === "tools-briefing-analyzer" → <ToolsView subview="tools-briefing-analyzer" />
view === "tools"                   → <ToolsView />  // grid

// ToolsView.tsx
interface ToolsViewProps {
  subview?: 'tools-briefing-analyzer' | 'tools-import' | 'tools-export' | 'tools-integrations'
}

if (subview === 'tools-briefing-analyzer') {
  return <BriefingAnalyzerView onBack={() => setView('tools')} />
}
```

Para adicionar uma nova ferramenta: registrar nova `ViewType` em `useUIStore`, adicionar entrada em `VIEW_RULES` em `accessControl.ts`, adicionar item em `NAV_ITEMS` da sidebar, e tratar o `subview` em `ToolsView`.

## tools.mock.ts

Tipo `Tool`:
```ts
type Tool = {
  id: string
  title: string
  description: string
  icon: React.ElementType  // ícone Lucide
}
```

Ferramentas registradas:

| id | Título |
|---|---|
| `link-shortener` | Encurtador de Link |
| `briefing` | Gerador de Briefing |
| `utm` | Gerador de UTM |
| `json` | Validador de JSON |
| `campaign-name` | Nome de Campanha |
| `briefing-analyzer` | Analisador de Briefing ✓ implementado |

## BriefingAnalyzerView

Converte um briefing desestruturado em escopo técnico formatado para o time. Suporta **5 escopos de aplicação** selecionáveis via pill buttons acima do textarea.

### Layout

**Barra de ações** (topo, `shrink-0`): breadcrumb `Ferramentas › Analisador de Briefing` à esquerda — "Ferramentas" é clicável (`onBack`), item atual em `text-foreground font-medium`; badge de bloqueio técnico + botão "Copiar escopo" à direita.

**Seletor de escopo** (linha de pills): botões `webdev | uiux | midias | audiovisual | financeiro`. Escopo ativo em `bg-foreground text-background`; inativos em `bg-muted`. Trocar o escopo limpa o checklist e troca a função de análise — o textarea é preservado.

**3 colunas** abaixo do seletor — em desktop (`lg`), altura fixa `lg:h-[calc(100vh-8rem)]` para caber sem scroll externo. Em mobile, colunas empilhadas com alturas mínimas e scroll natural da página.

| Coluna | Props grid | Conteúdo |
|---|---|---|
| Esquerda | `col-span-4` | Textarea (`flex-1 min-h-52 lg:min-h-0`) + 3 cards de meta |
| Centro | `col-span-3` | Score + checklist (varia por escopo) + sub-métricas (card com `overflow-y-auto`) |
| Direita | `col-span-5` | Alertas de bloqueio + escopo gerado (card com `overflow-y-auto`, `min-h-64` em mobile) |

### Escopos disponíveis

Cada escopo define seu próprio `checklist: ChecklistItem[]` e função `analyze(text): AnalysisResult | null`.

| id | Label | Ícone (Lucide) | Checklist | Função |
|---|---|---|---|---|
| `webdev` | Web Dev | `Code2` | 16 itens | `analyzeWebDev` |
| `uiux` | UI/UX | `Monitor` | 10 itens | `analyzeUiUx` |
| `midias` | Mídias | `Image` | 9 itens | `analyzeMidias` |
| `audiovisual` | Audiovisual | `Film` | 9 itens | `analyzeAudiovisual` |
| `financeiro` | Financeiro | `DollarSign` | 8 itens | `analyzeFinanceiro` |

Todos os escopos compartilham o mesmo `AnalysisResult` e o mesmo layout de 3 colunas. Para adicionar um novo escopo: criar checklist + função de análise, registrar em `SCOPES[]`.

### Tipo `ScopeOption`

```ts
interface ScopeOption {
  id: ScopeId            // 'webdev' | 'uiux' | 'midias' | 'audiovisual' | 'financeiro'
  label: string
  icon: React.ReactNode
  checklist: ChecklistItem[]
  analyze: (text: string) => AnalysisResult | null
}
```

### Análise (funções por escopo)

Toda a lógica é **client-side, sem API**. Executada reativamente a cada keystroke — `result = scope.analyze(input)` — onde `scope` é o elemento ativo de `SCOPES[]`.

Retorna `AnalysisResult | null`:
```ts
interface AnalysisResult {
  output: string               // escopo técnico formatado (seções variam por escopo)
  checklist: ChecklistResults  // { [itemId]: boolean }
  metrics: {
    clarity: number        // score 0–100 (soma ponderada dos itens — peso varia por escopo)
    seoRisk: number        // relevante apenas em webdev; 0 nos demais
    contentReady: number   // 0–100 baseado em prontidão de conteúdo/assets
  }
  meta: { solicitor, deadline, deadlineMissing, urgency }
  alerts: AlertItem[]      // bloqueios ('destructive') e avisos ('warning')
  hasCritical: boolean
}
```

### Checklist — Web Dev (16 itens)

`CHECKLIST_WEBDEV`. Itens: `url_source`, `url_target`, `repo`, `environment`, `stack`, `tracking`, `seo`, `form_crm`, `copy`, `assets`, `deadline`, `persona`, `cta`, `brand`, `device`, `figma_deadline`.

Score máx ≈ 100 (pesos: 8 para url_source/url_target/repo/copy/persona/cta; 6 para environment/stack/tracking/seo/form_crm/brand; 4 para assets/deadline/device/figma_deadline).

Escopo gerado: 9 seções (Identificação · O que fazer · Briefing Designer · Infraestrutura/Deploy · Dados/Tracking · Conteúdo · Dependências · Fora do Escopo · Critérios de Aceitação).

### Checklist — UI/UX (10 itens)

`CHECKLIST_UIUX`. Itens: `objective`, `persona`, `flows`, `brand`, `device`, `deadline_figma`, `stakeholders`, `research`, `constraints`, `assets`.

Score máx 100 (pesos: 20 objective, 15 persona/flows/brand, 10 device/deadline_figma, 5 stakeholders/research, 3 constraints, 2 assets).

Escopo gerado: 6 seções (Identificação · Objetivo e Contexto · Escopo do Figma · Assets · Dependências · Critérios de Aceitação).

### Checklist — Mídias (9 itens)

`CHECKLIST_MIDIAS`. Itens: `format`, `brand`, `copy`, `assets`, `channels`, `persona`, `objective`, `deadline`, `approval`.

Score máx 100 (pesos: 20 format/brand, 15 copy, 10 assets/channels/persona/objective, 3 deadline, 2 approval).

Escopo gerado: 6 seções (Identificação · Objetivo e Audiência · Conteúdo e Assets · Aprovação · Dependências · Critérios de Aceitação).

### Checklist — Audiovisual (9 itens)

`CHECKLIST_AV`. Itens: `format`, `objective`, `script`, `brand`, `location`, `cast`, `deadline`, `distribution`, `approval`.

Score máx 100 (pesos: 20 format/script, 15 objective, 10 brand/location/distribution, 5 cast/deadline/approval).

Escopo gerado: 6 seções (Identificação · Formato e Objetivo · Pré-Produção · Assets de Referência · Dependências · Critérios de Aceitação).

### Checklist — Financeiro (8 itens)

`CHECKLIST_FIN`. Itens: `type`, `value`, `costcenter`, `approver`, `deadline`, `docs`, `supplier`, `recurrence`.

Score máx 100 (pesos: 20 type/value, 15 costcenter/approver, 10 deadline/docs, 5 supplier/recurrence).

Escopo gerado: 5 seções (Identificação · Detalhes da Demanda · Aprovação · Dependências · Critérios de Aceitação).

### Score de Qualidade Técnica

Cor da barra (compartilhada por todos os escopos): vermelho < 40%, âmbar 40–75%, verde > 75%.

### Componentes Internos

- `SectionLabel` — label de seção com `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- `MetricRow` — linha de sub-métrica com label, barra e valor; usa `Tooltip` do Radix via `@/components/ui/Tooltip`
- Usa `Button`, `Card/CardContent`, `Badge` de `@/components/ui/` — sem estilos manuais de botão/card
- Cores semânticas via design tokens (`text-destructive`, `bg-destructive/5`, `bg-muted`, etc.) — sem classes `dark:` hardcoded
