import { useState, useId, type ComponentType } from 'react'
import { User, Settings, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AccountSection } from './components/AccountSection'
import { PreferencesSection } from './components/PreferencesSection'
import { NotificationsSection } from './components/NotificationsSection'
import { useProfile } from './hooks/useProfile'
import { useAdminStore } from '@/store/useAdminStore'

type ProfileTab = 'account' | 'preferences' | 'notifications'

const TABS: { key: ProfileTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'account', label: 'Conta', icon: User },
  { key: 'preferences', label: 'Preferências', icon: Settings },
  { key: 'notifications', label: 'Notificações', icon: Bell },
]

export function ProfileView() {
  const [tab, setTab] = useState<ProfileTab>('account')
  const indicatorId = useId()
  const {
    member,
    preferences,
    loading,
    saving,
    savingPrefs,
    error,
    successMessage,
    updateProfile,
    updatePreferences,
  } = useProfile()

  const clients = useAdminStore((s) => s.clients)

  if (loading) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
          <div className="flex gap-1 border-b border-border pb-px">
            {[80, 96, 104].map((w) => (
              <div key={w} className="h-9 rounded-t-md bg-muted animate-pulse" style={{ width: w }} />
            ))}
          </div>
        </div>

        <div className="max-w-xl space-y-6">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-9 w-36 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  if (!member) return null

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meu Perfil</h1>

        <nav aria-label="Seções do perfil">
          <ul className="flex gap-1 border-b border-border" role="tablist">
            {TABS.map(({ key, label, icon: Icon }) => (
              <li key={key} role="presentation">
                <button
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  onClick={() => setTab(key)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-md ${
                    tab === key
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                  {tab === key && (
                    <motion.span
                      layoutId={indicatorId}
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === 'account' && (
            <AccountSection
              key={member.id}
              member={member}
              saving={saving}
              error={error}
              successMessage={successMessage}
              onSave={updateProfile}
            />
          )}

          {tab === 'preferences' && preferences && (
            <PreferencesSection
              preferences={preferences}
              savingPrefs={savingPrefs}
              clients={clients}
              onUpdate={updatePreferences}
            />
          )}

          {tab === 'notifications' && preferences && (
            <NotificationsSection
              preferences={preferences}
              isAdmin={member.access_role === 'admin'}
              savingPrefs={savingPrefs}
              onUpdate={updatePreferences}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
