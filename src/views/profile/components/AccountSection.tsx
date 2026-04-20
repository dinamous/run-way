import { useState } from 'react'
import { User, Mail, Shield, Calendar } from 'lucide-react'
import { Button, Input, Label, Badge } from '@/components/ui'
import type { Member } from '@/hooks/useSupabase'
import type { ProfileFormData } from '../hooks/useProfile'

interface AccountSectionProps {
  member: Member
  saving: boolean
  error: string | null
  successMessage: string | null
  onSave: (data: ProfileFormData) => Promise<boolean>
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function AccountSection({ member, saving, error, successMessage, onSave }: AccountSectionProps) {
  const [name, setName] = useState(member.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const validate = (): boolean => {
    let valid = true
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Nome deve ter pelo menos 2 caracteres.')
      valid = false
    } else {
      setNameError(null)
    }
    if (!isValidUrl(avatarUrl)) {
      setAvatarError('URL do avatar inválida.')
      valid = false
    } else {
      setAvatarError(null)
    }
    return valid
  }

  const handleSave = async () => {
    if (!validate()) return
    await onSave({ name: name.trim(), avatar_url: avatarUrl.trim() })
    setDirty(false)
  }

  const accessRoleLabel = member.access_role === 'admin' ? 'Admin' : 'Usuário'
  const accessRoleVariant = member.access_role === 'admin' ? 'default' : 'secondary'

  const displayAvatar = avatarUrl || member.avatar_url
  const initials = (member.avatar ?? member.name?.slice(0, 2) ?? '?').toUpperCase()

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Informações da Conta</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seus dados pessoais.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold shrink-0 overflow-hidden">
          {displayAvatar ? (
            <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Label htmlFor="avatar_url">URL do Avatar</Label>
          <Input
            id="avatar_url"
            value={avatarUrl}
            onChange={(e) => { setAvatarUrl(e.target.value); setDirty(true) }}
            placeholder="https://exemplo.com/foto.jpg"
            className="mt-1"
          />
          {avatarError && <p className="text-xs text-destructive mt-1">{avatarError}</p>}
        </div>
      </div>

      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => { setName(e.target.value); setDirty(true) }}
          placeholder="Seu nome"
          className="mt-1"
        />
        {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
      </div>

      {/* Campos somente leitura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            E-mail
          </Label>
          <p className="text-sm py-2 px-3 bg-muted rounded-md border border-transparent">{member.email ?? '—'}</p>
        </div>

        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            Função
          </Label>
          <p className="text-sm py-2 px-3 bg-muted rounded-md border border-transparent">{member.role ?? '—'}</p>
        </div>

        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            Tipo de acesso
          </Label>
          <div className="py-1.5">
            <Badge variant={accessRoleVariant}>{accessRoleLabel}</Badge>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            Membro desde
          </Label>
          <p className="text-sm py-2 px-3 bg-muted rounded-md border border-transparent">{formatDate(member.created_at)}</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {successMessage && <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>}

      <Button onClick={handleSave} disabled={saving || !dirty}>
        {saving ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </section>
  )
}
