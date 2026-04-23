import { requireAdmin, getServiceClient, json, corsHeaders } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const db = getServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('members')
      .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role, is_active, created_at, deactivated_at')
      .order('name')
    if (error) return json({ error: error.message }, 500)
    return json(data)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const initials = body.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const { data: member, error } = await db.from('members').insert({
      name: body.name,
      role: body.role,
      avatar: initials,
      auth_user_id: body.authUserId ?? null,
      access_role: body.accessRole ?? 'user',
      email: body.email ?? null,
      avatar_url: body.avatarUrl ?? null,
    }).select().single()
    if (error || !member) return json({ error: error?.message ?? 'Insert failed' }, 500)

    if (body.clientIds?.length > 0) {
      const rows = body.clientIds.map((cid: string) => ({ user_id: member.id, client_id: cid }))
      await db.from('user_clients').insert(rows)
    }
    return json(member)
  }

  if (req.method === 'PUT') {
    if (!id) return json({ error: 'Missing id' }, 400)
    const body = await req.json()

    if (action === 'deactivate') {
      const deactivated_at = new Date().toISOString()
      const { error } = await db.from('members').update({ is_active: false, deactivated_at }).eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, deactivated_at })
    }

    if (action === 'reactivate') {
      const { error } = await db.from('members').update({ is_active: true, deactivated_at: null }).eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'setAuthId') {
      const { error } = await db.from('members')
        .update({ auth_user_id: body.authUserId, avatar_url: body.avatarUrl ?? null })
        .eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    const initials = body.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const { error } = await db.from('members')
      .update({ name: body.name, role: body.role, email: body.email ?? null, avatar: initials })
      .eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
