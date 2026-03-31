import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const { workspaceId, permission } = await req.json()
  if (!workspaceId || !permission) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // 1. share_link 생성
  const { data: link, error } = await supabaseAdmin
    .from('share_links')
    .insert({ workspace_id: workspaceId, doc_id: null, permission })
    .select()
    .single()

  if (error || !link) return NextResponse.json({ error: 'failed' }, { status: 500 })

  // 2. 현재 문서 전체 스냅샷 저장
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, title, content, parent_id')
    .eq('workspace_id', workspaceId)

  if (docs && docs.length > 0) {
    await supabaseAdmin.from('published_docs').insert(
      docs.map((doc) => ({
        share_link_token: link.token,
        doc_id: doc.id,
        title: doc.title,
        content: doc.content,
        parent_id: doc.parent_id,
      }))
    )
  }

  return NextResponse.json({ link })
}
