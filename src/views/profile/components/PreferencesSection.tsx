import { Bell, Globe, Palette, LayoutDashboard, GripVertical } from 'lucide-react'
import { useState } from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Checkbox } from '@/components/ui'
import type { UserPreferences } from '../hooks/useProfile'
import type { Client } from '@/types/db'

interface PreferencesSectionProps {
  preferences: UserPreferences
  savingPrefs: boolean
  clients: Client[]
  onUpdate: (prefs: Partial<Pick<UserPreferences, 'theme' | 'language' | 'notifications_enabled' | 'default_view' | 'client_order'>>) => Promise<boolean>
}

export function PreferencesSection({ preferences, savingPrefs, clients, onUpdate }: PreferencesSectionProps) {
  // Build ordered client list: first clients in client_order, then the rest
  const orderedClientIds: string[] = (() => {
    const known = new Set(clients.map((c) => c.id))
    const saved = (preferences.client_order ?? []).filter((id) => known.has(id))
    const rest = clients.map((c) => c.id).filter((id) => !saved.includes(id))
    return [...saved, ...rest]
  })()

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]))

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }
  const handleDrop = () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const reordered = [...orderedClientIds]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(overIndex, 0, moved)
    setDragIndex(null)
    setOverIndex(null)
    onUpdate({ client_order: reordered })
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Preferências</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure sua experiência na plataforma.</p>
      </div>

      {/* Aparência */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Aparência</h3>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Tema
          </Label>
          <Select
            value={preferences.theme}
            onValueChange={(v) => onUpdate({ theme: v as UserPreferences['theme'] })}
            disabled={savingPrefs}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Sistema (automático)</SelectItem>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Regional */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Regional</h3>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Idioma
          </Label>
          <Select
            value={preferences.language}
            onValueChange={(v) => onUpdate({ language: v as UserPreferences['language'] })}
            disabled={savingPrefs}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navegação */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Navegação</h3>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" />
            View inicial ao entrar
          </Label>
          <Select
            value={preferences.default_view}
            onValueChange={(v) => onUpdate({ default_view: v as UserPreferences['default_view'] })}
            disabled={savingPrefs}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Início</SelectItem>
              <SelectItem value="calendar">Calendário</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="list">Lista de demandas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ordem de clientes */}
      {clients.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Clientes</h3>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Arraste para reordenar a exibição dos clientes na barra lateral.
            </p>
            <ul className="space-y-1.5">
              {orderedClientIds.map((clientId, index) => {
                const client = clientById[clientId]
                if (!client) return null
                return (
                  <li
                    key={clientId}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card cursor-grab active:cursor-grabbing select-none transition-colors ${
                      overIndex === index && dragIndex !== index
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{client.slug}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Notificações */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notificações</h3>

        <div className="flex items-start gap-3">
          <Checkbox
            id="notifications_enabled"
            checked={preferences.notifications_enabled}
            onCheckedChange={(checked) => onUpdate({ notifications_enabled: Boolean(checked) })}
            disabled={savingPrefs}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="notifications_enabled" className="flex items-center gap-1.5 cursor-pointer">
              <Bell className="w-3.5 h-3.5" />
              Notificações ativas
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Receber notificações sobre demandas e atualizações.</p>
          </div>
        </div>
      </div>

      {savingPrefs && <p className="text-xs text-muted-foreground">Salvando…</p>}
    </section>
  )
}
