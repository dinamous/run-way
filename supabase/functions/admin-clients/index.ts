import { requireAdmin, getServiceClient, json, corsHeaders } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const db = getServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (req.method === 'GET') {
    const { data, error } = await db.from('clients').select('*').order('name')
    if (error) return json({ error: error.message }, 500)
    return json(data)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { error } = await db.from('clients').insert({ name: body.name, slug: body.slug })
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  if (req.method === 'PUT') {
    if (!id) return json({ error: 'Missing id' }, 400)
    const body = await req.json()
    const { error } = await db.from('clients').update({ name: body.name, slug: body.slug }).eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (!id) return json({ error: 'Missing id' }, 400)
    const body = await req.json().catch(() => ({}))
    const { data: client } = await db.from('clients').select('id, name').eq('id', id).single()
    const { error } = await db.from('clients').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)

    if (body.actorUserId) {
      await db.from('audit_logs').insert({
        user_id: body.actorUserId,
        client_id: client?.id ?? id,
        entity: 'client',
        entity_id: id,
        entity_name: client?.name ?? body.name ?? id,
        action: 'delete',
        field: null,
        from_value: null,
        to_value: null,
      })
    }
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
