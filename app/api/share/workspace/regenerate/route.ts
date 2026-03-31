import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const { data: old } = await supabaseAdmin
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single()

  if (!old) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await supabaseAdmin.from('share_links').delete().eq('token', token)

  const { data: newLink } = await supabaseAdmin
    .from('share_links')
    .insert({
      workspace_id: old.workspace_id,
      doc_id: old.doc_id,
      permission: old.permission,
      publication_id: old.publication_id,
    })
    .select()
    .single()

  return NextResponse.json({ link: newLink })
}
