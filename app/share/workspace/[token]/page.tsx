'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Document, ShareLink, Comment } from '@/lib/store'
import { parseHeadings, type HeadingNode } from '@/lib/parseHeadings'

const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { ssr: false })

interface Workspace {
  id: string
  name: string
}

function DocItem({
  doc, docs, currentDocId, depth, onSelect,
}: {
  doc: Document
  docs: Document[]
  currentDocId: string | null
  depth: number
  onSelect: (doc: Document) => void
}) {
  const [open, setOpen] = useState(true)
  const kids = docs.filter((d) => d.parent_id === doc.id)
  const isCurrent = doc.id === currentDocId
  return (
    <li>
      <div
        className={`flex items-center gap-1 py-1 rounded cursor-pointer text-xs transition-colors ${isCurrent ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '6px' }}
        onClick={() => onSelect(doc)}
      >
        <button
          className="text-gray-300 w-3 shrink-0"
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        >
          {kids.length > 0 ? (open ? '▾' : '▸') : '·'}
        </button>
        <span className="truncate">{doc.title}</span>
      </div>
      {open && kids.length > 0 && (
        <ul>
          {kids.map((child) => (
            <DocItem key={child.id} doc={child} docs={docs} currentDocId={currentDocId} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

function DocTree({
  docs,
  currentDocId,
  onSelect,
}: {
  docs: Document[]
  currentDocId: string | null
  onSelect: (doc: Document) => void
}) {
  const rootDocs = docs.filter((d) => d.parent_id === null)
  return (
    <ul className="space-y-0.5">
      {rootDocs.map((doc) => (
        <DocItem key={doc.id} doc={doc} docs={docs} currentDocId={currentDocId} depth={0} onSelect={onSelect} />
      ))}
    </ul>
  )
}

export default function WorkspaceSharePage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [link, setLink] = useState<ShareLink | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview')
  const [showSections, setShowSections] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/share/workspace/${token}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) { setNotFound(true); return }
        setLink(data.link)
        setWorkspace(data.workspace)
        setDocs(data.docs)
        // URL에 doc 파라미터 있으면 그 문서, 없으면 첫 문서
        const docId = searchParams.get('doc')
        const initial = docId
          ? data.docs.find((d: Document) => d.id === docId)
          : data.docs.find((d: Document) => d.parent_id === null) ?? data.docs[0]
        if (initial) setSelectedDoc(initial)
      })
  }, [token])

  const loadComments = (docId: string) =>
    fetch(`/api/share/workspace/comment?doc_id=${docId}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))

  const handleSelect = (doc: Document) => {
    setSelectedDoc(doc)
    setComments([])
    setActiveSection(null)
    router.replace(`/share/workspace/${token}?doc=${doc.id}`, { scroll: false })
    loadComments(doc.id)
  }

  const handleAddComment = (sectionId: string) => {
    setActiveSection(sectionId)
    setCommentBody('')
  }

  useEffect(() => {
    if (selectedDoc) loadComments(selectedDoc.id)
  }, [selectedDoc?.id])

  const handleSubmitComment = async () => {
    if (!selectedDoc || !activeSection || !commentAuthor.trim() || !commentBody.trim()) return
    setSubmitting(true)
    await fetch('/api/share/workspace/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: selectedDoc.id, section_id: activeSection, author: commentAuthor, body: commentBody }),
    })
    await loadComments(selectedDoc.id)
    setCommentBody('')
    setSubmitting(false)
  }

  const handleDownloadDoc = () => {
    if (!selectedDoc) return
    const blob = new Blob([selectedDoc.content || ''], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${selectedDoc.title || 'untitled'}.md`
    a.click()
  }

  const handleDownloadAll = async () => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const doc of docs) {
      zip.file(`${doc.title || 'untitled'}.md`, doc.content || '')
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${workspace?.name || 'workspace'}.zip`
    a.click()
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-lg font-medium text-gray-600">링크를 찾을 수 없습니다</p>
          <p className="text-sm mt-1">삭제되었거나 잘못된 링크입니다</p>
        </div>
      </div>
    )
  }

  if (!link || !workspace) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="font-semibold text-gray-900 flex-1">{workspace.name}</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            미리보기
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'raw' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            MD
          </button>
        </div>
        {selectedDoc && (
          <button onClick={handleDownloadDoc} className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">↓ MD</button>
        )}
        <button onClick={handleDownloadAll} className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">↓ 전체</button>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          link.permission === 'view' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'
        }`}>
          {link.permission === 'view' ? '읽기 전용' : '코멘트 가능'}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 파일트리 사이드바 */}
        <aside className="w-52 bg-gray-50 border-r border-gray-200 overflow-auto shrink-0 py-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">문서</p>
            <button
              onClick={() => setShowSections((v) => !v)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${showSections ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
              title="섹션 패널 토글"
            >
              ≡
            </button>
          </div>
          <DocTree docs={docs} currentDocId={selectedDoc?.id ?? null} onSelect={handleSelect} />
        </aside>

        {/* 섹션 패널 */}
        {showSections && selectedDoc && (() => {
          const headings = parseHeadings(selectedDoc.content || '')
          if (!headings.length) return null
          function SectionList({ nodes, depth = 0 }: { nodes: HeadingNode[]; depth?: number }) {
            return (
              <>
                {nodes.map((node) => (
                  <div key={node.id}>
                    <a
                      href={`#${node.id}`}
                      className="block py-1 text-xs text-gray-600 hover:text-violet-600 truncate transition-colors"
                      style={{ paddingLeft: `${8 + depth * 10}px`, paddingRight: '8px' }}
                    >
                      {node.text}
                    </a>
                    {node.children.length > 0 && <SectionList nodes={node.children} depth={depth + 1} />}
                  </div>
                ))}
              </>
            )
          }
          return (
            <aside className="w-40 bg-white border-r border-gray-200 overflow-auto shrink-0 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">섹션</p>
              <SectionList nodes={headings} />
            </aside>
          )
        })()}

        {/* 본문 */}
        <div className="flex-1 overflow-hidden bg-white">
          {selectedDoc ? (
            viewMode === 'preview' ? (
              <MarkdownPreview
                content={selectedDoc.content}
                comments={comments}
                onAddComment={link.permission === 'comment' ? handleAddComment : undefined}
                permission={link.permission}
              />
            ) : (
              <pre className="h-full overflow-auto p-6 text-sm font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                {selectedDoc.content}
              </pre>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              왼쪽에서 문서를 선택하세요
            </div>
          )}
        </div>

        {/* 우측 코멘트 패널 */}
        {activeSection && link.permission === 'comment' && (
          <aside className="w-72 border-l border-gray-200 bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600">#{activeSection}</span>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            {/* 코멘트 목록 */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {comments.filter((c) => c.section_id === activeSection && !c.resolved).length === 0 ? (
                <p className="text-xs text-gray-400">아직 코멘트가 없습니다</p>
              ) : (
                comments
                  .filter((c) => c.section_id === activeSection && !c.resolved)
                  .map((c) => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{c.author}</span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ko')}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{c.body}</p>
                    </div>
                  ))
              )}
            </div>

            {/* 입력 */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <input
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="이름"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              />
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="코멘트를 입력하세요"
                rows={3}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment() }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !commentAuthor.trim() || !commentBody.trim()}
                className="w-full text-xs py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors"
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
