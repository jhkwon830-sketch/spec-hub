import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 코멘트 목록 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const docId = searchParams.get('doc_id')
  if (!docId) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('doc_id', docId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ comments: data ?? [] })
}

// 코멘트 작성
export async function POST(req: Request) {
  const { doc_id, section_id, author, body } = await req.json()
  if (!doc_id || !section_id || !author || !body) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('comments')
    .insert({ doc_id, section_id, author, body })
    .select()
    .single()

  return NextResponse.json({ comment: data })
}
