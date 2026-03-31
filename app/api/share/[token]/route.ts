import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: link } = await supabaseAdmin
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single()

  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: doc }, { data: comments }, { data: versions }] = await Promise.all([
    supabaseAdmin.from('documents').select('*').eq('id', link.doc_id).single(),
    supabaseAdmin.from('comments').select('*').eq('doc_id', link.doc_id).order('created_at', { ascending: true }),
    supabaseAdmin.from('versions').select('*').eq('doc_id', link.doc_id).order('created_at', { ascending: false }),
  ])

  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ link, doc: { ...doc, comments: comments ?? [], versions: versions ?? [] } })
}
