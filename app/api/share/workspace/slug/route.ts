import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function PATCH(req: Request) {
  const { token, slug } = await req.json()
  if (!token || !slug) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-').replace(/-+/g, '-')

  const { data, error } = await supabaseAdmin
    .from('share_links')
    .update({ slug: clean })
    .eq('token', token)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ link: data })
}
