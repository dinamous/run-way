import {
  Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { GoogleSearchInput } from './GoogleSearchInput'
import { ROLE_SUGGESTIONS } from './types'
import type { ValidationErrors, GoogleUser } from './types'
import { Check, Key, Clock, UserX, UserCheck } from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Member } from '@/hooks/infra/useSupabase'
import type { DbClientRow } from '@/types/db'

interface UserEditDrawerProps {
  open: boolean
  user: Member | null
  clients: DbClientRow[]
  editClients: string[]
  userClientsMap: Record<string, string[]>
  onClose: () => void
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  onUpdate: (userId: string, name: string, role: string, email?: string | null, capacity?: number | null) => Promise<boolean>
  onSetAuthId: (userId: string, authUserId: string | null, avatarUrl?: string | null) => Promise<boolean>
  onListGoogleUsers: (search?: string) => Promise<GoogleUser[]>
  onDeactivate: (userId: string) => Promise<boolean>
  onReactivate: (userId: string) => Promise<boolean>
  initialEditClients: string[]
}

interface EditState {
  name: string
  userRole: string
  email: string
  accessRole: 'admin' | 'user'
  capacity: number
  clients: string[]
  googleSearch: string
  selectedGoogle: GoogleUser | null
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

export function UserEditDrawer({
  open, user, clients, userClientsMap,
  onClose, onSetRole, onLink, onUnlink, onUpdate, onSetAuthId, onListGoogleUsers, onDeactivate, onReactivate,
}: UserEditDrawerProps) {
  const [state, setState] = useState<EditState>({
    name: '', userRole: '', email: '', accessRole: 'user', capacity: 6,
    clients: [], googleSearch: '', selectedGoogle: null,
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)

  const initState = useCallback((u: Member) => {
    setState({
      name: u.name,
      userRole: u.role,
      email: u.email ?? '',
      accessRole: u.access_role ?? 'user',
      capacity: u.capacity ?? 6,
      clients: userClientsMap[u.id] ?? [],
      googleSearch: '',
      selectedGoogle: null,
    })
    setErrors({})
  }, [userClientsMap])

  // Initialize when user changes
  const prevUserId = useState<string | null>(null)[0]
  if (user && user.id !== prevUserId) {
    initState(user)
  }

  const hasUnsaved = () => {
    if (!user) return false
    const currentClientIds = userClientsMap[user.id] ?? []
    return (
      state.name.trim() !== user.name ||
      state.userRole.trim() !== user.role ||
      state.email.trim() !== (user.email ?? '') ||
      state.accessRole !== (user.access_role ?? 'user') ||
      state.capacity !== (user.capacity ?? 6) ||
      state.clients.length !== currentClientIds.length ||
      state.clients.some(id => !currentClientIds.includes(id)) ||
      (state.googleSearch !== '' && state.googleSearch !== (user.email ?? ''))
    )
  }

  const requestClose = () => {
    if (hasUnsaved()) { setShowDiscardConfirm(true); return }
    onClose()
  }

  const set = <K extends keyof EditState>(key: K, val: EditState[K]) =>
    setState(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!user) return
    const errs = validate(state.name, state.userRole, state.email)
    setErrors(errs)
    if (Object.keys(errs).length > 0) { toast.error('Corrija os erros antes de salvar'); return }
    setSaving(true)

    const nameChanged = state.name.trim() !== user.name
    const roleChanged = state.userRole.trim() !== user.role
    const emailChanged = state.email.trim() !== (user.email ?? '')
    const capacityChanged = state.capacity !== (user.capacity ?? 6)

    let basicOk = true
    if (nameChanged || roleChanged || emailChanged || capacityChanged) {
      basicOk = await onUpdate(user.id, state.name.trim(), state.userRole.trim(), state.email.trim() || null, state.capacity)
    }

    let roleOk = true
    if (state.accessRole !== (user.access_role ?? 'user')) roleOk = await onSetRole(user.id, state.accessRole)

    const currentClientIds = userClientsMap[user.id] ?? []
    const toAdd = state.clients.filter(id => !currentClientIds.includes(id))
    const toRemove = currentClientIds.filter(id => !state.clients.includes(id))

    let clientOk = true
    for (const cid of toAdd) { const ok = await onLink(user.id, cid); if (!ok) { clientOk = false; break } }
    for (const cid of toRemove) { const ok = await onUnlink(user.id, cid); if (!ok) { clientOk = false; break } }

    let authOk = true
    if (state.selectedGoogle && state.selectedGoogle.id !== user.auth_user_id) {
      authOk = await onSetAuthId(user.id, state.selectedGoogle.id, state.selectedGoogle.avatarUrl)
    } else if (state.googleSearch === '' && user.auth_user_id) {
      authOk = await onSetAuthId(user.id, null, null)
    }

    setSaving(false)
    if (basicOk && roleOk && clientOk && authOk) {
      toast.success('Utilizador atualizado')
      onClose()
    } else if (!basicOk) toast.error('Erro ao atualizar dados do utilizador')
    else if (!authOk) toast.error('Erro ao atualizar conta Google')
    else toast.error('Erro ao atualizar utilizador')
  }

  const handleDeactivate = async () => {
    if (!user) return
    setTogglingActive(true)
    try {
      const ok = await onDeactivate(user.id)
      if (ok) { toast.success(`Utilizador "${user.name}" desativado`); onClose() }
      else toast.error('Erro ao desativar utilizador')
    } catch { toast.error('Ocorreu um erro inesperado ao desativar.') }
    finally { setTogglingActive(false); setShowDeactivateConfirm(false) }
  }

  const handleReactivate = async () => {
    if (!user) return
    setTogglingActive(true)
    try {
      const ok = await onReactivate(user.id)
      if (ok) { toast.success(`Utilizador "${user.name}" reativado`); onClose() }
      else toast.error('Erro ao reativar utilizador')
    } catch { toast.error('Ocorreu um erro inesperado ao reativar.') }
    finally { setTogglingActive(false); setShowReactivateConfirm(false) }
  }

  const toggleClient = (clientId: string) =>
    set('clients', state.clients.includes(clientId)
      ? state.clients.filter(id => id !== clientId)
      : [...state.clients, clientId]
    )

  return (
    <>
      <Drawer
        direction="right"
        open={open}
        onOpenChange={isOpen => { if (!isOpen && !showDeactivateConfirm && !showReactivateConfirm && !showDiscardConfirm) requestClose() }}
      >
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Editar Utilizador</DrawerTitle>
            <DrawerDescription>Altere os dados e clientes do utilizador.</DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            {user && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : user.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.role}</p>
                    {user.email && <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground px-1">
                  {user.created_at && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Criado em {new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {user.deactivated_at && (
                    <span className="flex items-center gap-1.5 text-destructive">
                      <UserX className="w-3.5 h-3.5 shrink-0" />
                      Desativado em {new Date(user.deactivated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                {!user.auth_user_id && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Conta Google não vinculada</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          O utilizador ainda não fez login. Vincule a conta Google abaixo quando ele acessar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Nome completo</Label>
                    <Input
                      id="edit-name"
                      value={state.name}
                      onChange={e => { set('name', e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })) }}
                      placeholder="Ex: Maria Silva"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p role="alert" className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-role">Cargo / Função</Label>
                    <Input
                      id="edit-role"
                      value={state.userRole}
                      onChange={e => { set('userRole', e.target.value); if (errors.role) setErrors(p => ({ ...p, role: undefined })) }}
                      placeholder="Ex: Social Media"
                      list="edit-role-suggestions"
                      aria-invalid={!!errors.role}
                    />
                    <datalist id="edit-role-suggestions">
                      {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
                    </datalist>
                    {errors.role && <p role="alert" className="text-xs text-red-500 mt-1">{errors.role}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-email">Email corporativo</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={state.email}
                      onChange={e => { set('email', e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                      placeholder="Ex: maria@empresa.com"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p role="alert" className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-capacity">Capacidade (subtarefas simultâneas)</Label>
                    <Input
                      id="edit-capacity"
                      type="number"
                      min={1}
                      max={50}
                      value={state.capacity}
                      onChange={e => set('capacity', Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número máximo de subtarefas ativas antes de ser considerado sobrecarregado.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Acesso</Label>
                  <div className="flex gap-2">
                    {(['user', 'admin'] as const).map(r => (
                      <Button
                        key={r}
                        variant={state.accessRole === r ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => set('accessRole', r)}
                        className="flex-1"
                        aria-pressed={state.accessRole === r}
                      >
                        <Check className={`w-4 h-4 mr-1 ${state.accessRole === r ? 'opacity-100' : 'opacity-0'}`} />
                        {r === 'user' ? 'Utilizador' : 'Administrador'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Clientes associados</Label>
                  {clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">Nenhum cliente disponível</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clients.map(c => {
                        const isLinked = state.clients.includes(c.id)
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${isLinked ? 'bg-primary/10 border border-primary' : 'border hover:bg-muted/50'}`}
                            onClick={() => toggleClient(c.id)}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isLinked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                              {isLinked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">/{c.slug}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="px-6 pb-4 space-y-3">
              <Label className="text-base font-medium">Conta Google</Label>
              <GoogleSearchInput
                value={state.googleSearch}
                onChange={(val, selected) => { set('googleSearch', val); set('selectedGoogle', selected) }}
                onSearch={onListGoogleUsers}
                inputClassName="w-full"
              />
              {user.auth_user_id && !state.googleSearch && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Conta Google vinculada
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">{user.auth_user_id}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {user.auth_user_id
                  ? 'Substitua a conta Google por outra ou deixe vazio para desvincular.'
                  : 'Busque e vincule uma conta Google para ativar o utilizador.'}
              </p>
            </div>
          )}

          <DrawerFooter className="flex-row justify-between gap-2">
            {user?.is_active !== false ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDeactivateConfirm(true)} disabled={saving || togglingActive}>
                <UserX className="w-4 h-4 mr-1" />
                Desativar
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowReactivateConfirm(true)} disabled={saving || togglingActive}>
                <UserCheck className="w-4 h-4 mr-1" />
                Reativar
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={requestClose} disabled={saving || togglingActive}>Cancelar</Button>
              <Button onClick={handleSave} isLoading={saving} disabled={togglingActive}>Guardar</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {showDeactivateConfirm && (
        <ConfirmModal
          title="Desativar utilizador?"
          message={`O membro "${user?.name}" perderá o acesso à plataforma. As tasks e steps associadas serão preservadas. Esta ação pode ser revertida.`}
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}

      {showReactivateConfirm && (
        <ConfirmModal
          title="Reativar utilizador?"
          message={`O membro "${user?.name}" voltará a ter acesso à plataforma.`}
          confirmLabel="Reativar"
          cancelLabel="Cancelar"
          onConfirm={handleReactivate}
          onCancel={() => setShowReactivateConfirm(false)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar alterações?"
          message="Há alterações não salvas. Se fechar agora, elas serão perdidas."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          onConfirm={() => { setShowDiscardConfirm(false); onClose() }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </>
  )
}
