# GitHub Actions CI — Design Spec

**Data:** 2026-04-10  
**Status:** Aprovado

## Objetivo

Configurar 4 workflows independentes de CI no GitHub Actions para o projeto Run/Way, cobrindo:
1. Detecção de secrets vazados (Gitleaks)
2. Testes automatizados (Vitest) + Lint (ESLint)
3. Build de produção (tsc + vite build)
4. Análise de vulnerabilidades de código (CodeQL)

## Workflows Reutilizáveis (DRY)

Para evitar repetição de steps de setup (checkout + Node + cache npm), será criado um workflow reutilizável:

**`.github/workflows/setup-node.yml`** — chamado pelos workflows de test, lint e build:
- `actions/checkout@v4`
- `actions/setup-node@v4` com Node 20 LTS
- `actions/cache@v4` para `~/.npm` com chave baseada em `package-lock.json`
- `npm ci`

Os workflows que precisam de Node chamam este via `uses: ./.github/workflows/setup-node.yml`.

---

## Workflows

### 1. `secrets.yml` — Verificação de Secrets

**Trigger:**
- `push` em qualquer branch
- `pull_request` com destino `main`

**Tool:** Gitleaks via `gitleaks/gitleaks-action@v2`

**Comportamento:** Escaneia o diff do commit/PR em busca de chaves de API, tokens, URLs com credenciais embutidas (incluindo variáveis Supabase como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).

**Falha:** A action falha e bloqueia o merge se encontrar um secret.

---

### 2. `test.yml` — Testes + Lint

**Trigger:**
- `push` em qualquer branch
- `pull_request` com destino `main`

**Setup:** Usa o workflow reutilizável `setup-node.yml`

**Jobs (em paralelo):**

- **`test`**
  1. Setup via `setup-node.yml`
  2. `npm run test:run` (Vitest em modo não-interativo)

- **`lint`**
  1. Setup via `setup-node.yml`
  2. `npm run lint` (ESLint)

**Falha:** Cada job falha independentemente.

---

### 3. `build.yml` — Build de Produção

**Trigger:**
- `push` em qualquer branch
- `pull_request` com destino `main`

**Setup:** Usa o workflow reutilizável `setup-node.yml`

**Steps:**
1. Setup via `setup-node.yml`
2. `npm run build` → executa `tsc -b && vite build`

**Variáveis de ambiente:** Valores placeholder para `VITE_*` (ex: `VITE_SUPABASE_URL=https://placeholder.supabase.co`) para que o build compile sem erro de runtime.

**Falha:** Falha em erros de TypeScript ou bundling.

---

### 4. `codeql.yml` — Análise de Vulnerabilidades

**Trigger:**
- `push` em `main`
- `pull_request` com destino `main`
- Schedule: toda domingo às 00:00 UTC (`0 0 * * 0`)

**Tool:** CodeQL via `github/codeql-action`

**Linguagem:** `javascript` (cobre TypeScript automaticamente)

**Queries:** `security-extended` (cobertura além do padrão, inclui XSS, injection, etc.)

**Falha:** Falha se encontrar vulnerabilidades de alta severidade.

---

## Estrutura de Arquivos

```
.github/
  workflows/
    setup-node.yml   ← workflow reutilizável (chamado pelos demais)
    secrets.yml
    test.yml
    build.yml
    codeql.yml
```

## Decisões

- **4 arquivos separados:** responsabilidade única, falha isolada, fácil de iterar
- **Workflow reutilizável `setup-node.yml`:** evita repetição de checkout + Node + cache nos workflows de test, lint e build (DRY)
- **Cache npm** via `actions/cache` com chave em `package-lock.json` — reutiliza o cache entre runs quando as dependências não mudaram
- **Gitleaks** escolhido pela action oficial pronta e zero config
- **Jobs paralelos** em `test.yml` para feedback mais rápido
- **CodeQL separado** com schedule semanal para análise profunda sem impactar velocidade do CI diário
