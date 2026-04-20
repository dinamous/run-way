import { Clock, AlertTriangle, Users } from 'lucide-react'
import { Input } from '@/components/ui'
import type { UserPreferences } from '../hooks/useProfile'

interface NotificationsSectionProps {
  preferences: UserPreferences
  isAdmin: boolean
  savingPrefs: boolean
  onUpdate: (prefs: Partial<Pick<UserPreferences, 'notification_step_overdue' | 'notification_task_stalled' | 'notification_member_overloaded' | 'stalled_days_threshold' | 'overload_threshold'>>) => Promise<boolean>
}

interface SwitchRowProps {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ id, label, description, icon, checked, disabled, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-medium cursor-pointer select-none">
            {label}
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function NotificationsSection({ preferences, isAdmin, savingPrefs, onUpdate }: NotificationsSectionProps) {
  const handleStalledDays = (value: string) => {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n >= 1 && n <= 30) {
      onUpdate({ stalled_days_threshold: n })
    }
  }

  const handleOverloadThreshold = (value: string) => {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n >= 1 && n <= 20) {
      onUpdate({ overload_threshold: n })
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Notificações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha quais alertas automáticos você deseja receber.
        </p>
      </div>

      {/* Alertas */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Alertas</h3>

        <div className="divide-y divide-border">
          <SwitchRow
            id="notification_step_overdue"
            label="Etapa em atraso"
            description="Notifica quando uma etapa atribuída a você passou da data de entrega."
            icon={<Clock className="w-4 h-4" />}
            checked={preferences.notification_step_overdue}
            disabled={savingPrefs}
            onChange={(checked) => onUpdate({ notification_step_overdue: checked })}
          />
          <SwitchRow
            id="notification_task_stalled"
            label="Demanda parada"
            description={`Notifica quando uma demanda não tem atualizações por mais de ${preferences.stalled_days_threshold} dias.`}
            icon={<AlertTriangle className="w-4 h-4" />}
            checked={preferences.notification_task_stalled}
            disabled={savingPrefs}
            onChange={(checked) => onUpdate({ notification_task_stalled: checked })}
          />
          {isAdmin && (
            <SwitchRow
              id="notification_member_overloaded"
              label="Membro sobrecarregado"
              description={`Notifica quando um membro ultrapassa ${preferences.overload_threshold} demandas em andamento simultaneamente.`}
              icon={<Users className="w-4 h-4" />}
              checked={preferences.notification_member_overloaded}
              disabled={savingPrefs}
              onChange={(checked) => onUpdate({ notification_member_overloaded: checked })}
            />
          )}
        </div>
      </div>

      {/* Thresholds — só admins */}
      {isAdmin && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Limites</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Estes valores se aplicam a todos os membros dos seus clientes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="stalled_days_threshold" className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                Dias sem atividade
              </label>
              <p className="text-xs text-muted-foreground">Para considerar uma demanda parada (1–30 dias).</p>
              <Input
                id="stalled_days_threshold"
                type="number"
                min={1}
                max={30}
                defaultValue={preferences.stalled_days_threshold}
                disabled={savingPrefs}
                className="w-24"
                onBlur={(e) => handleStalledDays(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="overload_threshold" className="text-sm font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Limite de sobrecarga
              </label>
              <p className="text-xs text-muted-foreground">Nº de demandas simultâneas para alertar (1–20).</p>
              <Input
                id="overload_threshold"
                type="number"
                min={1}
                max={20}
                defaultValue={preferences.overload_threshold}
                disabled={savingPrefs}
                className="w-24"
                onBlur={(e) => handleOverloadThreshold(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {savingPrefs && <p className="text-xs text-muted-foreground">Salvando…</p>}
    </section>
  )
}
