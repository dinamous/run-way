# GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar 6 workflows de CI no GitHub Actions cobrindo secrets, testes, lint, build, análise de vulnerabilidades, tag automática de versão e bloqueio de deploy às sextas.

**Architecture:** Um workflow reutilizável `setup-node.yml` centraliza o setup de Node/cache/npm ci, evitando repetição. Os demais workflows (`secrets.yml`, `test.yml`, `build.yml`, `codeql.yml`, `tag-version.yml`, `no-friday-deploy.yml`) são independentes, com triggers próprios e responsabilidade única.

**Tech Stack:** GitHub Actions, Gitleaks, Vitest, ESLint, Vite, TypeScript, CodeQL, salsify/action-detect-and-tag-new-version, ivanklee86/do-not-deploy-on-friday

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `.github/workflows/setup-node.yml` | Criar | Workflow reutilizável: checkout + Node 20 + cache npm + npm ci |
| `.github/workflows/secrets.yml` | Criar | Escanear secrets com Gitleaks |
| `.github/workflows/test.yml` | Criar | Jobs paralelos: Vitest + ESLint |
| `.github/workflows/build.yml` | Criar | Build de produção (tsc + vite) |
| `.github/workflows/codeql.yml` | Criar | Análise estática de vulnerabilidades |
| `.github/workflows/tag-version.yml` | Criar | Detecta bump de versão no package.json e cria tag git |
| `.github/workflows/no-friday-deploy.yml` | Criar | Bloqueia deploys às sextas-feiras |

---

### Task 1: Workflow reutilizável `setup-node.yml`

**Files:**
- Create: `.github/workflows/setup-node.yml`

- [ ] **Step 1: Criar a pasta `.github/workflows/`**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Criar `.github/workflows/setup-node.yml`**

```yaml
name: Setup Node

on:
  workflow_call:

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Cache npm
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci
```

> **Nota:** Este workflow usa `workflow_call` — ele não roda sozinho, só é chamado por outros workflows via `uses: ./.github/workflows/setup-node.yml`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/setup-node.yml
git commit -m "ci: :construction_worker: adiciona workflow reutilizável de setup Node"
```

---

### Task 2: `secrets.yml` — Verificação de secrets com Gitleaks

**Files:**
- Create: `.github/workflows/secrets.yml`

- [ ] **Step 1: Criar `.github/workflows/secrets.yml`**

```yaml
name: Secrets Scan

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  gitleaks:
    name: Gitleaks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Nota:** `fetch-depth: 0` é necessário para o Gitleaks escanear o histórico completo, não apenas o último commit.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/secrets.yml
git commit -m "ci: :lock: adiciona scan de secrets com Gitleaks"
```

---

### Task 3: `test.yml` — Testes Vitest + Lint ESLint (jobs paralelos)

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Criar `.github/workflows/test.yml`**

```yaml
name: Test & Lint

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    name: Vitest
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Cache npm
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

  lint:
    name: ESLint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Cache npm
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint
```

> **Nota:** Jobs separados (não `needs` um do outro) rodam em paralelo no GitHub Actions automaticamente. O `setup-node.yml` reutilizável não é usado aqui porque `workflow_call` como job não suporta steps adicionais no mesmo job — os steps de setup são inlineados para manter os jobs independentes.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: :white_check_mark: adiciona workflow de testes e lint"
```

---

### Task 4: `build.yml` — Build de produção

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Criar `.github/workflows/build.yml`**

```yaml
name: Build

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    env:
      VITE_SUPABASE_URL: https://placeholder.supabase.co
      VITE_SUPABASE_ANON_KEY: placeholder-anon-key
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Cache npm
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
```

> **Nota:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` recebem valores placeholder para que o Vite compile sem erro. O objetivo é verificar erros TypeScript e bundling, não conectividade real com o Supabase.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: :package: adiciona workflow de build de produção"
```

---

### Task 5: `codeql.yml` — Análise estática de vulnerabilidades

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Criar `.github/workflows/codeql.yml`**

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:javascript'
```

> **Nota:** `permissions: security-events: write` é obrigatório para o CodeQL publicar os resultados no painel de segurança do repositório. `languages: javascript` cobre TypeScript automaticamente. O schedule `0 0 * * 0` roda toda domingo à meia-noite UTC.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "ci: :shield: adiciona análise de vulnerabilidades com CodeQL"
```

---

### Task 6: `tag-version.yml` — Tag automática de versão

**Files:**
- Create: `.github/workflows/tag-version.yml`

- [ ] **Step 1: Criar `.github/workflows/tag-version.yml`**

```yaml
name: Tag Version

on:
  push:
    branches: [main]

jobs:
  tag:
    name: Detect and Tag New Version
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Detect and tag new version
        uses: salsify/action-detect-and-tag-new-version@v2
        with:
          version-command: |
            node -p "require('./package.json').version"
```

> **Nota:** `permissions: contents: write` é obrigatório para a action criar tags no repositório. A action compara a versão atual do `package.json` com a última tag. Se encontrar uma versão nova (ex: `0.0.1` → `0.1.0`), cria a tag `v0.1.0` automaticamente. Roda apenas em `push` para `main` para não criar tags de branches de feature.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/tag-version.yml
git commit -m "ci: :label: adiciona tag automática de versão via package.json"
```

---

### Task 7: `no-friday-deploy.yml` — Bloqueio de deploy às sextas

**Files:**
- Create: `.github/workflows/no-friday-deploy.yml`

- [ ] **Step 1: Criar `.github/workflows/no-friday-deploy.yml`**

```yaml
name: No Deploy on Friday

on:
  pull_request:
    branches: [main]

jobs:
  no-friday-deploy:
    name: Don't Deploy on Friday
    runs-on: ubuntu-latest
    steps:
      - name: Don't deploy on Friday
        uses: ivanklee86/do-not-deploy-on-friday@v1.2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Nota:** Esta action verifica o dia da semana (UTC) e falha o check se for sexta-feira, bloqueando o merge de PRs para `main`. Isso evita deploys arriscados antes do fim de semana. A action usa `GITHUB_TOKEN` para atualizar o status do check no PR.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/no-friday-deploy.yml
git commit -m "ci: :no_entry: bloqueia deploy às sextas com no-friday-deploy"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Verificar estrutura de arquivos**

```bash
find .github -type f | sort
```

Saída esperada:
```
.github/workflows/build.yml
.github/workflows/codeql.yml
.github/workflows/no-friday-deploy.yml
.github/workflows/secrets.yml
.github/workflows/setup-node.yml
.github/workflows/tag-version.yml
.github/workflows/test.yml
```

- [ ] **Step 2: Validar YAML de cada workflow**

```bash
# Requer actionlint instalado, ou verificar manualmente no GitHub após push
# Para instalar: https://github.com/rhysd/actionlint
# Se não tiver, pule este step e verifique pelo resultado dos workflows no GitHub
```

- [ ] **Step 3: Push para o repositório e verificar que os workflows aparecem na aba Actions do GitHub**

```bash
git push
```

Verificar em `https://github.com/<owner>/calendar-task/actions` que os workflows `Secrets Scan`, `Test & Lint`, `Build`, `CodeQL`, `Tag Version` e `No Deploy on Friday` aparecem listados.
