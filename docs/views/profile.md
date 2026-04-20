# ProfileView

**Localização:** `src/views/profile/`

View de perfil do usuário autenticado. Acessível a todos os papéis (`admin` e `user`). Não requer cliente selecionado.

## Acesso

- Sidebar → dropdown do usuário (rodapé) → "Meu Perfil"
- Notificação com rota `/profile` navega para esta view automaticamente

## Estrutura

```
src/views/profile/
├── ProfileView.tsx               # View principal
├── index.ts
├── components/
│   ├── AccountSection.tsx        # Dados da conta (nome, avatar, campos somente leitura)
│   └── PreferencesSection.tsx    # Preferências (tema, idioma, notificações)
└── hooks/
    └── useProfile.ts             # Fetch/upsert de preferências, update de perfil
```

## Componentes

### `AccountSection`

Exibe e edita os dados do membro autenticado.

**Campos editáveis:** `name`, `avatar_url`

**Campos somente leitura:** `email`, `role`, `access_role`, `created_at`

**Validação:**
- Nome: obrigatório, mínimo 2 caracteres
- Avatar URL: deve ser URL válida se preenchida

O botão "Salvar alterações" fica desabilitado enquanto não há alterações (`dirty = false`). O componente usa `key={member.id}` no pai para recriar o estado local quando o membro muda — sem `useEffect` para reset de form.

### `PreferencesSection`

Exibe e edita as preferências do usuário. Persistência automática (sem botão salvar).

**Campos:** `theme` (`light | dark | system`), `language` (`pt-BR | en`), `notifications_enabled`

## Hook `useProfile`

```ts
useProfile(): {
  member: Member | null
  preferences: UserPreferences | null
  loading: boolean
  saving: boolean
  savingPrefs: boolean
  error: string | null
  successMessage: string | null
  updateProfile(data: ProfileFormData): Promise<boolean>
  updatePreferences(prefs: Partial<UserPreferences>): Promise<boolean>
}
```

### Fluxo de carregamento

1. Busca `user_preferences` onde `user_id = member.id` via `.maybeSingle()`
2. Se não encontrar → cria registro com defaults (`theme: 'system'`, `language: 'pt-BR'`, `notifications_enabled: true`)
3. Seta `loading = false` ao final

### `updateProfile`

- Atualiza `name` e opcionalmente `avatar_url` na tabela `members`
- Chama `refreshProfile()` do `AuthContext` para recarregar o estado global
- Exibe `successMessage` por 3 segundos

### `updatePreferences`

- Faz update na tabela `user_preferences` com `updated_at` atual
- Atualiza estado local imediatamente após sucesso

## Modelo de Dados — `user_preferences`

Tabela a criar no Supabase (migration necessária):

```sql
create table user_preferences (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references members(id) on delete cascade,
  theme                text not null default 'system' check (theme in ('light', 'dark', 'system')),
  language             text not null default 'pt-BR' check (language in ('pt-BR', 'en')),
  notifications_enabled boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

-- RLS: usuário lê e escreve apenas seus próprios registros
alter table user_preferences enable row level security;

create policy "user_preferences_self"
  on user_preferences
  using (user_id = (select id from members where auth_user_id = auth.uid()))
  with check (user_id = (select id from members where auth_user_id = auth.uid()));
```

## Restrições de Acesso

- Usuário só pode editar seus próprios dados (`members.id` derivado do `auth.uid()` via AuthContext)
- `access_role` e `is_active` nunca são editáveis pela view
- A permissão `view:profile` está disponível para `admin` e `user` em `src/lib/accessControl.ts`

## Testes

`src/views/profile/__tests__/useProfile.test.ts` — 5 testes do hook (carregamento, upsert de prefs, update de perfil, erro)

`src/views/profile/__tests__/AccountSection.test.tsx` — 6 testes de componente (render, validação, disabled state, mensagens)
