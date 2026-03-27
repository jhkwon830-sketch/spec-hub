import { supabase } from './supabase'

export interface Workspace {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  doc_id: string
  section_id: string
  author: string
  body: string
  created_at: string
  resolved: boolean
}

export interface Version {
  id: string
  doc_id: string
  label: string
  content: string
  created_at: string
}

export interface Document {
  id: string
  title: string
  content: string
  parent_id: string | null
  workspace_id: string | null
  created_at: string
  updated_at: string
  comments: Comment[]
  versions: Version[]
}

export interface ShareLink {
  token: string
  doc_id: string
  permission: 'view' | 'comment' | 'suggest'
  created_at: string
}

// MD 상단에 삽입할 관계 헤더 생성
function buildRelationHeader(parentTitle: string | null, childTitles: string[]): string {
  const lines: string[] = []
  if (parentTitle) lines.push(`상위: ${parentTitle}`)
  if (childTitles.length) lines.push(`하위: ${childTitles.join(' | ')}`)
  if (!lines.length) return ''
  return lines.join('\n') + '\n\n'
}

// MD에서 관계 헤더 제거 (실제 내용만 추출)
function stripRelationHeader(content: string): string {
  return content.replace(/^(상위:.*\n?)?(하위:.*\n?)?\n?/, '')
}

export const store = {
  // ── 워크스페이스 ───────────────────────────────
  async listWorkspaces(): Promise<Workspace[]> {
    const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    return data ?? []
  },

  async createWorkspace(name: string): Promise<Workspace> {
    const { data, error } = await supabase.from('workspaces').insert({ name }).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async updateWorkspace(id: string, name: string): Promise<void> {
    await supabase.from('workspaces').update({ name, updated_at: new Date().toISOString() }).eq('id', id)
  },

  async deleteWorkspace(id: string): Promise<void> {
    // documents는 on delete cascade로 자동 삭제
    await supabase.from('workspaces').delete().eq('id', id)
  },

  // ── 문서 ──────────────────────────────────────
  async getDoc(id: string): Promise<Document | null> {
    const [{ data: doc }, { data: comments }, { data: versions }] = await Promise.all([
      supabase.from('documents').select('*').eq('id', id).single(),
      supabase.from('comments').select('*').eq('doc_id', id).order('created_at', { ascending: true }),
      supabase.from('versions').select('*').eq('doc_id', id).order('created_at', { ascending: false }),
    ])
    if (!doc) return null
    return { ...doc, comments: comments ?? [], versions: versions ?? [] }
  },

  async touchWorkspace(workspaceId: string) {
    await supabase.from('workspaces').update({ updated_at: new Date().toISOString() }).eq('id', workspaceId)
  },

  async createDoc(title: string, content = '', parentId: string | null = null, workspaceId: string | null = null): Promise<Document> {
    let parentTitle: string | null = null
    if (parentId) {
      const { data: parent } = await supabase.from('documents').select('title, workspace_id').eq('id', parentId).single()
      if (parent) {
        parentTitle = parent.title
        if (!workspaceId) workspaceId = parent.workspace_id
      }
    }

    const header = buildRelationHeader(parentTitle, [])
    const finalContent = header + content

    const { data } = await supabase
      .from('documents')
      .insert({ title, content: finalContent, parent_id: parentId, workspace_id: workspaceId })
      .select()
      .single()

    if (parentId) await this.refreshParentHeader(parentId)
    if (workspaceId) this.touchWorkspace(workspaceId)

    return { ...data, comments: [], versions: [] }
  },

  async updateDoc(id: string, patch: Partial<Pick<Document, 'title' | 'content' | 'parent_id'>>) {
    const { data } = await supabase.from('documents').update(patch).eq('id', id).select().single()
    if (patch.title && data?.parent_id) await this.refreshParentHeader(data.parent_id)
    if (data?.workspace_id) this.touchWorkspace(data.workspace_id)
    return data
  },

  async deleteDoc(id: string) {
    const { data: doc } = await supabase.from('documents').select('parent_id, workspace_id').eq('id', id).single()
    await supabase.from('documents').delete().eq('id', id)
    if (doc?.parent_id) await this.refreshParentHeader(doc.parent_id)
    if (doc?.workspace_id) this.touchWorkspace(doc.workspace_id)
  },

  async refreshParentHeader(parentId: string) {
    const [{ data: parent }, { data: children }] = await Promise.all([
      supabase.from('documents').select('title, content').eq('id', parentId).single(),
      supabase.from('documents').select('title').eq('parent_id', parentId).order('created_at', { ascending: true }),
    ])
    if (!parent) return

    const childTitles = (children ?? []).map((c) => c.title)
    const { data: parentDoc } = await supabase.from('documents').select('parent_id').eq('id', parentId).single()
    let parentTitle: string | null = null
    if (parentDoc?.parent_id) {
      const { data: grandParent } = await supabase.from('documents').select('title').eq('id', parentDoc.parent_id).single()
      if (grandParent) parentTitle = grandParent.title
    }

    const header = buildRelationHeader(parentTitle, childTitles)
    const body = stripRelationHeader(parent.content)
    await supabase.from('documents').update({ content: header + body }).eq('id', parentId)
  },

  async getDocTree(workspaceId: string): Promise<Document[]> {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
    return (data ?? []).map((d) => ({ ...d, comments: [], versions: [] }))
  },

  // ── 버전 ──────────────────────────────────────
  async saveVersion(docId: string, label: string): Promise<Version | null> {
    const { data: doc } = await supabase.from('documents').select('content').eq('id', docId).single()
    if (!doc) return null
    const { data } = await supabase.from('versions').insert({ doc_id: docId, label, content: doc.content }).select().single()
    return data
  },

  async restoreVersion(docId: string, versionId: string): Promise<Document | null> {
    const { data: version } = await supabase.from('versions').select('content').eq('id', versionId).single()
    if (!version) return null
    await supabase.from('documents').update({ content: version.content }).eq('id', docId)
    return this.getDoc(docId)
  },

  // ── 코멘트 ────────────────────────────────────
  async addComment(docId: string, sectionId: string, author: string, body: string): Promise<Comment | null> {
    const { data } = await supabase.from('comments').insert({ doc_id: docId, section_id: sectionId, author, body }).select().single()
    return data
  },

  async resolveComment(docId: string, commentId: string): Promise<Document | null> {
    await supabase.from('comments').update({ resolved: true }).eq('id', commentId)
    return this.getDoc(docId)
  },

  // ── 공유 ──────────────────────────────────────
  async createShareLink(docId: string, permission: ShareLink['permission']): Promise<ShareLink> {
    const { data } = await supabase.from('share_links').insert({ doc_id: docId, permission }).select().single()
    return data
  },

  async getShareLink(token: string): Promise<ShareLink | null> {
    const { data } = await supabase.from('share_links').select('*').eq('token', token).single()
    return data ?? null
  },

  async getDocShareLinks(docId: string): Promise<ShareLink[]> {
    const { data } = await supabase.from('share_links').select('*').eq('doc_id', docId)
    return data ?? []
  },
}
