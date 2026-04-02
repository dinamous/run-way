# Melhorias Pendentes

## UX: Botão "Salvar" inteligente
- Detectar dirty state (comparar formData vs snapshot original)
- Proteção contra overclick (submitting state)
- Botão desabilitado quando `!isDirty || submitting`
- Texto muda para "A guardar…" durante submit
- **Ficheiros:** TaskModal ou equivalente

## MembersView: Componentização
- Quebrar `MembersView.tsx` monolítico em `MemberCard` + `MemberTaskItem`
- Mover para pasta `src/views/MembersView/` com `index.ts`
- **Ver:** [todo/componentize-members-view.md](componentize-members-view.md)

## Steps: Upsert em vez de delete+insert
- Ver [todo/upsert-steps.md](upsert-steps.md) para implementação detalhada
