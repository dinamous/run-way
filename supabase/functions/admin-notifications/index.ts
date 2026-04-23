import { requireAdmin, getServiceClient, json, corsHeaders } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const db = getServiceClient()

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return json({ error: error.message }, 500)
    return json(data)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    // body.rows = array of notification objects (para createNotificationForAll)
    // ou campos individuais (para createNotification / createNotificationForClient)
    const rows = body.rows ?? [{
      user_id: body.userId ?? null,
      client_id: body.clientId ?? null,
      title: body.title,
      message: body.message,
      type: body.type ?? 'admin_broadcast',
      metadata: body.metadata ?? null,
    }]
    const { error } = await db.from('notifications').insert(rows)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
