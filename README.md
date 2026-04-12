# Capacity Dashboard

Aplicação web de capacity planning para equipes de design e desenvolvimento. Permite criar demandas com fases de entrega (Design → Approval → Dev → QA), visualizar em calendário e timeline, e acompanhar a carga de cada membro.

## Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **Tailwind CSS 4** (plugin Vite, sem `tailwind.config.js`)
- **Supabase** (banco de dados + autenticação Google OAuth)
- **Radix UI** + **Lucide React** + **Sonner**

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com projeto criado
- Google OAuth configurado no Supabase

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie o arquivo de exemplo e preencha com suas credenciais:
   ```bash
   cp .env.example .env
   ```

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Chave de service role do Supabase |
| `VITE_GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
| `VITE_ALLOWED_DOMAIN` | Domínio permitido para login (ex: `empresa.com.br`) |
| `VITE_REDIRECT_ALLOWED_ORIGINS` | Origens permitidas no redirect OAuth (separadas por vírgula) |
| `VITE_REDIRECT_ALLOWED_PATHS` | Paths permitidos no redirect OAuth (ex: `/,/auth/callback`) |
| `VITE_SESSION_MAX_AGE_HOURS` | Duração máxima da sessão em horas (mínimo efetivo: 48) |

## Comandos

```bash
npm run dev        # Servidor de desenvolvimento — localhost:5173
npm run build      # Build de produção (tsc + vite build)
npm run lint       # ESLint
npm run test       # Testes em modo watch (Vitest)
npm run test:run   # Testes em modo CI (execução única)
```

## Modelo de dados

**Task** — uma demanda com fases de entrega:
- `status`: `backlog` | `em andamento` | `bloqueado` | `concluído`
- `phases`: `design` · `approval` · `dev` · `qa` — cada fase com `start` e `end` (`YYYY-MM-DD`)
- Cascata automática de datas entre fases

**Member** — membro da equipe com `role`: `Designer` | `Developer`

**Fases e durações padrão:**

| Fase | Duração | Cor |
|---|---|---|
| Design | 5 dias úteis | Violeta |
| Approval | 3 dias úteis | Laranja |
| Dev | 7 dias úteis | Azul |
| QA | 3 dias úteis | Esmeralda |
