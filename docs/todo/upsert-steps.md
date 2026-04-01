# TODO: Substituir delete+insert de steps por upsert

## Problema

Em `updateTask` ([src/hooks/useSupabase.ts:248](../src/hooks/useSupabase.ts#L248)), o fluxo atual é:
1. DELETE todos os `task_steps` da tarefa
2. INSERT todos os steps novamente

Isso gera IDs novos a cada save, pode causar race conditions e não é idempotente.

## Solução

### 1. Garantir que `step.id` é preservado no frontend
- Ao editar uma tarefa, o `id` dos steps existentes deve fluir do estado para o save (não resetar).
- Novos steps (adicionados pelo utilizador) devem ter `id = ''` ou `undefined` para serem detectados como INSERT.

### 2. Substituir `insertSteps` por `upsertSteps`

```ts
// Em useSupabase.ts — substituir insertSteps por upsertSteps
async function upsertSteps(taskId: string, steps: Step[]): Promise<boolean> {
  for (const step of steps) {
    const isNew = !step.id

    let stepId: string

    if (isNew) {
      // INSERT
      const { data, error } = await supabase
        .from('task_steps')
        .insert({
          task_id: taskId,
          type: step.type,
          step_order: step.order,
          active: step.active,
          start_date: step.start || null,
          end_date: step.end || null,
        })
        .select('id')
        .single()
      if (error || !data) return false
      stepId = data.id
    } else {
      // UPDATE
      const { error } = await supabase
        .from('task_steps')
        .update({
          type: step.type,
          step_order: step.order,
          active: step.active,
          start_date: step.start || null,
          end_date: step.end || null,
        })
        .eq('id', step.id)
      if (error) return false
      stepId = step.id
    }

    // Upsert assignees: delete os antigos e reinsere (ou usar upsert com onConflict)
    await supabase.from('step_assignees').delete().eq('step_id', stepId)
    if (step.assignees.length > 0) {
      const { error } = await supabase.from('step_assignees').insert(
        step.assignees.map(mid => ({ step_id: stepId, member_id: mid }))
      )
      if (error) return false
    }
  }
  return true
}
```

### 3. Atualizar `updateTask`

Remover as linhas:
```ts
// REMOVER — linhas 248-257 em useSupabase.ts
const { error: deleteErr } = await supabase
  .from('task_steps')
  .delete()
  .eq('task_id', taskData.id)
```

Substituir `insertSteps` por `upsertSteps` na linha 259.

### 4. (Opcional) Steps removidos pelo utilizador

Se o utilizador puder remover steps, é preciso detectar os IDs que deixaram de existir e fazer DELETE só deles:

```ts
const existingIds = taskData.steps.map(s => s.id).filter(Boolean)
await supabase
  .from('task_steps')
  .delete()
  .eq('task_id', taskData.id)
  .not('id', 'in', `(${existingIds.join(',')})`)
```

---

## UX: Botão "Salvar" só habilitado se houver alteração + proteção contra overclick

### Problema

O botão de salvar do modal de edição está sempre habilitado, permitindo salves redundantes e cliques múltiplos enquanto o request está em curso.

### Solução

#### 1. Detectar se houve alteração (dirty state)

No componente do modal, guardar um snapshot da tarefa original ao abrir:

```ts
const [original, setOriginal] = useState<Task | null>(null)
const [isDirty, setIsDirty] = useState(false)

// ao abrir o modal com uma tarefa existente:
useEffect(() => {
  if (task) setOriginal(JSON.parse(JSON.stringify(task)))
}, [task?.id])

// comparar a cada mudança no form:
useEffect(() => {
  if (!original) return
  setIsDirty(JSON.stringify(formData) !== JSON.stringify(original))
}, [formData, original])
```

> Para novas tarefas (`task === null`), `isDirty` deve ser `true` sempre (ou baseado em campos obrigatórios preenchidos).

#### 2. Proteção contra overclick (submitting state)

```ts
const [submitting, setSubmitting] = useState(false)

const handleSave = async () => {
  if (submitting || !isDirty) return
  setSubmitting(true)
  try {
    await updateTask(formData)  // ou createTask
  } finally {
    setSubmitting(false)
  }
}
```

#### 3. Botão desabilitado nas duas condições

```tsx
<Button
  onClick={handleSave}
  disabled={!isDirty || submitting}
>
  {submitting ? 'A guardar…' : 'Salvar'}
</Button>
```

### Comportamento esperado

| Estado | Botão |
|---|---|
| Modal acabou de abrir (sem edição) | Desabilitado |
| Utilizador alterou algum campo | Habilitado |
| Clicou salvar (request em curso) | Desabilitado + texto "A guardar…" |
| Request concluído | Fecha modal ou re-habilita conforme resultado |

### Ficheiros a tocar (UX)

- Componente do modal de task (TaskModal ou equivalente) — adicionar `original`, `isDirty`, `submitting`

---

## Ficheiros a tocar

- `src/hooks/useSupabase.ts` — substituir `insertSteps` + bloco delete em `updateTask`
- `src/lib/steps.ts` — confirmar que `Step.id` é obrigatório e preservado
- Componente de edição de task (TaskModal ou equivalente) — garantir que `step.id` não é limpo ao editar

## Notas

- `step_assignees` não tem ID próprio exposto, por isso o delete+reinsert nos assignees por `step_id` é aceitável (não gera problema de IDs).
- Apenas os `task_steps` é que devem mudar de delete+insert para update/insert.
