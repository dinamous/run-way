import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

export async function requireAdmin(req: Request): Promise<{ userId: string; error?: never } | { userId?: never; error: Response }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  console.log('[requireAdmin] token prefix:', token.substring(0, 20))
  console.log('[requireAdmin] supabaseUrl:', supabaseUrl)
  console.log('[requireAdmin] serviceKey present:', !!serviceKey)

  // Usa o endpoint admin (/auth/v1/user) com service role key como apikey.
  // O SDK JS valida o JWT localmente antes de qualquer chamada, o que falha com ES256.
  // O fetch direto bypassa essa validação local e delega ao servidor Supabase.
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceKey,
    },
  })

  if (!userRes.ok) {
    const body = await userRes.json().catch(() => ({}))
    console.log('[requireAdmin] /auth/v1/user failed:', userRes.status, JSON.stringify(body))
    return { error: new Response(JSON.stringify({ error: 'Unauthorized', detail: body }), { status: 401 }) }
  }

  const user = await userRes.json()
  if (!user?.id) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
  }
  const { data: member } = await getServiceClient()
    .from('members')
    .select('access_role')
    .eq('auth_user_id', user.id)
    .single()

  if (member?.access_role !== 'admin') {
    return { error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }
  }

  return { userId: user.id }
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
