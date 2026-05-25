import {
  Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Member } from '@/hooks/infra/useSupabase'
import type { PendingAuthUser } from '../../hooks/useAdminData'

interface LinkUserDrawerProps {
  open: boolean
  pendingUser: PendingAuthUser | null
  members: Member[]
  onClose: () => void
  onSetAuthId: (userId: string, authUserId: string | null, avatarUrl?: string | null) => Promise<boolean>
  onCreateFromPending: (pendingUser: PendingAuthUser) => void
}

export function LinkUserDrawer({ open, pendingUser, members, onClose, onSetAuthId, onCreateFromPending }: LinkUserDrawerProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  const handleLink = async () => {
    if (!selectedId || !pendingUser) return
    setLinking(true)
    const ok = await onSetAuthId(selectedId, pendingUser.id, pendingUser.avatarUrl)
    setLinking(false)
    if (ok) {
      toast.success('Utilizador vinculado com sucesso')
      setSelectedId(null)
      setSearch('')
      onClose()
    } else {
      toast.error('Erro ao vincular utilizador')
    }
  }

  const handleClose = () => {
    setSelectedId(null)
    setSearch('')
    onClose()
  }

  const filteredMembers = members
    .filter(u => !u.auth_user_id)
    .filter(u => !search.trim() || u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))

  return (
    <Drawer direction="right" open={open} onOpenChange={isOpen => { if (!isOpen) handleClose() }}>
      <DrawerContent data-vaul-drawer-direction="right">
        <DrawerHeader>
          <DrawerTitle>Vincular Utilizador</DrawerTitle>
          <DrawerDescription>Selecione o membro para vincular a esta conta Google.</DrawerDescription>
        </DrawerHeader>

        {pendingUser && (
          <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden">
                {pendingUser.avatarUrl
                  ? <img src={pendingUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : pendingUser.email.charAt(0).toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{pendingUser.name}</p>
                <p className="text-sm text-muted-foreground truncate">{pendingUser.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="link-search">Vincular a membro existente</Label>
              <Button variant="outline" size="sm" onClick={() => onCreateFromPending(pendingUser)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Criar novo membro
              </Button>
            </div>

            <div className="space-y-1">
              <Input
                id="link-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou cargo..."
              />
              <p className="text-xs text-muted-foreground">Apenas membros sem conta Google vinculada são mostrados.</p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredMembers.map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedId === u.id ? 'bg-primary/10 border border-primary' : 'border hover:bg-muted/50'}`}
                  onClick={() => setSelectedId(u.id)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedId === u.id ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {selectedId === u.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={linking}>Cancelar</Button>
          <Button onClick={handleLink} isLoading={linking} disabled={!selectedId}>Vincular</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
