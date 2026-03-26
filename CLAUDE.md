# CLAUDE.md — Capacity Dashboard

## Visão Geral

Aplicação web de gestão de capacidade de equipa (capacity planning). Permite criar e gerir "demandas" (tarefas/projetos) com fases de entrega, visualizar em calendário mensal ou timeline tipo Gantt, e sincronizar os dados com Google Drive.

**Stack:** React 19 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4 · `@react-oauth/google`

---

## Comandos Essenciais

```bash
npm run dev       # servidor de desenvolvimento (localhost:5173)
npm run build     # build de produção (tsc + vite build)
npm run lint      # ESLint
npm run preview   # pré-visualizar build de produção
```

---

## Estrutura do Projeto

```
src/
├── App.tsx                   # Root: providers, estado global, header, roteamento de views
├── main.tsx                  # Entry point React
├── components/
│   ├── TaskModal.tsx         # Modal criar/editar demanda
│   └── ui/                   # Design system básico
│       ├── Button.tsx        # Variantes: primary, secondary, outline, destructive, ghost
│       ├── Input.tsx         # Input genérico
│       ├── Label.tsx         # Label com peer-disabled
│       ├── Badge.tsx         # Variantes: default, design, approval, dev, qa
│       └── index.ts          # Barrel export
├── views/
│   ├── DashboardView.tsx     # Calendário mensal + Timeline (Gantt 60 dias)
│   └── MembersView.tsx       # Visão de capacidade por membro
├── hooks/
│   └── useGoogleDrive.ts     # Integração Google Drive API v3
├── utils/
│   └── dateUtils.ts          # Utilitários de datas úteis (business days)
└── data/
    └── mock.ts               # Placeholder para dados mock
```

---

## Modelo de Dados

### Task (Demanda)

```typescript
{
  id: string;                   // crypto.randomUUID()
  title: string;                // Mín. 3 caracteres
  clickupLink?: string;         // URL opcional (deve começar com "http")
  assignee: string;             // ID do membro (ver DEFAULT_MEMBERS)
  status: 'backlog' | 'em andamento' | 'bloqueado' | 'concluído';
  phases: {
    design:   { start: string; end: string };  // YYYY-MM-DD
    approval: { start: string; end: string };
    dev:      { start: string; end: string };
    qa:       { start: string; end: string };
  };
  createdAt: string;            // ISO string
}
```

### Member

```typescript
{
  id: string;
  name: string;
  role: 'Designer' | 'Developer';
  avatar: string;  // iniciais (ex: 'AD')
}
```

### Fases e Durações Padrão (dias úteis)

| Fase     | Duração | Cor           |
|----------|---------|---------------|
| Design   | 5 dias  | Violeta       |
| Approval | 3 dias  | Laranja       |
| Dev      | 7 dias  | Azul céu      |
| QA       | 3 dias  | Esmeralda     |

Quando o início do Design muda, todas as fases seguintes são recalculadas automaticamente (`cascadePhases`).

---

## Integração Google Drive

- **Ficheiro:** `capacity-tasks.json`
- **Caminho no Drive:** `Projeto web/dados/capacity-tasks.json`
- **Formato JSON guardado:**
  ```json
  { "tasks": [...], "members": [...], "lastSync": "ISO string" }
  ```
- **Scopes OAuth:** `drive` + `userinfo.email`
- Ao criar o ficheiro pela primeira vez, é partilhado com o domínio do utilizador (organizações Google Workspace)
- Token armazenado apenas em memória (React state), não em localStorage

---

## Variáveis de Ambiente

```bash
VITE_GOOGLE_CLIENT_ID=...   # Google OAuth 2.0 Client ID
```

Ficheiro `.env` na raiz. **Nunca commitar o `.env`** (já está no `.gitignore`).

---

## Convenções e Padrões

- **Idioma da UI:** Português PT (BR no conteúdo)
- **Datas:** sempre no formato `YYYY-MM-DD`; usar `toLocalDate(str)` no DashboardView para evitar problemas de timezone (`new Date(str + 'T00:00:00')`)
- **Componentes UI:** usar os de `src/components/ui/` antes de criar novos
- **Tipos:** o projeto usa `any` em alguns sítios por design (dados vindos do Drive sem schema fixo); não adicionar tipagem desnecessária nestes casos
- **Tailwind v4:** configuração via plugin Vite, sem ficheiro `tailwind.config.js`
- **Print/Export PDF:** o header e controlos têm `print:hidden`; as views renderizam corretamente ao imprimir

---

## Lógica Crítica

### Cascata de Fases (`TaskModal.tsx`)
Ao alterar o **início** de uma fase, a sua duração é preservada e todas as fases seguintes avançam. Ao alterar o **fim**, só essa fase muda (sem cascata para trás).

### Slot Algorithm (`DashboardView.tsx`)
Cada célula de dia no calendário suporta até `MAX_SLOTS = 3` barras de fases sobrepostas. O algoritmo aloca slots por ordem de início. Quando há mais de 3, mostra indicador de overflow.

### Capacidade de Membros (`MembersView.tsx`)
- **Verde (Livre):** 0-2 tarefas ativas
- **Azul (Alocado):** 3 tarefas ativas
- **Vermelho (Sobrecarregado):** >3 tarefas ativas

---

## Documentação Adicional

- [docs/architecture.md](docs/architecture.md) — diagrama de componentes e fluxo de dados
- [docs/google-drive.md](docs/google-drive.md) — detalhe da integração Google Drive
- [docs/date-utils.md](docs/date-utils.md) — referência das funções de datas úteis
- [docs/ui-components.md](docs/ui-components.md) — guia do design system
