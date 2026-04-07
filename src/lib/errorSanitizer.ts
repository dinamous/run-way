export const GENERIC_UI_ERROR = 'Não foi possível concluir a operação. Tente novamente.'

export function toSafeUiErrorMessage(message: string | null | undefined): string {
  if (!message) return GENERIC_UI_ERROR

  const lowered = message.toLowerCase()

  if (lowered.includes('network') || lowered.includes('timeout')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  if (lowered.includes('jwt') || lowered.includes('token') || lowered.includes('auth')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }

  if (lowered.includes('permission') || lowered.includes('forbidden') || lowered.includes('not allowed')) {
    return 'Você não possui permissão para esta ação.'
  }

  return GENERIC_UI_ERROR
}
