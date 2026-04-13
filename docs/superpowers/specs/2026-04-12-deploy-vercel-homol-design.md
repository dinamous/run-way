# Deploy: Vercel + Ambiente de Homologação

**Data:** 2026-04-12  
**Status:** Aprovado

## Objetivo

Publicar a aplicação Run/Way na Vercel com dois ambientes separados (produção e homologação), usando domínio customizado da HostGator para ambos.

## Ambientes

| Branch | Ambiente | URL |
|--------|----------|-----|
| `main` | Produção | `runway.seudominio.com` |
| `develop` | Homologação | `homol.runway.seudominio.com` |

## Fluxo de Trabalho

1. Features desenvolvidas em branches `feature/*`
2. PR de `feature/*` → `develop` = deploy automático em homologação
3. Validado em homol → PR de `develop` → `main` = deploy automático em produção

Os workflows de CI existentes (`test.yml`, `secrets.yml`) devem monitorar também a branch `develop`.

## Configuração Vercel

### Projeto 1 — Produção (`run-way-prod`)
- Repositório: GitHub (run-way)
- Branch de produção: `main`
- Domínio: `runway.seudominio.com`
- Env vars:
  - `VITE_SUPABASE_URL` — projeto Supabase de produção
  - `VITE_SUPABASE_ANON_KEY` — projeto Supabase de produção

### Projeto 2 — Homologação (`run-way-homol`)
- Repositório: GitHub (run-way)
- Branch de produção: `develop`
- Domínio: `homol.runway.seudominio.com`
- Env vars:
  - `VITE_SUPABASE_URL` — projeto Supabase de homologação
  - `VITE_SUPABASE_ANON_KEY` — projeto Supabase de homologação

## Configuração DNS (HostGator)

Dois registros CNAME no painel de DNS da HostGator:

```
runway        CNAME   cname.vercel-dns.com
homol.runway  CNAME   cname.vercel-dns.com
```

A Vercel emite SSL (Let's Encrypt) automaticamente após verificar os registros DNS.

## Supabase

Criar um segundo projeto Supabase para homologação:
- Rodar as mesmas migrations do projeto de produção para replicar o schema
- Usar credenciais distintas nas env vars do projeto Vercel de homol

## Ordem de Execução

1. Criar branch `develop` a partir de `main`
2. Criar projeto Supabase de homologação e copiar credenciais
3. Criar projeto Vercel de produção (branch `main`, env vars prod, domínio prod)
4. Criar projeto Vercel de homologação (branch `develop`, env vars homol, domínio homol)
5. Adicionar registros CNAME no HostGator
6. Aguardar propagação DNS e verificar SSL na Vercel
7. Atualizar `test.yml` e `secrets.yml` para incluir `develop` como branch monitorada

## Decisões

- **Dois projetos Vercel separados** (não um único com previews): isolamento real de env vars e dados entre ambientes
- **Supabase separado para homol**: evita poluição de dados de produção com testes
- **SSL via Vercel**: não é necessário configurar certificado no HostGator
