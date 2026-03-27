'use client'

import { useState } from 'react'
import type { Comment } from '@/lib/store'

interface Props {
  comments: Comment[]
  activeSectionId: string | null
  onAdd: (sectionId: string, author: string, body: string) => void
  onResolve: (commentId: string) => void
  onClose: () => void
  permission: 'view' | 'comment' | 'suggest' | 'edit'
}

export default function CommentPanel({
  comments,
  activeSectionId,
  onAdd,
  onResolve,
  onClose,
  permission,
}: Props) {
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  const filtered = comments.filter(
    (c) => (showResolved ? true : !c.resolved) && (!activeSectionId || c.section_id === activeSectionId)
  )

  const handleSubmit = () => {
    if (!activeSectionId || !body.trim()) return
    onAdd(activeSectionId, author.trim() || '익명', body.trim())
    setBody('')
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-72 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">코멘트</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showResolved ? '미해결만' : '전체 보기'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2 space-y-3">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">코멘트가 없습니다</p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className={`rounded-lg p-3 text-sm border ${c.resolved ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-700">{c.author}</span>
              <span className="text-xs text-gray-400">
                {new Date(c.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed mb-2">
              <span className="text-blue-500 text-xs">#{c.section_id}</span>
              <br />
              {c.body}
            </p>
            {!c.resolved && permission !== 'view' && (
              <button
                onClick={() => onResolve(c.id)}
                className="text-xs text-green-600 hover:text-green-700"
              >
                ✓ 해결됨
              </button>
            )}
          </div>
        ))}
      </div>

      {activeSectionId && permission !== 'view' && (
        <div className="p-3 border-t border-gray-200 space-y-2">
          <p className="text-xs text-gray-400">
            <span className="text-blue-500">#{activeSectionId}</span> 에 코멘트
          </p>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름 (선택)"
            className="w-full bg-gray-50 text-gray-700 text-xs rounded px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-blue-400"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="코멘트를 입력하세요..."
            rows={3}
            className="w-full bg-gray-50 text-gray-700 text-xs rounded px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!body.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded py-1.5 font-medium transition-colors"
          >
            등록
          </button>
        </div>
      )}
    </div>
  )
}
