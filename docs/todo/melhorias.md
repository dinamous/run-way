# Melhorias Pendentes

## UX: Botão "Salvar" inteligente
- Detectar dirty state (comparar formData vs snapshot original)
- Proteção contra overclick (submitting state)
- Botão desabilitado quando `!isDirty || submitting`
- Texto muda para "A guardar…" durante submit
- **Ficheiros:** TaskModal ou equivalente

## Steps: Upsert em vez de delete+insert
- Ver [todo/upsert-steps.md](upsert-steps.md) para implementação detalhada
