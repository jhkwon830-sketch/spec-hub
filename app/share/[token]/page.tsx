'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { store } from '@/lib/store'
import type { Document, ShareLink } from '@/lib/store'
import { parseHeadings } from '@/lib/parseHeadings'
import StructureTree from '@/components/StructureTree'
import CommentPanel from '@/components/CommentPanel'

const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { ssr: false })

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<Document | null>(null)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) { setNotFound(true); return }
        setLink(data.link)
        setDoc(data.doc)
      })
  }, [token])

  const handleAddComment = (sectionId: string) => {
    setActiveSectionId(sectionId)
    setShowComments(true)
  }

  const handleSubmitComment = async (sectionId: string, author: string, body: string) => {
    if (!doc || !link || !link.doc_id) return
    const comment = await store.addComment(link.doc_id, sectionId, author, body)
    if (comment) setDoc({ ...doc, comments: [...doc.comments, comment] })
  }

  const handleResolveComment = async (commentId: string) => {
    if (!link || !link.doc_id) return
    const updated = await store.resolveComment(link.doc_id, commentId)
    if (updated) setDoc(updated)
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

  if (!doc || !link) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">불러오는 중...</div>
  }

  const headings = parseHeadings(doc.content)
  const unresolvedCount = doc.comments.filter((c) => !c.resolved).length

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">{doc.title}</h1>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          link.permission === 'view'
            ? 'bg-gray-100 text-gray-500'
            : link.permission === 'comment'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-purple-100 text-purple-600'
        }`}>
          {link.permission === 'view' ? '읽기 전용' : '코멘트 가능'}
        </span>
        {link.permission !== 'view' && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            💬{unresolvedCount > 0 && ` ${unresolvedCount}`}
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-gray-50 border-r border-gray-200 overflow-auto shrink-0 py-3 px-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">구조</p>
          <StructureTree nodes={headings} />
        </aside>

        <div className="flex-1 overflow-hidden bg-white">
          <MarkdownPreview
            content={doc.content}
            comments={doc.comments}
            onAddComment={link.permission !== 'view' ? handleAddComment : undefined}
            permission={link.permission}
          />
        </div>

        {showComments && (
          <CommentPanel
            comments={doc.comments}
            activeSectionId={activeSectionId}
            onAdd={handleSubmitComment}
            onResolve={handleResolveComment}
            onClose={() => setShowComments(false)}
            permission={link.permission}
          />
        )}
      </div>
    </div>
  )
}
