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
import WorkspaceShareModal from '@/components/WorkspaceShareModal'
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
  const [showWorkspaceShare, setShowWorkspaceShare] = useState(false)
  const [workspaceShareLinks, setWorkspaceShareLinks] = useState<ShareLink[]>([])
  const [showDocShare, setShowDocShare] = useState(false)
  const [docShareLinks, setDocShareLinks] = useState<ShareLink[]>([])
  const [sharingDocId, setSharingDocId] = useState<string | null>(null)
  const [latestPublicationId, setLatestPublicationId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [showTreeDrawer, setShowTreeDrawer] = useState(false)
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [treeFullView, setTreeFullView] = useState(false)

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
      const prevWsId = workspaceId.current
      workspaceId.current = d.workspace_id
      if (d.workspace_id) {
        // 같은 워크스페이스면 allDocs 유지한 채 백그라운드 갱신 (LNB 깜빡임 방지)
        if (prevWsId !== d.workspace_id) {
          setAllDocs([])
          store.listWorkspaces().then((ws) => {
            const w = ws.find((w) => w.id === d.workspace_id)
            if (w) setWorkspaceName(w.name)
          })
          store.getWorkspaceShareLinks(d.workspace_id).then(setWorkspaceShareLinks)
        }
        store.getDocTree(d.workspace_id).then(setAllDocs)
      }
    })
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

  const handlePublish = async () => {
    const wsId = workspaceId.current
    if (!wsId) return
    setPublishing(true)
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId }),
    })
    const data = await res.json()
    if (data.publication) setLatestPublicationId(data.publication.id)
    if (data.links) setWorkspaceShareLinks(data.links)
    setPublishing(false)
    alert('발행 완료!')
  }

  const handleRegenerate = async (token: string) => {
    const res = await fetch('/api/share/workspace/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) return
    const data = await res.json()
    setWorkspaceShareLinks((prev) => prev.map((l) => l.token === token ? data.link : l))
  }

  const handleShareDoc = async (docId: string) => {
    setSharingDocId(docId)
    const links = await store.getDocShareLinks(docId)
    setDocShareLinks(links)
    setShowDocShare(true)
  }

  const handleCreateDocShareLink = async (permission: ShareLink['permission']) => {
    if (!sharingDocId) return { token: '', doc_id: null, workspace_id: null, permission, created_at: '' } as ShareLink
    const link = await store.createDocShareLink(sharingDocId, permission)
    setDocShareLinks((prev) => [...prev, link])
    return link
  }

  // 기존 handleCreateShareLink (이름 유지 혹시 다른 곳에서 쓰일 경우 대비)
  const handleCreateShareLink = async (permission: ShareLink['permission']) => {
    const link = await store.createDocShareLink(id, permission)
    setDocShareLinks((prev) => [...prev, link])
    return link
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title || '문서'}.md`
    a.click()
  }

  const handleExportAll = async () => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const doc of allDocs) {
      zip.file(`${doc.title || 'untitled'}.md`, doc.content || '')
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${workspaceName || 'workspace'}.zip`
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
    const remaining = await store.getDocTree(workspaceId.current!)
    setAllDocs(remaining)
    if (remaining.length === 0) {
      router.push(`/workspace/${workspaceId.current}`)
    } else if (docId === id) {
      router.push(`/editor/${remaining[0].id}`)
    }
  }

  const handleMoveDoc = async (docId: string, parentId: string | null) => {
    await store.updateDoc(docId, { parent_id: parentId })
    await refreshWorkspace()
  }

  const handleToggleExclude = async (docId: string, exclude: boolean) => {
    await store.toggleExcludeFromTree(docId, exclude)
    await refreshWorkspace()
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 문서를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return
    for (const doc of allDocs) {
      await store.deleteDoc(doc.id)
    }
    setAllDocs([])
    router.push(`/workspace/${workspaceId.current}`)
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
        {workspaceName && (
          <>
            <span className="text-sm font-medium text-gray-700 shrink-0">{workspaceName}</span>
            <span className="text-gray-300 shrink-0">/</span>
          </>
        )}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-gray-900 font-semibold text-base focus:outline-none placeholder:text-gray-300"
          placeholder="문서 제목"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTreeDrawer(!showTreeDrawer)}
            disabled={!doc}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${showTreeDrawer ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            구조도 보기
          </button>
          <ToolBtn active={rightPanel === 'comments'} onClick={() => setRightPanel(rightPanel === 'comments' ? null : 'comments')} title="코멘트" disabled={!doc}>
            💬{unresolvedCount > 0 && <span className="ml-1 bg-blue-500 text-white text-xs px-1 rounded-full">{unresolvedCount}</span>}
          </ToolBtn>
          <ToolBtn active={rightPanel === 'versions'} onClick={() => setRightPanel(rightPanel === 'versions' ? null : 'versions')} title="버전 이력" disabled={!doc}>
            🕐
          </ToolBtn>
          <button onClick={handleExport} disabled={!doc} className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">↓ MD</button>
          <button onClick={handleExportAll} disabled={!doc} className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">↓ 전체</button>
          <button onClick={handlePublish} disabled={publishing || !doc} className="px-3 py-1 rounded text-xs font-medium bg-gray-800 hover:bg-gray-900 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">{publishing ? '발행 중...' : '발행'}</button>
          {workspaceShareLinks.length > 0 && (
            <button onClick={() => setShowWorkspaceShare(true)} className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">공유</button>
          )}
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
                    onReorder={async (updates) => { await store.reorderDocs(updates); await refreshWorkspace() }}
                    onBulkCreate={() => setShowBulkCreate(true)}
                    onDeleteAll={handleDeleteAll}
                    onUpload={handleUpload}
                    onShareDoc={handleShareDoc}
                    onToggleExclude={handleToggleExclude}
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
            {(['preview', 'tree', 'flow'] as const).map((t) => {
              const mermaidCount = (content.match(/```mermaid/g) || []).length
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'preview' ? '미리보기' : t === 'tree' ? '섹션 트리' : (
                    <span className="flex items-center gap-1">
                      다이어그램
                      {mermaidCount > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${activeTab === 'flow' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {mermaidCount}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
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

      {showWorkspaceShare && (
        <WorkspaceShareModal
          links={workspaceShareLinks}
          onClose={() => setShowWorkspaceShare(false)}
          onRegenerate={handleRegenerate}
        />
      )}

      {showDocShare && sharingDocId && (
        <ShareModal docId={sharingDocId} existingLinks={docShareLinks}
          onCreateLink={handleCreateDocShareLink} onClose={() => { setShowDocShare(false); setSharingDocId(null) }} />
      )}

      {/* 전체 트리 드로어 */}
      {showTreeDrawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowTreeDrawer(false)}
          />
          <div className={`fixed top-0 right-0 z-50 h-full bg-white border-l border-gray-200 flex flex-col shadow-2xl transition-all duration-200 ${treeFullView ? 'w-full border-l-0' : 'w-[50vw]'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <span className="text-sm font-semibold text-gray-700">{workspaceName || '구조도 보기'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTreeFullView((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 text-sm px-2 py-0.5 rounded hover:bg-gray-100"
                  title={treeFullView ? '절반 보기' : '전체 화면'}
                >
                  {treeFullView ? '⊠' : '⊞'}
                </button>
                <button onClick={() => { setShowTreeDrawer(false); setTreeFullView(false) }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <WorkspaceTreeFlow docs={allDocs} currentDocId={id} workspaceName={workspaceName} />
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

function ToolBtn({ active, onClick, title, children, disabled }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`px-2.5 py-1 rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
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
  // 각 mermaid 블록 앞 헤딩 추출
  const lines = content.split('\n')
  const diagrams: { title: string; code: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```mermaid')) {
      const titleLine = lines[i - 1] ?? ''
      const title = titleLine.match(/^#{1,6} (.+)$/) ? titleLine.replace(/^#{1,6} /, '') : ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      diagrams.push({ title, code: '```mermaid\n' + codeLines.join('\n') + '\n```' })
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: MarkdownPreview } = require('@/components/MarkdownPreview')
  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {diagrams.map((d, i) => (
        <div key={i}>
          {d.title && <p className="text-xs font-semibold text-gray-500 mb-2">{d.title}</p>}
          <MarkdownPreview content={d.code} permission="view" />
        </div>
      ))}
    </div>
  )
}
