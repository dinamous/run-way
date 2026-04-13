# OnboardingView Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma tela fullscreen de onboarding para usuários autenticados que ainda não foram associados a nenhum cliente, com ilustração animada de pista de decolagem e polling automático de 30s.

**Architecture:** `OnboardingView` é renderizado como retorno condicional em `App.tsx` (antes do layout com sidebar/header), igual ao `LoginView`. O polling usa `setInterval` local no componente, chamando diretamente o Supabase para checar se o usuário foi associado a algum cliente. Ao detectar clientes, chama `loadProfile` via callback exposto pelo `AuthContext`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Supabase JS, Lucide React

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/views/onboarding/OnboardingView.tsx` | Criar | Componente principal: ilustração, texto, polling |
| `src/views/onboarding/index.ts` | Criar | Re-export público |
| `src/contexts/AuthContext.tsx` | Modificar | Expor `refreshProfile` no contexto |
| `src/App.tsx` | Modificar | Retorno condicional para `OnboardingView` |

---

## Task 1: Expor `refreshProfile` no AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

O polling precisa de um callback que releia o perfil do usuário atual sem reiniciar o fluxo de auth. Vamos expor `refreshProfile` no contexto.

- [ ] **Step 1: Adicionar `refreshProfile` ao tipo e provider**

Em `src/contexts/AuthContext.tsx`, fazer as seguintes mudanças:

Na interface `AuthContextValue` (linha 14), adicionar:
```ts
refreshProfile: () => Promise<void>
```

No corpo do `AuthProvider`, após a função `loadProfile` (após linha 126), a função já existe — apenas criar um wrapper:
```ts
const refreshProfile = async () => {
  if (!user) return
  await loadProfile(user.id, user.email ?? undefined)
}
```

No `<AuthContext.Provider value={{...}}>` (linha 225), adicionar ao objeto:
```ts
refreshProfile,
```

- [ ] **Step 2: Verificar tipagem**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros de TypeScript relacionados ao `AuthContext`.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: :sparkles: expõe refreshProfile no AuthContext"
```

---

## Task 2: Criar OnboardingView

**Files:**
- Create: `src/views/onboarding/OnboardingView.tsx`
- Create: `src/views/onboarding/index.ts`

- [ ] **Step 1: Criar o componente**

Criar `src/views/onboarding/OnboardingView.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { PlaneTakeoff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface OnboardingViewProps {
  userName?: string | null
  onSignOut: () => void
  onClientsFound: () => Promise<void>
}

const POLL_INTERVAL_MS = 30_000

export function OnboardingView({ userName, onSignOut, onClientsFound }: OnboardingViewProps) {
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function checkClients() {
      setChecking(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Busca o member associado ao auth_user_id
        const { data: memberData } = await supabase
          .from('members')
          .select('id, access_role')
          .eq('auth_user_id', user.id)
          .single()

        if (!memberData) return

        let hasClients = false

        if (memberData.access_role === 'admin') {
          const { count } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
          hasClients = (count ?? 0) > 0
        } else {
          const { count } = await supabase
            .from('user_clients')
            .select('client_id', { count: 'exact', head: true })
            .eq('user_id', memberData.id)
          hasClients = (count ?? 0) > 0
        }

        if (hasClients) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          await onClientsFound()
        }
      } catch {
        // falha silenciosa — tentará novamente no próximo tick
      } finally {
        setChecking(false)
      }
    }

    intervalRef.current = setInterval(checkClients, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onClientsFound])

  const firstName = userName?.split(' ')[0] ?? userName ?? 'você'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-10">
      {/* Ilustração: pista + avião */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="text-foreground"
          style={{
            animation: 'runway-float 3s ease-in-out infinite',
          }}
        >
          <PlaneTakeoff className="w-12 h-12" strokeWidth={1.5} />
        </div>

        {/* Pista SVG */}
        <svg
          width="220"
          height="32"
          viewBox="0 0 220 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-foreground"
          aria-hidden="true"
        >
          {/* Bordas da pista */}
          <line x1="0" y1="2" x2="220" y2="2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="30" x2="220" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Marcações centrais (tracejado) */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect
              key={i}
              x={10 + i * 32}
              y={13}
              width={18}
              height={6}
              rx={2}
              fill="currentColor"
              opacity="0.4"
            />
          ))}
        </svg>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-3xl text-foreground"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
        >
          Run/Way
        </h1>
        <p className="text-sm text-muted-foreground">
          Plataforma de gestão e visualização de demandas
        </p>
      </div>

      {/* Card de mensagem */}
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-3 text-center">
        <p className="text-base font-semibold text-foreground">
          Olá, {firstName}! Bem-vindo(a) ao Run/Way.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Parece que você ainda não foi alocado(a) a nenhum projeto ou cliente.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Em breve, o gestor fará seu cadastro. Por favor, aguarde.
        </p>

        {checking && (
          <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 pt-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
              style={{ animation: 'runway-pulse 1.2s ease-in-out infinite' }}
            />
            Verificando automaticamente...
          </p>
        )}
      </div>

      {/* Botão de logout */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSignOut}
        className="text-muted-foreground"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>

      {/* Keyframes inline */}
      <style>{`
        @keyframes runway-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes runway-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Criar o index**

Criar `src/views/onboarding/index.ts`:

```ts
export { OnboardingView } from './OnboardingView'
```

- [ ] **Step 3: Verificar tipagem**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/views/onboarding/
git commit -m "feat: :sparkles: cria OnboardingView com ilustração e polling"
```

---

## Task 3: Integrar OnboardingView no App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar OnboardingView e refreshProfile**

Em `src/App.tsx`, adicionar o import (junto aos outros imports de views):
```ts
import { OnboardingView } from './views/onboarding'
```

Extrair `refreshProfile` do `useAuthContext` (linha 28):
```ts
const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member, clients, refreshProfile } = useAuthContext();
```

- [ ] **Step 2: Adicionar retorno condicional antes do return principal**

Após o bloco `if (!session)` (linha 132-134) e antes do bloco `const requestDeleteTask`, adicionar:

```tsx
if (session && !hasClients) {
  return (
    <OnboardingView
      userName={member?.name ?? user?.email}
      onSignOut={signOut}
      onClientsFound={refreshProfile}
    />
  )
}
```

> **Nota:** Isso deve ficar ANTES de `const requestDeleteTask = ...` e APÓS `if (!session) return <LoginView ... />`. Com esse retorno condicional, sidebar e header não são renderizados.

- [ ] **Step 3: Verificar build e tipagem**

```bash
npm run build 2>&1 | head -40
```

Esperado: build sem erros.

- [ ] **Step 4: Testar manualmente**

Rodar `npm run dev`, autenticar com um usuário sem clientes associados e verificar:
- Tela fullscreen aparece (sem sidebar/header)
- Avião flutua suavemente
- Nome do usuário aparece no greeting
- Botão "Sair da conta" funciona

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: :sparkles: integra OnboardingView no fluxo de autenticação"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tela fullscreen sem sidebar/header → retorno condicional em `App.tsx`
- ✅ Ilustração animada pista + avião → SVG inline + keyframe `runway-float`
- ✅ Texto de boas-vindas com nome do usuário → prop `userName`
- ✅ Mensagem sobre aguardar gestor → card central
- ✅ Polling a cada 30s → `setInterval` no `useEffect`
- ✅ Ao detectar clientes, recarrega contexto → `onClientsFound` chama `refreshProfile`
- ✅ Botão de logout → `Button` com `onSignOut`
- ✅ Dark mode → cores via `bg-background`, `text-foreground`, `text-muted-foreground`

**Placeholder scan:** Nenhum TBD, TODO ou step sem código encontrado.

**Type consistency:** `OnboardingViewProps.onClientsFound: () => Promise<void>` bate com `refreshProfile: () => Promise<void>` definido na Task 1. `userName?: string | null` bate com `member?.name ?? user?.email` (ambos `string | null | undefined`).
