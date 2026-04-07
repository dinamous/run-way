const DEFAULT_ALLOWED_PATHS = ['/']

function parseCsv(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
}

function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

export function getAllowedRedirectOrigins(currentOrigin: string): string[] {
  const custom = parseCsv(import.meta.env.VITE_REDIRECT_ALLOWED_ORIGINS as string | undefined)
  if (custom.length > 0) return custom

  return [
    currentOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://homol.capacity-dashboard.com',
    'https://capacity-dashboard.com',
  ]
}

export function getAllowedRedirectPaths(): string[] {
  const custom = parseCsv(import.meta.env.VITE_REDIRECT_ALLOWED_PATHS as string | undefined)
  if (custom.length > 0) {
    return custom.map(normalizePath)
  }
  return DEFAULT_ALLOWED_PATHS
}

export function getSafeRedirectUrl(rawUrl: string, currentOrigin: string): string {
  try {
    const allowedOrigins = getAllowedRedirectOrigins(currentOrigin)
    const allowedPaths = getAllowedRedirectPaths()
    const parsed = new URL(rawUrl, currentOrigin)

    if (!allowedOrigins.includes(parsed.origin)) {
      return `${currentOrigin}/`
    }

    if (!allowedPaths.includes(parsed.pathname)) {
      return `${currentOrigin}/`
    }

    return parsed.toString()
  } catch {
    return `${currentOrigin}/`
  }
}
