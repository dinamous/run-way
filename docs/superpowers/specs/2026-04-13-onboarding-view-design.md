# OnboardingView — Design Spec

**Data:** 2026-04-13  
**Status:** Aprovado pelo usuário

---

## Problema

Quando um usuário se autentica com Google mas ainda não foi associado a nenhum cliente pelo gestor, o sistema não tem uma tela adequada. Atualmente cai no `NoClientView` (dentro do layout com sidebar/header), que não foi pensado para esse estado de primeiro acesso.

---

## Solução

Criar uma `OnboardingView` — tela fullscreen, sem sidebar e sem header — para usuários autenticados mas sem clientes associados. A tela comunica o estado de espera com uma ilustração temática (pista de decolagem + avião), coerente com a identidade Run/Way.

---

## Visual

**Conceito:** Avião sobre pista de decolagem, animado com float suave, transmitindo a ideia de "aguardando autorização para decolar" — metáfora do usuário aguardando cadastro pelo gestor.

**Layout — centro da tela, vertical:**

```
         ✈  ← float animation (leve balanço/subida)
    ══════════════  ← pista com marcações estilo aeroporto (SVG inline)

    Run/Way              (fonte Syne 800)

    Olá, [nome]! Bem-vindo(a) ao Run/Way
    Plataforma de gestão e visualização de demandas.

    ┌──────────────────────────────────────┐
    │  Parece que você ainda não foi       │
    │  alocado(a) a nenhum projeto.        │
    │                                      │
    │  Em breve, o gestor fará seu         │
    │  cadastro. Por favor, aguarde.       │
    └──────────────────────────────────────┘

    [Sair da conta]   ← botão ghost, tamanho sm
```

**Animações:**
- Avião: keyframe CSS `float` — translação Y suave (0 → -8px → 0), 3s ease-in-out infinito
- Pista: estática, marcações desenhadas em SVG inline (sem dependências)
- Card de mensagem: sem animação (foco na leitura)

---

## Arquitetura

### Arquivos novos

| Arquivo | Responsabilidade |
|---|---|
| `src/views/onboarding/OnboardingView.tsx` | Componente principal da view |
| `src/views/onboarding/index.ts` | Re-export público |

### Integração em App.tsx

Renderizado como **retorno condicional** antes do JSX do layout principal (igual ao `LoginView`), para garantir que sidebar e header não apareçam:

```tsx
// Em App.tsx, após a verificação de session e antes do return principal:
if (session && !hasClients) {
  return <OnboardingView userName={member?.name ?? user?.email} onSignOut={signOut} />;
}
```

A condição atual `showNoClientView` (linha 161) deixa de ser usada para esse caso.

### Props da OnboardingView

```ts
interface OnboardingViewProps {
  userName?: string | null
  onSignOut: () => void
}
```

### Dependências

- Nenhuma nova biblioteca
- SVG inline para a pista
- Tailwind CSS para animação e layout
- Ícone `PlaneTakeoff` (Lucide) já usado no `LoginView`
- Fonte Syne via Google Fonts (já carregada no projeto)

---

## Polling automático

**Estratégia:** `setInterval` de 30s dentro de um `useEffect` no `OnboardingView`. A cada tick, chama o mesmo fetch de clientes que o `AuthContext` já faz. Se retornar clientes, força um `window.location.reload()` para reinicializar o contexto de autenticação com os novos dados.

**Props adicionais:**

```ts
interface OnboardingViewProps {
  userName?: string | null
  onSignOut: () => void
  onRefresh: () => Promise<boolean> // retorna true se encontrou clientes
}
```

`onRefresh` é passado pelo `App.tsx` e encapsula a chamada ao Supabase para verificar se o usuário foi associado a um cliente. Se retornar `true`, o `App.tsx` aciona o reload/re-fetch do contexto.

**Feedback visual:** um texto discreto abaixo do card — "Verificando automaticamente..." com um spinner de 1 dot pulsante — só aparece durante o tick ativo (< 1s). No estado idle, não aparece nada.

---

## O que NÃO está no escopo

- Sidebar, header, navegação
- Notificação por email ou qualquer integração externa

---

## Critérios de aceitação

1. Usuário autenticado sem clientes vê a `OnboardingView` fullscreen
2. Sidebar e header não aparecem
3. Avião anima com float suave
4. Botão "Sair da conta" funciona corretamente
5. Nome do usuário é exibido no greeting (ou email como fallback)
6. Dark mode funciona (cores via Tailwind/CSS vars)
7. Polling a cada 30s verifica se o usuário foi cadastrado em algum cliente
8. Ao detectar cliente, o app recarrega automaticamente e entra no fluxo normal
