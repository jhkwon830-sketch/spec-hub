import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // token 또는 slug로 조회
  const { data: link } = await supabaseAdmin
    .from('share_links')
    .select('*')
    .or(`token.eq.${token},slug.eq.${token}`)
    .not('workspace_id', 'is', null)
    .single()

  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('*')
    .eq('id', link.workspace_id)
    .single()

  if (!workspace) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // 링크에 연결된 publication의 스냅샷에서 읽기
  const { data: publishedDocs } = await supabaseAdmin
    .from('published_docs')
    .select('*')
    .eq('publication_id', link.publication_id)
    .order('published_at', { ascending: true })

  // doc_id를 id로 매핑해야 parent_id 계층 비교가 올바르게 동작
  const docs = (publishedDocs ?? []).map((d) => ({ ...d, id: d.doc_id }))
  return NextResponse.json({ link, workspace, docs })
}
