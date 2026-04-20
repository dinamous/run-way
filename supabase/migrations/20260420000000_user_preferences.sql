-- Tabela criada manualmente antes desta migration.
-- Registrada aqui para rastreabilidade; o create é idempotente.
create table if not exists user_preferences (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references members(id) on delete cascade,
  theme                 text not null default 'system'
                          check (theme in ('light', 'dark', 'system')),
  language              text not null default 'pt-BR'
                          check (language in ('pt-BR', 'en')),
  notifications_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

alter table user_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_preferences' and policyname = 'user_preferences_self'
  ) then
    execute $p$
      create policy "user_preferences_self"
        on user_preferences
        using      (user_id = (select id from members where auth_user_id = auth.uid()))
        with check (user_id = (select id from members where auth_user_id = auth.uid()))
    $p$;
  end if;
end;
$$;

-- Novas colunas adicionadas em 2026-04-20
alter table user_preferences
  add column if not exists default_view text not null default 'home'
    check (default_view in ('home', 'calendar', 'timeline', 'list')),
  add column if not exists client_order text[] not null default '{}';
