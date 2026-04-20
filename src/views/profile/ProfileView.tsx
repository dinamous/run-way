import { AccountSection } from './components/AccountSection'
import { PreferencesSection } from './components/PreferencesSection'
import { useProfile } from './hooks/useProfile'

export function ProfileView() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!member) return null

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Visualize e edite suas informações pessoais.</p>
      </div>

      <div className="border rounded-xl p-6">
        <AccountSection
          key={member.id}
          member={member}
          saving={saving}
          error={error}
          successMessage={successMessage}
          onSave={updateProfile}
        />
      </div>

      {preferences && (
        <div className="border rounded-xl p-6">
          <PreferencesSection
            preferences={preferences}
            savingPrefs={savingPrefs}
            onUpdate={updatePreferences}
          />
        </div>
      )}
    </div>
  )
}
