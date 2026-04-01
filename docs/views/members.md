# MembersView

**Ficheiro:** `src/views/MembersView.tsx`

## Props
```ts
{ tasks: Task[]; members: Member[] }
```

## Capacidade
Conta tarefas onde `assignee === member.id` e `status !== 'concluído'`.

| Tarefas ativas | Status | Cor |
|---|---|---|
| 0–2 | Livre | Verde |
| 3 | Alocado | Azul |
| >3 | Sobrecarregado | Vermelho |

## Layout
Cards por membro: avatar (iniciais + cor do status), nome, role, badge de status, lista de tarefas ativas com fase atual (primeira fase cujo `end >= hoje`).
