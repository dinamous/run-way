import { requireAdmin, getServiceClient, json, corsHeaders } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const db = getServiceClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  // GET actions
  if (req.method === 'GET') {
    if (action === 'listAuthUsers') {
      const search = url.searchParams.get('search') ?? ''
      const { data, error } = await db.auth.admin.listUsers()
      if (error || !data) return json({ error: error?.message ?? 'Failed' }, 500)
      let users = data.users.filter((u) => u.email)
      if (search) {
        const lower = search.toLowerCase()
        users = users.filter((u) =>
          u.email?.toLowerCase().includes(lower) ||
          u.user_metadata?.full_name?.toLowerCase().includes(lower)
        )
      }
      return json(users.slice(0, 20).map((u) => ({
        id: u.id,
        email: u.email!,
        avatarUrl: u.user_metadata?.avatar_url ?? null,
        name: u.user_metadata?.full_name ?? u.email!.split('@')[0],
      })))
    }

    if (action === 'listPending') {
      const allowedDomain = Deno.env.get('ALLOWED_DOMAIN')
      const { data, error } = await db.auth.admin.listUsers()
      if (error || !data) return json({ error: error?.message ?? 'Failed' }, 500)
      const { data: members } = await db.from('members').select('auth_user_id')
      const linked = new Set((members ?? []).map((m) => m.auth_user_id).filter(Boolean))
      const pending = []
      for (const u of data.users) {
        if (!u.email) continue
        const domain = u.email.split('@')[1]
        if (allowedDomain && domain !== allowedDomain) continue
        if (linked.has(u.id)) continue
        pending.push({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name ?? u.email.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url ?? null,
          lastSignInAt: u.last_sign_in_at ?? null,
        })
      }
      return json(pending)
    }

    if (action === 'userClientsMap') {
      const { data, error } = await db.from('user_clients').select('user_id, client_id')
      if (error) return json({ error: error.message }, 500)
      const map: Record<string, string[]> = {}
      for (const row of data ?? []) {
        if (!map[row.user_id]) map[row.user_id] = []
        map[row.user_id].push(row.client_id)
      }
      return json(map)
    }

    if (action === 'auditLogs') {
      const params = Object.fromEntries(url.searchParams)
      let query = db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      if (params.clientId)   query = query.eq('client_id', params.clientId)
      if (params.entity)     query = query.eq('entity', params.entity)
      if (params.userId)     query = query.eq('user_id', params.userId)
      if (params.entityName) query = query.ilike('entity_name', `%${params.entityName}%`)
      if (params.from)       query = query.gte('created_at', `${params.from}T00:00:00Z`)
      if (params.to)         query = query.lte('created_at', `${params.to}T23:59:59Z`)
      const { data, error } = await query
      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    return json({ error: 'Unknown action' }, 400)
  }

  // POST actions
  if (req.method === 'POST') {
    const body = await req.json()

    if (action === 'linkUser') {
      const { error } = await db.from('user_clients')
        .upsert({ user_id: body.userId, client_id: body.clientId })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'unlinkUser') {
      const { error } = await db.from('user_clients')
        .delete()
        .match({ user_id: body.userId, client_id: body.clientId })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'setRole') {
      const { error } = await db.from('members')
        .update({ access_role: body.role })
        .eq('id', body.userId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  }

  return json({ error: 'Method not allowed' }, 405)
})
