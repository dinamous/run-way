const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SQL_INJECTION_PATTERN = /(--|;|\/\*|\*\/|\b(or|and)\b\s+\d+\s*=\s*\d+|\bunion\b\s+\bselect\b)/i

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'

type AccessRole = 'admin' | 'user'
type TaskPermission = 'tasks:read' | 'tasks:create' | 'tasks:update' | 'tasks:delete'

const TASK_COLLECTION_ROUTE = /^\/api\/tasks$/
const TASK_ITEM_ROUTE = /^\/api\/tasks\/([^/]+)$/

const REQUIRED_PERMISSION_BY_METHOD: Record<Exclude<HttpMethod, 'OPTIONS'>, TaskPermission> = {
  GET: 'tasks:read',
  POST: 'tasks:create',
  PUT: 'tasks:update',
  DELETE: 'tasks:delete',
}

const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://homol.capacity-dashboard.com',
  'https://capacity-dashboard.com',
]

export interface ApiRequest {
  method: HttpMethod
  path: string
  headers?: Record<string, string | undefined>
  body?: unknown
}

export interface ApiResponse {
  status: number
  body: Record<string, unknown>
  headers?: Record<string, string>
}

export interface AuthClaims {
  userId: string
  exp: number
  role: AccessRole
  permissions: TaskPermission[]
}

export interface TokenVerifier {
  verify: (token: string) => Promise<AuthClaims | null>
}

export interface RateLimiter {
  consume: (key: string) => boolean
}

export interface TaskRecord {
  id: string
  ownerId: string
  title: string
  clickupLink: string | null
  clientId: string | null
}

export interface CreateTaskInput {
  ownerId: string
  title: string
  clickupLink: string | null
  clientId: string | null
}

export interface UpdateTaskInput {
  title?: string
  clickupLink?: string | null
  clientId?: string | null
}

export interface TaskRepository {
  findById: (id: string) => Promise<TaskRecord | null>
  create: (input: CreateTaskInput) => Promise<TaskRecord>
  update: (id: string, input: UpdateTaskInput) => Promise<TaskRecord>
  remove: (id: string) => Promise<void>
}

interface Dependencies {
  tokenVerifier: TokenVerifier
  rateLimiter: RateLimiter
  repository: TaskRepository
  now: () => number
  corsAllowedOrigins?: string[]
}

export function createTasksApi(deps: Dependencies) {
  return {
    handle: async (request: ApiRequest): Promise<ApiResponse> => {
      if (!isAllowedApiPath(request.path)) {
        return { status: 404, body: { error: 'Rota não encontrada.' } }
      }

      const corsResult = validateCors(request.headers, deps.corsAllowedOrigins)
      if (!corsResult.ok) {
        return { status: 403, body: { error: 'Origem não permitida.' } }
      }

      if (request.method === 'OPTIONS') {
        return {
          status: 204,
          body: {},
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      const authResult = await authenticate(request.headers, deps.tokenVerifier, deps.now)
      if (!authResult.ok) {
        return {
          status: 401,
          body: { error: authResult.reason },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (!authorizeRouteAccess(request.method, authResult.claims)) {
        return {
          status: 403,
          body: { error: 'Acesso negado para este recurso.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (!deps.rateLimiter.consume(authResult.claims.userId)) {
        return {
          status: 429,
          body: { error: 'Limite de requisições excedido.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (request.path === '/api/tasks' && request.method === 'POST') {
        return withCors(
          await createTaskRoute(request.body, authResult.claims.userId, deps.repository),
          corsResult.origin
        )
      }

      const taskIdMatch = TASK_ITEM_ROUTE.exec(request.path)
      if (!taskIdMatch) {
        return {
          status: 404,
          body: { error: 'Rota não encontrada.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      const taskId = taskIdMatch[1]
      if (!isValidUuid(taskId) || hasSqlInjectionPattern(taskId)) {
        return {
          status: 400,
          body: { error: 'ID inválido.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      const task = await deps.repository.findById(taskId)
      if (!task) {
        return {
          status: 404,
          body: { error: 'Tarefa não encontrada.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (task.ownerId !== authResult.claims.userId) {
        return {
          status: 403,
          body: { error: 'Acesso negado para este recurso.' },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (request.method === 'GET') {
        return {
          status: 200,
          body: { data: task },
          headers: buildCorsHeaders(corsResult.origin),
        }
      }

      if (request.method === 'PUT') {
        return withCors(await updateTaskRoute(taskId, request.body, deps.repository), corsResult.origin)
      }

      if (request.method === 'DELETE') {
        await deps.repository.remove(taskId)
        return { status: 204, body: {}, headers: buildCorsHeaders(corsResult.origin) }
      }

      return {
        status: 405,
        body: { error: 'Método não permitido.' },
        headers: buildCorsHeaders(corsResult.origin),
      }
    },
  }
}

function withCors(response: ApiResponse, origin: string | null): ApiResponse {
  return {
    ...response,
    headers: {
      ...(response.headers ?? {}),
      ...buildCorsHeaders(origin),
    },
  }
}

async function createTaskRoute(
  body: unknown,
  userId: string,
  repository: TaskRepository
): Promise<ApiResponse> {
  const parsed = validateTaskPayload(body, true)
  if (!parsed.ok) {
    return { status: 400, body: { error: parsed.error } }
  }

  if (!parsed.value.title) {
    return { status: 400, body: { error: 'title é obrigatório.' } }
  }

  const task = await repository.create({
    ownerId: userId,
    title: parsed.value.title,
    clickupLink: parsed.value.clickupLink ?? null,
    clientId: parsed.value.clientId ?? null,
  })
  return { status: 201, body: { data: task } }
}

async function updateTaskRoute(
  taskId: string,
  body: unknown,
  repository: TaskRepository
): Promise<ApiResponse> {
  const parsed = validateTaskPayload(body, false)
  if (!parsed.ok) {
    return { status: 400, body: { error: parsed.error } }
  }

  const task = await repository.update(taskId, parsed.value)
  return { status: 200, body: { data: task } }
}

export function validateTaskPayload(body: unknown, requireTitle: boolean):
  | { ok: true; value: UpdateTaskInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Payload inválido.' }
  }

  const payload = body as Record<string, unknown>
  const result: UpdateTaskInput = {}

  if (requireTitle || Object.hasOwn(payload, 'title')) {
    const titleValidation = validateStringField(payload.title, {
      field: 'title',
      required: requireTitle,
      max: 120,
      allowEmpty: false,
    })
    if (!titleValidation.ok) return titleValidation
    if (titleValidation.value !== undefined) result.title = titleValidation.value
  }

  if (Object.hasOwn(payload, 'clickupLink')) {
    if (payload.clickupLink === null) {
      result.clickupLink = null
    } else {
      const linkValidation = validateStringField(payload.clickupLink, {
        field: 'clickupLink',
        required: false,
        max: 500,
        allowEmpty: true,
      })
      if (!linkValidation.ok) return linkValidation

      if (linkValidation.value) {
        try {
          const url = new URL(linkValidation.value)
          if (url.protocol !== 'https:') {
            return { ok: false, error: 'clickupLink deve usar HTTPS.' }
          }
          result.clickupLink = url.toString()
        } catch {
          return { ok: false, error: 'clickupLink inválido.' }
        }
      } else {
        result.clickupLink = null
      }
    }
  }

  if (Object.hasOwn(payload, 'clientId')) {
    if (payload.clientId === null) {
      result.clientId = null
    } else {
      const clientIdValidation = validateStringField(payload.clientId, {
        field: 'clientId',
        required: false,
        max: 36,
        allowEmpty: false,
      })
      if (!clientIdValidation.ok) return clientIdValidation
      if (clientIdValidation.value !== undefined) {
        if (!isValidUuid(clientIdValidation.value)) {
          return { ok: false, error: 'clientId inválido.' }
        }
        result.clientId = clientIdValidation.value
      }
    }
  }

  return { ok: true, value: result }
}

function validateStringField(
  value: unknown,
  options: { field: string; required: boolean; max: number; allowEmpty: boolean }
):
  | { ok: true; value: string | undefined }
  | { ok: false; error: string } {
  const { field, required, max, allowEmpty } = options

  if (value === undefined) {
    if (required) return { ok: false, error: `${field} é obrigatório.` }
    return { ok: true, value: undefined }
  }

  if (value === null || typeof value !== 'string') {
    return { ok: false, error: `${field} precisa ser string.` }
  }

  const normalized = value.trim()
  if (!allowEmpty && normalized.length === 0) {
    return { ok: false, error: `${field} não pode ser vazio.` }
  }

  if (normalized.length > max) {
    return { ok: false, error: `${field} excede ${max} caracteres.` }
  }

  if (hasSqlInjectionPattern(normalized)) {
    return { ok: false, error: `${field} contém padrão inseguro.` }
  }

  return { ok: true, value: normalized }
}

async function authenticate(
  headers: Record<string, string | undefined> | undefined,
  tokenVerifier: TokenVerifier,
  now: () => number
): Promise<
  | { ok: false; reason: string }
  | { ok: true; claims: AuthClaims }
> {
  const authorization = headers?.authorization ?? headers?.Authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { ok: false, reason: 'Não autorizado.' }
  }

  const token = authorization.slice(7)
  const claims = await tokenVerifier.verify(token)

  if (!claims || claims.exp <= now()) {
    return { ok: false, reason: 'Token inválido ou expirado.' }
  }

  return { ok: true, claims }
}

function isAllowedApiPath(path: string): boolean {
  return TASK_COLLECTION_ROUTE.test(path) || TASK_ITEM_ROUTE.test(path)
}

function authorizeRouteAccess(
  method: HttpMethod,
  claims: AuthClaims
): boolean {
  if (method === 'OPTIONS') return true

  const requiredPermission = REQUIRED_PERMISSION_BY_METHOD[method]
  const roleAllowed = claims.role === 'admin' || claims.role === 'user'
  const hasPermission = claims.permissions.includes(requiredPermission)

  return roleAllowed && hasPermission
}

function validateCors(
  headers: Record<string, string | undefined> | undefined,
  allowedOriginsOverride?: string[]
): { ok: true; origin: string | null } | { ok: false } {
  const origin = headers?.origin ?? headers?.Origin ?? null
  if (!origin) {
    return { ok: true, origin: null }
  }

  const allowedOrigins = allowedOriginsOverride ?? DEFAULT_CORS_ALLOWED_ORIGINS
  if (!allowedOrigins.includes(origin)) {
    return { ok: false }
  }

  return { ok: true, origin }
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    Vary: 'Origin',
  }
}

export function hasSqlInjectionPattern(value: string): boolean {
  return SQL_INJECTION_PATTERN.test(value)
}

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}
