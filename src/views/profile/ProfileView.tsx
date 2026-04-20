import { useState, type ComponentType } from 'react'
import { User, Settings } from 'lucide-react'
import { AccountSection } from './components/AccountSection'
import { PreferencesSection } from './components/PreferencesSection'
import { useProfile } from './hooks/useProfile'
import { useAdminStore } from '@/store/useAdminStore'

type ProfileTab = 'account' | 'preferences'

const TABS: { key: ProfileTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'account', label: 'Conta', icon: User },
  { key: 'preferences', label: 'Preferências', icon: Settings },
]

export function ProfileView() {
  const [tab, setTab] = useState<ProfileTab>('account')
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
      <div className="flex items-center justify-center py-24">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!member) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações e preferências.</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <li key={key}>
                <button
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    tab === key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="border rounded-xl p-6">
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
          </div>
        </div>
      </div>
    </div>
  )
}
