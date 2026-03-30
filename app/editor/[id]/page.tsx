'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { store } from '@/lib/store'
import type { Document, ShareLink } from '@/lib/store'
import { parseHeadings } from '@/lib/parseHeadings'
import StructureTree from '@/components/StructureTree'
import CommentPanel from '@/components/CommentPanel'
import VersionPanel from '@/components/VersionPanel'
import ShareModal from '@/components/ShareModal'
import Sidebar from '@/components/Sidebar'

const Placeholder = () => <div className="h-full w-full bg-white" />
const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false, loading: Placeholder })
const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { ssr: false, loading: Placeholder })
const TreeFlow = dynamic(() => import('@/components/TreeFlow'), { ssr: false, loading: Placeholder })
const WorkspaceTreeFlow = dynamic(() => import('@/components/WorkspaceTreeFlow'), { ssr: false, loading: Placeholder })

type RightPanel = 'comments' | 'versions' | null
type Tab = 'preview' | 'tree' | 'flow'
type SidebarTab = 'files' | 'outline'

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [doc, setDoc] = useState<Document | null>(null)
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)
  const [activeTab, setActiveTab] = useState<Tab>('preview')
  const [showShare, setShowShare] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [showTreeDrawer, setShowTreeDrawer] = useState(false)
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workspaceId = useRef<string | null>(null)

  const refreshWorkspace = async () => {
    if (!workspaceId.current) return
    const docs = await store.getDocTree(workspaceId.current)
    setAllDocs(docs)
  }

  useEffect(() => {
    setDoc(null)
    setTitle('')
    setContent('')
    store.getDoc(id).then((d) => {
      if (!d) { router.push('/'); return }
      setDoc(d)
      setContent(d.content)
      setTitle(d.title)
      workspaceId.current = d.workspace_id
      if (d.workspace_id) {
        store.getDocTree(d.workspace_id).then(setAllDocs)
      }
    })
    store.getDocShareLinks(id).then(setShareLinks)
  }, [id, router])

  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      store.updateDoc(id, { content: val })
    }, 800)
  }, [id])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await store.updateDoc(id, { title: val })
      refreshWorkspace()
    }, 800)
  }

  const headings = useMemo(() => parseHeadings(content), [content])

  const handleAddComment = (sectionId: string) => {
    setActiveSectionId(sectionId)
    setRightPanel('comments')
  }

  const handleSubmitComment = async (sectionId: string, author: string, body: string) => {
    const comment = await store.addComment(id, sectionId, author, body)
    if (comment && doc) setDoc({ ...doc, comments: [...doc.comments, comment] })
  }

  const handleResolveComment = async (commentId: string) => {
    const updated = await store.resolveComment(id, commentId)
    if (updated) setDoc(updated)
  }

  const handleSaveVersion = async (label: string) => {
    const version = await store.saveVersion(id, label)
    if (version && doc) setDoc({ ...doc, versions: [version, ...doc.versions] })
  }

  const handleRestoreVersion = async (versionId: string) => {
    const updated = await store.restoreVersion(id, versionId)
    if (updated) { setDoc(updated); setContent(updated.content) }
  }

  const handleCreateShareLink = async (permission: ShareLink['permission']) => {
    const link = await store.createShareLink(id, permission)
    setShareLinks((prev) => [...prev, link])
    return link
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title || '문서'}.md`
    a.click()
  }

  // ── 사이드바 액션 ──────────────────────────────
  const handleCreateDoc = async (parentId: string | null) => {
    const d = await store.createDoc('새 문서', '', parentId, workspaceId.current)
    await refreshWorkspace()
    router.push(`/editor/${d.id}`)
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await store.deleteDoc(docId)
    await refreshWorkspace()
    if (docId === id) router.push('/')
  }

  const handleMoveDoc = async (docId: string, parentId: string | null) => {
    await store.updateDoc(docId, { parent_id: parentId })
    await refreshWorkspace()
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 문서를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return
    for (const doc of allDocs) {
      await store.deleteDoc(doc.id)
    }
    await refreshWorkspace()
    router.push('/')
  }

  const handleUpload = async (files: FileList) => {
    const mdFiles = Array.from(files).filter((f) => f.name.endsWith('.md'))
    if (mdFiles.length === 0) {
      alert('md 파일만 올릴 수 있어요')
      return
    }

    let lastDocId: string | null = null
    for (const file of mdFiles) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: 파일이 너무 커요 (5MB 초과)`)
        continue
      }
      const content = await file.text()
      const title = file.name.replace(/\.md$/, '')
      const d = await store.createDoc(title, content, null, workspaceId.current)
      lastDocId = d.id
    }

    await refreshWorkspace()
    if (lastDocId) router.push(`/editor/${lastDocId}`)
  }

  const handleBulkCreate = async () => {
    if (!bulkText.trim()) return
    setBulkLoading(true)
    try {
      const lines = bulkText.split('\n').filter((l) => l.trim())
      const stack: { id: string; depth: number }[] = []

      for (const line of lines) {
        const raw = line.replace(/\t/g, '  ')
        const depth = (raw.match(/^( +)/)?.[1].length ?? 0) / 2
        const title = raw.trim()
        if (!title) continue

        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
          stack.pop()
        }
        const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
        const doc = await store.createDoc(title, '', parentId, workspaceId.current)
        stack.push({ id: doc.id, depth })
      }

      await refreshWorkspace()
      setBulkText('')
      setShowBulkCreate(false)
    } finally {
      setBulkLoading(false)
    }
  }

  const unresolvedCount = doc?.comments.filter((c) => !c.resolved).length ?? 0

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* 상단 바 */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">←</button>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-gray-900 font-semibold text-base focus:outline-none placeholder:text-gray-300"
          placeholder="문서 제목"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTreeDrawer(!showTreeDrawer)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showTreeDrawer ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            구조도 보기
          </button>
          <ToolBtn active={rightPanel === 'comments'} onClick={() => setRightPanel(rightPanel === 'comments' ? null : 'comments')} title="코멘트">
            💬{unresolvedCount > 0 && <span className="ml-1 bg-blue-500 text-white text-xs px-1 rounded-full">{unresolvedCount}</span>}
          </ToolBtn>
          <ToolBtn active={rightPanel === 'versions'} onClick={() => setRightPanel(rightPanel === 'versions' ? null : 'versions')} title="버전 이력">
            🕐
          </ToolBtn>
          <button onClick={handleExport} className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">↓ MD</button>
          <button onClick={() => setShowShare(true)} className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">발행</button>
        </div>
      </header>

<div className="flex flex-1 overflow-hidden">
        {/* 좌: 사이드바 */}
        <aside className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
          <div className="flex border-b border-gray-200">
            {(['files', 'outline'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSidebarTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'files' ? '파일' : '구조'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {sidebarTab === 'files' ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <Sidebar
                    docs={allDocs}
                    currentDocId={id}
                    onCreateDoc={handleCreateDoc}
                    onDeleteDoc={handleDeleteDoc}
                    onMoveDoc={handleMoveDoc}
                    onBulkCreate={() => setShowBulkCreate(true)}
                    onDeleteAll={handleDeleteAll}
                    onUpload={handleUpload}
                  />
                </div>
              </>
            ) : (
              <div className="py-2 px-2">
                <StructureTree nodes={headings} />
              </div>
            )}
          </div>
        </aside>

        {/* 에디터 */}
        <div className="flex-1 overflow-hidden border-r border-gray-200">
          <MarkdownEditor value={content} onChange={handleContentChange} />
        </div>

        {/* 미리보기 */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          <div className="flex border-b border-gray-200 shrink-0">
            {(['preview', 'tree', 'flow'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'preview' ? '미리보기' : t === 'tree' ? '섹션 트리' : '유저플로우'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <MarkdownPreview content={content} comments={doc?.comments ?? []} onAddComment={handleAddComment} permission="edit" />
            ) : activeTab === 'tree' ? (
              <TreeFlow content={content} />
            ) : (
              <FlowView content={content} />
            )}
          </div>
        </div>

        {rightPanel === 'comments' && (
          <CommentPanel comments={doc?.comments ?? []} activeSectionId={activeSectionId}
            onAdd={handleSubmitComment} onResolve={handleResolveComment}
            onClose={() => setRightPanel(null)} permission="edit" />
        )}
        {rightPanel === 'versions' && (
          <VersionPanel versions={doc?.versions ?? []} onSave={handleSaveVersion}
            onRestore={handleRestoreVersion} onClose={() => setRightPanel(null)} />
        )}
      </div>

      {showShare && (
        <ShareModal docId={id} existingLinks={shareLinks}
          onCreateLink={handleCreateShareLink} onClose={() => setShowShare(false)} />
      )}

      {/* 전체 트리 드로어 */}
      {showTreeDrawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowTreeDrawer(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-[50vw] bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <span className="text-sm font-semibold text-gray-700">구조도 보기</span>
              <button onClick={() => setShowTreeDrawer(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <WorkspaceTreeFlow docs={allDocs} currentDocId={id} />
            </div>
          </div>
        </>
      )}

      {/* 일괄 생성 모달 */}
      {showBulkCreate && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => { setShowBulkCreate(false); setBulkText('') }} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">일괄 생성</span>
              <button onClick={() => { setShowBulkCreate(false); setBulkText('') }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 mb-3">들여쓰기(스페이스 2칸 또는 탭)로 계층 구조를 입력하세요</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full h-40 text-sm font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-400 resize-none text-gray-800"
                placeholder={'인증\n  로그인\n  회원가입\n대시보드\n  홈\n  통계'}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button onClick={() => { setShowBulkCreate(false); setBulkText('') }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">취소</button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkLoading || !bulkText.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {bulkLoading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ToolBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className={`px-2.5 py-1 rounded text-sm transition-colors ${
        active ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function FlowView({ content }: { content: string }) {
  const hasMermaid = content.includes('```mermaid')
  if (!hasMermaid) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <p className="text-2xl mb-2">📊</p>
          <p>Mermaid 코드블록을 추가하면 플로우가 표시됩니다</p>
          <pre className="mt-3 text-xs bg-gray-50 text-gray-500 p-3 rounded text-left border border-gray-200">
            {`\`\`\`mermaid\nflowchart LR\n  로그인 --> 메인화면\n\`\`\``}
          </pre>
        </div>
      </div>
    )
  }
  const mermaidBlocks = content.match(/```mermaid\n([\s\S]*?)```/g) || []
  const mermaidOnly = mermaidBlocks.join('\n\n')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: MarkdownPreview } = require('@/components/MarkdownPreview')
  return <MarkdownPreview content={mermaidOnly} permission="view" />
}
