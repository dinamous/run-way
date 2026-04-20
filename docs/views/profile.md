# ProfileView

**Localização:** `src/views/profile/`

View de perfil do usuário autenticado. Acessível a todos os papéis (`admin` e `user`). Não requer cliente selecionado.

## Acesso

- Sidebar → dropdown do usuário (rodapé) → "Meu Perfil"
- Notificação com rota `/profile` navega para esta view automaticamente

## Estrutura

```
src/views/profile/
├── ProfileView.tsx               # View principal com sidebar interna
├── index.ts
├── components/
│   ├── AccountSection.tsx        # Dados da conta (nome, avatar, campos somente leitura)
│   └── PreferencesSection.tsx    # Preferências (tema, idioma, notificações, ordem de clientes, view inicial)
└── hooks/
    └── useProfile.ts             # Fetch/upsert de preferências, update de perfil
```

## Layout

A view usa um layout de dois painéis: sidebar de navegação à esquerda (abas Conta / Preferências) e conteúdo à direita dentro de um card com borda. Largura máxima `max-w-4xl`.

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

Exibe e edita as preferências do usuário. Persistência automática (sem botão salvar). Recebe `clients: Client[]` do store de admin para montar a lista de ordem de clientes.

**Campos:** `theme` (`light | dark | system`), `language` (`pt-BR | en`), `default_view` (`home | calendar | timeline | list`), `client_order` (array de IDs arrastável), `notifications_enabled`

**Ordem de clientes:** Drag-and-drop nativo (HTML5). Os IDs são salvos em `user_preferences.client_order`. Clientes não presentes no array aparecem no final na ordem de cadastro.

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

Migration: `supabase/migrations/20260420000000_user_preferences.sql`

| Coluna | Tipo | Default | Descrição |
|---|---|---|---|
| `id` | uuid PK | gen_random_uuid() | |
| `user_id` | uuid FK → members | — | unique, cascade delete |
| `theme` | text | `'system'` | `light \| dark \| system` |
| `language` | text | `'pt-BR'` | `pt-BR \| en` |
| `notifications_enabled` | boolean | `true` | |
| `default_view` | text | `'home'` | `home \| calendar \| timeline \| list` |
| `client_order` | text[] | `{}` | IDs ordenados dos clientes |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

## Restrições de Acesso

- Usuário só pode editar seus próprios dados (`members.id` derivado do `auth.uid()` via AuthContext)
- `access_role` e `is_active` nunca são editáveis pela view
- A permissão `view:profile` está disponível para `admin` e `user` em `src/lib/accessControl.ts`

## Testes

`src/views/profile/__tests__/useProfile.test.ts` — 5 testes do hook (carregamento, upsert de prefs, update de perfil, erro)

`src/views/profile/__tests__/AccountSection.test.tsx` — 6 testes de componente (render, validação, disabled state, mensagens)
