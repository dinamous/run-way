import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { GoogleSearchInput } from './GoogleSearchInput'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { EASE_OUT_QUINT, ROLE_SUGGESTIONS } from './types'
import type { ValidationErrors, GoogleUser } from './types'
import type { PendingAuthUser } from '../../hooks/useAdminData'

interface UserCreateFormProps {
  reduced: boolean
  createFromPendingUser: PendingAuthUser | null
  onListGoogleUsers: (search?: string) => Promise<GoogleUser[]>
  onCreate: (
    name: string, role: string, authUserId?: string | null,
    accessRole?: 'admin' | 'user', clientIds?: string[],
    email?: string | null, avatarUrl?: string | null
  ) => Promise<boolean>
  onClose: () => void
  onCreated: () => void
}

function validate(name: string, role: string, email?: string): ValidationErrors {
  const errs: ValidationErrors = {}
  if (!name.trim()) errs.name = 'Nome é obrigatório'
  else if (name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
  else if (name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'
  if (!role.trim()) errs.role = 'Cargo é obrigatório'
  else if (role.trim().length > 50) errs.role = 'Cargo deve ter no máximo 50 caracteres'
  if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email inválido'
  return errs
}

export function UserCreateForm({
  reduced, createFromPendingUser, onListGoogleUsers, onCreate, onClose, onCreated,
}: UserCreateFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(createFromPendingUser?.name ?? '')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState(createFromPendingUser?.email ?? '')
  const [accessRole, setAccessRole] = useState<'admin' | 'user'>('user')
  const [googleSearch, setGoogleSearch] = useState(createFromPendingUser?.email ?? '')
  const [selectedGoogle, setSelectedGoogle] = useState<GoogleUser | null>(
    createFromPendingUser
      ? { id: createFromPendingUser.id, email: createFromPendingUser.email, name: createFromPendingUser.name, avatarUrl: createFromPendingUser.avatarUrl ?? null }
      : null
  )
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)

  const handleGoogleChange = (val: string, user: GoogleUser | null) => {
    setGoogleSearch(val)
    setSelectedGoogle(user)
  }

  const handleCreate = async () => {
    const errs = validate(name, role, email)
    setErrors(errs)
    if (Object.keys(errs).length > 0) { toast.error('Corrija os erros antes de criar'); return }
    setCreating(true)
    const ok = await onCreate(
      name.trim(), role.trim(),
      selectedGoogle?.id ?? null, accessRole, [],
      email.trim() || null, selectedGoogle?.avatarUrl ?? null
    )
    setCreating(false)
    if (ok) {
      toast.success(`Utilizador "${name}" criado`)
      onCreated()
    } else {
      toast.error('Erro ao criar utilizador')
    }
  }

  return (
    <motion.div
      key="create-form"
      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT_QUINT }}
      className="overflow-hidden"
    >
      <div className="border border-border rounded-lg mb-1 bg-background">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <span className="text-sm font-medium">
            {createFromPendingUser ? `Criar membro a partir de ${createFromPendingUser.email}` : 'Novo usuário'}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-user-name" className="text-xs">Nome completo</Label>
            <Input
              id="create-user-name"
              ref={nameRef}
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })) }}
              placeholder="Ex: Maria Silva"
              aria-invalid={!!errors.name}
              className="h-8 text-sm"
            />
            {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-user-role" className="text-xs">Cargo / Função</Label>
            <Input
              id="create-user-role"
              value={role}
              onChange={e => { setRole(e.target.value); if (errors.role) setErrors(p => ({ ...p, role: undefined })) }}
              placeholder="Ex: Social Media"
              list="create-user-role-suggestions"
              aria-invalid={!!errors.role}
              className="h-8 text-sm"
            />
            <datalist id="create-user-role-suggestions">
              {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
            </datalist>
            {errors.role && <p role="alert" className="text-xs text-destructive">{errors.role}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-user-email" className="text-xs">Email corporativo</Label>
            <Input
              id="create-user-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
              placeholder="Ex: maria@empresa.com"
              aria-invalid={!!errors.email}
              className="h-8 text-sm"
            />
            {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nível de acesso</Label>
            <div className="flex gap-1.5">
              {(['user', 'admin'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setAccessRole(r)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md border transition-colors cursor-pointer ${
                    accessRole === r
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                  aria-pressed={accessRole === r}
                >
                  {accessRole === r && <Check className="w-3 h-3" />}
                  {r === 'user' ? 'Utilizador' : 'Administrador'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Conta Google (opcional)</Label>
            <GoogleSearchInput
              value={googleSearch}
              onChange={handleGoogleChange}
              onSearch={onListGoogleUsers}
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border/60 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={creating} className="h-7 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            isLoading={creating}
            disabled={!name.trim() || !role.trim()}
            className="h-7 text-xs gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Criar
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
