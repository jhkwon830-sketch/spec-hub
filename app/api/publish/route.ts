import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const { workspaceId } = await req.json()
  if (!workspaceId) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  // 1. publication 생성
  const { data: publication, error } = await supabaseAdmin
    .from('publications')
    .insert({ workspace_id: workspaceId })
    .select()
    .single()

  if (error || !publication) return NextResponse.json({ error: 'failed' }, { status: 500 })

  // 2. 현재 문서 스냅샷 저장
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, title, content, parent_id')
    .eq('workspace_id', workspaceId)

  if (docs && docs.length > 0) {
    await supabaseAdmin.from('published_docs').insert(
      docs.map((doc) => ({
        publication_id: publication.id,
        doc_id: doc.id,
        title: doc.title,
        content: doc.content,
        parent_id: doc.parent_id,
      }))
    )
  }

  // 3. 워크스페이스당 링크 1개 유지 (없으면 생성, 있으면 publication_id만 갱신)
  const { data: existingLinks } = await supabaseAdmin
    .from('share_links')
    .select('*')
    .eq('workspace_id', workspaceId)
    .not('workspace_id', 'is', null)

  let links = existingLinks ?? []

  if (links.length === 0) {
    // 최초 발행 - view + comment 링크 2개 생성
    const { data: newLinks } = await supabaseAdmin
      .from('share_links')
      .insert([
        { workspace_id: workspaceId, doc_id: null, permission: 'view', publication_id: publication.id },
        { workspace_id: workspaceId, doc_id: null, permission: 'comment', publication_id: publication.id },
      ])
      .select()
    links = newLinks ?? []
  } else {
    // 재발행 - 기존 링크에 최신 publication 연결
    for (const link of links) {
      await supabaseAdmin
        .from('share_links')
        .update({ publication_id: publication.id })
        .eq('token', link.token)
    }
    links = links.map((l: { token: string }) => ({ ...l, publication_id: publication.id }))
  }

  return NextResponse.json({ publication, links })
}
