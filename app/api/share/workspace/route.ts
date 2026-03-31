import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const { workspaceId, permission, publicationId } = await req.json()
  if (!workspaceId || !permission || !publicationId) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { data: link, error } = await supabaseAdmin
    .from('share_links')
    .insert({ workspace_id: workspaceId, doc_id: null, permission, publication_id: publicationId })
    .select()
    .single()

  if (error || !link) return NextResponse.json({ error: 'failed' }, { status: 500 })

  return NextResponse.json({ link })
}
