-- Adiciona campo de capacidade máxima de subtarefas simultâneas por membro.
-- Padrão: 6 (alinhado ao OVERLOAD_THRESHOLD anterior).
alter table members
  add column if not exists capacity integer not null default 6 check (capacity >= 1 and capacity <= 50);

comment on column members.capacity is 'Número máximo de subtarefas simultâneas antes de ser considerado sobrecarregado.';
