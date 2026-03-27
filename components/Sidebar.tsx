'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Document } from '@/lib/store'

function DocNode({ doc, docs, currentDocId, depth, onCreateDoc, onDeleteDoc, onMoveDoc }: {
  doc: Document
  docs: Document[]
  currentDocId?: string
  depth: number
  onCreateDoc: (parentId: string | null) => Promise<void>
  onDeleteDoc: (id: string) => Promise<void>
  onMoveDoc: (docId: string, parentId: string | null) => Promise<void>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const children = docs.filter((d) => d.parent_id === doc.id)
  const isCurrent = doc.id === currentDocId

  return (
    <li>
      <div
        className={`group flex items-center gap-1 py-1 rounded cursor-pointer ${isCurrent ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
        style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: '6px' }}
      >
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-300 text-xs w-3 shrink-0"
        >
          {children.length > 0 ? (open ? '▾' : '▸') : '·'}
        </button>
        <span
          onClick={() => router.push(`/editor/${doc.id}`)}
          className={`flex-1 text-xs truncate ${isCurrent ? 'text-blue-700 font-medium' : 'text-gray-800'}`}
        >
          {doc.title}
        </span>
        <div className="relative opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600 text-xs px-1">⋯</button>
          {showMenu && (
            <div className="absolute right-0 top-5 z-50 bg-white border border-gray-200 rounded shadow-lg text-xs w-36">
              <button
                onClick={() => { onCreateDoc(doc.id); setShowMenu(false) }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
              >
                + 하위 문서
              </button>
              <div className="border-t border-gray-100">
                <div className="px-3 py-1 text-gray-400">상위 변경</div>
                <button
                  onClick={() => { onMoveDoc(doc.id, null); setShowMenu(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
                >
                  루트로
                </button>
                {docs.filter((d) => d.id !== doc.id && d.parent_id !== doc.id).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { onMoveDoc(doc.id, d.id); setShowMenu(false) }}
                    className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 truncate"
                  >
                    {d.title}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => { onDeleteDoc(doc.id); setShowMenu(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {open && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <DocNode
              key={child.id}
              doc={child}
              docs={docs}
              currentDocId={currentDocId}
              depth={depth + 1}
              onCreateDoc={onCreateDoc}
              onDeleteDoc={onDeleteDoc}
              onMoveDoc={onMoveDoc}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

interface Props {
  docs: Document[]
  currentDocId?: string
  onCreateDoc: (parentId: string | null) => Promise<void>
  onDeleteDoc: (id: string) => Promise<void>
  onMoveDoc: (docId: string, parentId: string | null) => Promise<void>
  onBulkCreate: () => void
  onDeleteAll: () => Promise<void>
}

export default function Sidebar({ docs, currentDocId, onCreateDoc, onDeleteDoc, onMoveDoc, onBulkCreate, onDeleteAll }: Props) {
  const rootDocs = docs.filter((d) => d.parent_id === null)
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">문서</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onBulkCreate}
            title="일괄 생성"
            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors"
          >
            일괄
          </button>
          <button
            onClick={() => onCreateDoc(null)}
            title="새 문서"
            className="text-gray-400 hover:text-gray-600 text-sm px-1"
          >
            +
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="text-gray-400 hover:text-gray-600 text-sm px-1"
              title="더보기"
            >
              ⋯
            </button>
            {showMore && (
              <div className="absolute right-0 top-5 z-50 bg-white border border-gray-200 rounded shadow-lg text-xs w-28">
                <button
                  onClick={() => { onDeleteAll(); setShowMore(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-500"
                >
                  전체 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {docs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-4">문서가 없습니다</p>
        ) : (
          <ul className="space-y-0.5">
            {rootDocs.map((doc) => (
              <DocNode
                key={doc.id}
                doc={doc}
                docs={docs}
                currentDocId={currentDocId}
                depth={0}
                onCreateDoc={onCreateDoc}
                onDeleteDoc={onDeleteDoc}
                onMoveDoc={onMoveDoc}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
