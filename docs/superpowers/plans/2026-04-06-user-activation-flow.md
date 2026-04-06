# Plano: Ativação de Contas de Usuário

## Visão Geral

Este documento descreve o fluxo completo de criação e ativação de contas de usuário no sistema, desde a criação admin até o primeiro login do usuário.

## Estados do Usuário

```
┌─────────────────────────────────────────────────────────────┐
│                      ESTADOS DO USUÁRIO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. SEM EMAIL        │  email = null                      │
│      └─ Badge cinza   │  auth_user_id = null               │
│      └─ Visível apenas no admin                             │
│                                                             │
│   2. PENDENTE        │  email = "user@domain.com"         │
│      └─ Badge laranja │  auth_user_id = null                │
│      └─ Aguardando login                                    │
│                                                             │
│   3. ATIVO           │  email = "user@domain.com"         │
│      └─ Badge verde  │  auth_user_id = "google-uuid"       │
│      └─ Login realizado                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Ativação

### Fluxo Atual (Implementado)

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Admin      │    │   Supabase Auth  │    │   Member    │
│   cria user  │───▶│                  │    │   Row       │
└──────────────┘    └──────────────────┘    └─────────────┘
       │                    │                      │
       │  email            │                      │
       │  role             │                      │
       │  access_role      │                      │
       │  clients          │                      │
       │                   │                      │
       ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│  member.email = "user@domain.com"                        │
│  member.auth_user_id = NULL (ainda não vinculado)       │
│  member.avatar_url = NULL                               │
│  Status: PENDENTE                                      │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Usuário faz    │
                    │   login Google   │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  AuthContext.loadProfile()                              │
│  ├── Busca por auth_user_id → não encontra              │
│  ├── Busca por email → encontra member!                  │
│  └── Atualiza member:                                   │
│       member.auth_user_id = google-user-id               │
│       member.avatar_url = google-avatar-url             │
│  Status: ATIVO                                         │
└─────────────────────────────────────────────────────────┘
```

### Código Implementado (AuthContext.tsx)

```typescript
async function loadProfile(authUid: string, userEmail?: string) {
  // 1. Tenta encontrar pelo auth_user_id
  let { data: memberData } = await supabase
    .from('members')
    .select('...')
    .eq('auth_user_id', authUid)
    .single()

  // 2. Se não encontrou e tem email, busca por email pendente
  if (!memberData && userEmail) {
    const { data: pendingMember } = await supabase
      .from('members')
      .select('...')
      .eq('email', userEmail.toLowerCase())
      .is('auth_user_id', null)
      .single()

    if (pendingMember) {
      // Auto-vincula o usuário
      await supabase
        .from('members')
        .update({
          auth_user_id: authUid,
          avatar_url: googleAvatarUrl,
        })
        .eq('id', pendingMember.id)
    }
  }
}
```

## Melhorias Futuras

### 1. Envio de Email de Convite

**Problema:** O usuário pendente não sabe que foi adicionado ao sistema.

**Solução:** Adicionar função de envio de email de convite.

```typescript
interface InviteUserPayload {
  memberId: string
  email: string
  invitedBy: string // admin user id
  invitedAt: Date
}

// Funcionalidades necessárias:
// 1. Botão "Enviar convite" no admin
// 2. Envio de email com link mágico
// 3. Rastreamento de convite enviado
// 4. Possível expiração de convite
```

**Tarefas:**
- [ ] Adicionar campo `invited_at` na tabela members
- [ ] Adicionar campo `invited_by` na tabela members
- [ ] Criar endpoint/função para enviar convite
- [ ] Integrar com provedor de email (Resend, SendGrid, etc.)
- [ ] Criar template de email de convite
- [ ] Adicionar botão "Reenviar convite" no admin

### 2. Sessão de Confirmação de Email

**Problema:** O usuário pode ter feito login com Google, mas email não foi verificado pelo Supabase.

**Solução:** Adicionar etapa de confirmação.

```
┌──────────────────┐
│  Login Google    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Email verificado? │────▶│  Mostrar tela    │
│                  │ Não │  de confirmação  │
└────────┬─────────┘     └──────────────────┘
         │ Sim
         ▼
┌──────────────────┐
│ Buscar member    │
│ por email       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Vincular conta   │
│ e redirecionar  │
└──────────────────┘
```

**Tarefas:**
- [ ] Verificar status de email no login
- [ ] Criar página de confirmação de email
- [ ] Adicionar validação de domínio permitido
- [ ] Criarfluxo de reenvio de verificação

### 3. Notificações de Status

**Ideias:**
- [ ] Notificar admin quando usuário ativa conta
- [ ] Dashboard de usuários pendentes
- [ ] Alerta de usuários sem acesso há X dias

## Checklist de Implementação Atual

- [x] Coluna `email` na tabela `members`
- [x] Coluna `avatar_url` na tabela `members`
- [x] Auto-vinculação por email no login
- [x] UI de criação com email opcional
- [x] UI de edição com busca de Google users
- [x] Badges de status no card do usuário
- [x] Pesquisa por nome/email/cargo

## Segurança

### Considerações

1. **Domínio restrito:** O sistema já verifica `VITE_ALLOWED_DOMAIN`
2. **RLS:** Políticas de segurança na tabela `members`
3. **Auto-vinculação:** Apenas funciona se email exato existir E `auth_user_id` for NULL

### Riscos Potenciais

1. **Email duplicado:** Se dois usuários usarem mesmo email em diferentes contas Google
   - **Mitigação:** A busca usa `.single()` que falha se encontrar mais de um

2. **Email case-sensitive:** "User@Domain.com" vs "user@domain.com"
   - **Mitigação:** O sistema normaliza para lowercase na busca

3. **Usuário malicioso:** Pode criar conta Google com email de outra pessoa
   - **Mitigação:** Recomenda-se verificar email antes de ativar (futuro)
