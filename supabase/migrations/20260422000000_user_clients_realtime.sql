-- Habilita REPLICA IDENTITY FULL na tabela user_clients para que eventos DELETE
-- retornem os dados da linha antiga (payload.old) via Supabase Realtime.
ALTER TABLE public.user_clients REPLICA IDENTITY FULL;

-- Adiciona user_clients à publicação do Supabase Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_clients;
