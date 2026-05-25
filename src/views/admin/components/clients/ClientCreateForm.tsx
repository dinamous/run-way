import { useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { toSlug, validateFields, EASE_OUT_QUINT } from './clientUtils'
import type { ValidationErrors } from './clientUtils'

interface ClientCreateFormProps {
  open: boolean
  onCreate: (name: string, slug: string) => Promise<boolean>
  onClose: () => void
}

export function ClientCreateForm({ open, onCreate, onClose }: ClientCreateFormProps) {
  const reduced = useReducedMotion()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setName(''); setSlug(''); setSlugManual(false); setErrors({}); setCreating(false)
    onClose()
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (errors.name) setErrors(p => ({ ...p, name: undefined }))
    if (!slugManual) {
      setSlug(toSlug(val))
      if (errors.slug) setErrors(p => ({ ...p, slug: undefined }))
    }
  }

  const handleCreate = async () => {
    const errs = validateFields(name, slug)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setCreating(true)
    const ok = await onCreate(name.trim(), slug.trim())
    setCreating(false)
    if (ok) { toast.success(`"${name}" criado`); handleClose() }
    else toast.error('Erro ao criar cliente')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="create-form"
          initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_QUINT }}
          className="overflow-hidden"
          onAnimationComplete={() => { if (open) nameRef.current?.focus() }}
        >
          <div className="border border-border rounded-lg mb-1 bg-background">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <span className="text-sm font-medium">Novo cliente</span>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs">Nome</Label>
                <Input
                  id="create-name"
                  ref={nameRef}
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Acme Inc."
                  aria-invalid={!!errors.name}
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-slug" className="text-xs">Slug</Label>
                <Input
                  id="create-slug"
                  value={slug}
                  onChange={e => {
                    setSlug(e.target.value)
                    setSlugManual(true)
                    if (errors.slug) setErrors(p => ({ ...p, slug: undefined }))
                  }}
                  placeholder="acme-inc"
                  aria-invalid={!!errors.slug}
                  className="h-8 text-sm font-mono"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                />
                {errors.slug ? (
                  <p role="alert" className="text-xs text-destructive">{errors.slug}</p>
                ) : slug ? (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    run-way.app/clients/<span className="text-foreground">{slug}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border/60 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={creating} className="h-7 text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                isLoading={creating}
                disabled={!name.trim() || !slug.trim()}
                className="h-7 text-xs gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Criar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
