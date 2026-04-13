# Deploy Vercel + Ambiente de Homologação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar Run/Way na Vercel com dois ambientes separados (produção e homologação) usando domínio customizado da HostGator.

**Architecture:** Dois projetos Vercel independentes conectados ao mesmo repositório GitHub — um na branch `main` (produção) e outro na branch `develop` (homologação). Cada projeto tem suas próprias env vars apontando para projetos Supabase distintos. Domínios customizados via CNAME no DNS da HostGator.

**Tech Stack:** Vercel, Supabase, HostGator DNS, GitHub Actions, Vite (`VITE_*` env vars)

---

## Arquivos modificados

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `.github/workflows/test.yml` | Modificar | Adicionar `develop` como branch alvo de PRs |
| `.github/workflows/secrets.yml` | Modificar | Adicionar `develop` como branch alvo de PRs |

> As demais tarefas são configuração em serviços externos (Vercel, Supabase, HostGator).

---

## Task 1: Criar branch `develop`

**Files:**
- Nenhum arquivo modificado

- [ ] **Step 1: Criar e publicar branch `develop` a partir de `main`**

```bash
git checkout main
git pull origin main
git checkout -b develop
git push origin develop
```

Expected: branch `develop` criada localmente e publicada no GitHub.

- [ ] **Step 2: Verificar no GitHub**

Acesse `github.com/<seu-usuario>/run-way/branches` e confirme que `develop` aparece na lista.

---

## Task 2: Criar projeto Supabase de homologação

**Files:**
- Nenhum arquivo no repositório

- [ ] **Step 1: Criar novo projeto no Supabase**

Acesse [supabase.com](https://supabase.com) → "New project".
- Nome: `run-way-homol`
- Região: mesma do projeto de produção
- Senha do banco: gere uma senha forte e guarde em local seguro

- [ ] **Step 2: Copiar credenciais**

No dashboard do novo projeto: Settings → API.
Copie e guarde em local seguro (serão usadas na Task 4):
- `Project URL` → será o valor de `VITE_SUPABASE_URL` de homol
- `anon public` key → será o valor de `VITE_SUPABASE_ANON_KEY` de homol

- [ ] **Step 3: Replicar o schema**

No painel do projeto de homol, acesse SQL Editor e execute as mesmas migrations que existem em produção.

Se você tiver um arquivo de migrations local (ex: `supabase/migrations/`), execute:
```bash
# Se usar Supabase CLI
supabase db push --db-url "postgresql://postgres:<senha>@<host>:5432/postgres"
```

Ou copie e execute manualmente o SQL das suas migrations no SQL Editor do Supabase.

---

## Task 3: Criar projeto Vercel de produção

**Files:**
- Nenhum arquivo no repositório

- [ ] **Step 1: Importar repositório na Vercel**

Acesse [vercel.com](https://vercel.com) → "Add New Project" → "Import Git Repository".
- Selecione o repositório `run-way`
- Framework Preset: **Vite** (Vercel detecta automaticamente)
- Root Directory: `/` (padrão)
- Build Command: `npm run build` (padrão)
- Output Directory: `dist` (padrão)

- [ ] **Step 2: Configurar env vars de produção**

Na tela de configuração do projeto (antes de fazer deploy), adicione as variáveis de ambiente:
- `VITE_SUPABASE_URL` = URL do seu projeto Supabase de **produção**
- `VITE_SUPABASE_ANON_KEY` = chave anon do seu projeto Supabase de **produção**

Marque o escopo como **Production** (e também Preview/Development se desejar).

- [ ] **Step 3: Deploy inicial**

Clique em "Deploy". Aguarde o build concluir (≈1-2 min).

Expected: build verde, URL temporária da Vercel funcionando (ex: `run-way-xxx.vercel.app`).

- [ ] **Step 4: Renomear projeto**

Em Settings → General → Project Name: renomeie para `run-way-prod`.

- [ ] **Step 5: Configurar branch de produção**

Em Settings → Git → Production Branch: confirme que está `main`.

---

## Task 4: Criar projeto Vercel de homologação

**Files:**
- Nenhum arquivo no repositório

- [ ] **Step 1: Importar o mesmo repositório novamente**

Acesse [vercel.com](https://vercel.com) → "Add New Project" → "Import Git Repository".
- Selecione o mesmo repositório `run-way`
- Mesmas configurações de build (Vite, `npm run build`, output `dist`)

- [ ] **Step 2: Configurar env vars de homologação**

Adicione as variáveis de ambiente com as credenciais do Supabase de **homologação** (copiadas na Task 2, Step 2):
- `VITE_SUPABASE_URL` = URL do projeto Supabase de homol
- `VITE_SUPABASE_ANON_KEY` = chave anon do projeto Supabase de homol

- [ ] **Step 3: Deploy inicial**

Clique em "Deploy". Aguarde o build concluir.

Expected: build verde, URL temporária funcionando.

- [ ] **Step 4: Renomear projeto e ajustar branch**

- Settings → General → Project Name: `run-way-homol`
- Settings → Git → Production Branch: mude para `develop`

Expected: a partir de agora, pushes para `develop` ativam deploy neste projeto.

---

## Task 5: Configurar domínios customizados na Vercel

**Files:**
- Nenhum arquivo no repositório

> Substitua `seudominio.com` pelo seu domínio real da HostGator nos passos abaixo.

- [ ] **Step 1: Adicionar domínio ao projeto de produção**

No projeto `run-way-prod` → Settings → Domains → "Add Domain".
- Digite: `runway.seudominio.com`
- Vercel exibirá um registro CNAME para configurar no DNS.
  Anote o valor exato mostrado (geralmente `cname.vercel-dns.com`).

- [ ] **Step 2: Adicionar domínio ao projeto de homologação**

No projeto `run-way-homol` → Settings → Domains → "Add Domain".
- Digite: `homol.runway.seudominio.com`
- Anote o registro CNAME exibido.

---

## Task 6: Configurar DNS no HostGator

**Files:**
- Nenhum arquivo no repositório

- [ ] **Step 1: Acessar painel DNS do HostGator**

Acesse [hpanel.hostgator.com](https://hpanel.hostgator.com) → Domínios → selecione seu domínio → DNS Zone Editor (ou "Gerenciar DNS").

- [ ] **Step 2: Adicionar registro CNAME para produção**

Clique em "Add Record" (ou equivalente):
- Type: `CNAME`
- Name/Host: `runway` (sem o domínio raiz — o painel adiciona automaticamente)
- Value/Points to: `cname.vercel-dns.com`
- TTL: 3600 (ou o padrão)

- [ ] **Step 3: Adicionar registro CNAME para homologação**

- Type: `CNAME`
- Name/Host: `homol.runway`
- Value/Points to: `cname.vercel-dns.com`
- TTL: 3600

- [ ] **Step 4: Aguardar propagação DNS**

A propagação pode levar de alguns minutos até 24h. Para verificar:
```bash
nslookup runway.seudominio.com
# Expected: retorna CNAME apontando para Vercel
```

Ou use [whatsmydns.net](https://www.whatsmydns.net) para verificar propagação global.

- [ ] **Step 5: Verificar SSL na Vercel**

Após propagação, acesse Settings → Domains em cada projeto Vercel.
Expected: status verde "Valid Configuration" e cadeado SSL ativo.

Teste nos navegadores:
- `https://runway.seudominio.com` → abre Run/Way (produção)
- `https://homol.runway.seudominio.com` → abre Run/Way (homologação)

---

## Task 7: Atualizar workflows de CI para branch `develop`

**Files:**
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/secrets.yml`

- [ ] **Step 1: Atualizar `test.yml`**

Altere o trigger `pull_request` para incluir `develop`:

```yaml
on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]
```

- [ ] **Step 2: Atualizar `secrets.yml`**

Mesma alteração:

```yaml
on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]
```

- [ ] **Step 3: Verificar que os demais workflows não precisam de alteração**

- `codeql.yml` — roda em push/PR→main + cron. Não precisa de `develop` (análise de segurança só em produção está OK).
- `no-friday-deploy.yml` — bloqueia merges em `main`. Correto, não tocar.
- `tag-version.yml` — só em push→main. Correto.
- `setup-node.yml` — workflow reutilizável, sem triggers próprios.

- [ ] **Step 4: Commit e push**

```bash
git add .github/workflows/test.yml .github/workflows/secrets.yml
git commit -m "ci: adiciona develop como branch alvo nos workflows de PR"
git push origin develop
```

Expected: no GitHub Actions, PRs de `feature/*` → `develop` agora disparam testes e scan de secrets.

---

## Verificação final

- [ ] Fazer um push qualquer para `develop` e confirmar que o projeto `run-way-homol` na Vercel dispara um deploy automático
- [ ] Fazer um push para `main` e confirmar que o projeto `run-way-prod` dispara deploy
- [ ] Abrir PR de qualquer branch para `develop` e confirmar que os checks do GitHub Actions rodam
- [ ] Confirmar HTTPS funcionando em ambos os domínios customizados
