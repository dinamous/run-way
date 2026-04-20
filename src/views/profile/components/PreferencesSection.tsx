import { Bell, Globe, Palette } from 'lucide-react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Checkbox } from '@/components/ui'
import type { UserPreferences } from '../hooks/useProfile'

interface PreferencesSectionProps {
  preferences: UserPreferences
  savingPrefs: boolean
  onUpdate: (prefs: Partial<Pick<UserPreferences, 'theme' | 'language' | 'notifications_enabled'>>) => Promise<boolean>
}

export function PreferencesSection({ preferences, savingPrefs, onUpdate }: PreferencesSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Preferências</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure sua experiência na plataforma.</p>
      </div>

      {/* Tema */}
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

      {/* Idioma */}
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

      {/* Notificações */}
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

      {savingPrefs && <p className="text-xs text-muted-foreground">Salvando…</p>}
    </section>
  )
}
