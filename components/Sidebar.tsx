'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Document } from '@/lib/store'

function isDescendant(docs: Document[], ancestorId: string, docId: string): boolean {
  let current = docs.find((d) => d.id === docId)
  while (current && current.parent_id) {
    if (current.parent_id === ancestorId) return true
    current = docs.find((d) => d.id === current!.parent_id)
  }
  return false
}

function DocNode({
  doc, docs, currentDocId, depth, dragOverDocId, draggedDocId,
  onCreateDoc, onDeleteDoc, onMoveDoc, onDragStart, onDragOver, onDocDrop, onDragEnd,
}: {
  doc: Document
  docs: Document[]
  currentDocId?: string
  depth: number
  dragOverDocId: string | null
  draggedDocId: string | null
  onCreateDoc: (parentId: string | null) => Promise<void>
  onDeleteDoc: (id: string) => Promise<void>
  onMoveDoc: (docId: string, parentId: string | null) => Promise<void>
  onDragStart: (docId: string) => void
  onDragOver: (docId: string) => void
  onDocDrop: (targetDocId: string) => void
  onDragEnd: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const children = docs.filter((d) => d.parent_id === doc.id)
  const isCurrent = doc.id === currentDocId
  const isDropTarget = dragOverDocId === doc.id && draggedDocId !== doc.id
  const isDragging = draggedDocId === doc.id

  const canDrop = draggedDocId
    ? draggedDocId !== doc.id && !isDescendant(docs, draggedDocId, doc.id)
    : false

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', doc.id)
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(doc.id)
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files') && canDrop) {
            e.preventDefault()
            e.stopPropagation()
            onDragOver(doc.id)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!e.dataTransfer.types.includes('Files') && canDrop) {
            onDocDrop(doc.id)
          }
        }}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1 py-1 rounded cursor-pointer transition-colors
          ${isCurrent ? 'bg-blue-100' : 'hover:bg-gray-100'}
          ${isDropTarget && canDrop ? 'bg-blue-50 ring-1 ring-blue-400 ring-inset' : ''}
          ${isDragging ? 'opacity-40' : ''}
        `}
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
                <button
                  onClick={() => { onMoveDoc(doc.id, null); setShowMenu(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
                >
                  루트로 이동
                </button>
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
              dragOverDocId={dragOverDocId}
              draggedDocId={draggedDocId}
              onCreateDoc={onCreateDoc}
              onDeleteDoc={onDeleteDoc}
              onMoveDoc={onMoveDoc}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDocDrop={onDocDrop}
              onDragEnd={onDragEnd}
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
  onUpload: (files: FileList) => Promise<void>
}

export default function Sidebar({ docs, currentDocId, onCreateDoc, onDeleteDoc, onMoveDoc, onBulkCreate, onDeleteAll, onUpload }: Props) {
  const rootDocs = docs.filter((d) => d.parent_id === null)
  const [showMore, setShowMore] = useState(false)
  const [isFileDragging, setIsFileDragging] = useState(false)
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null)
  const [dragOverDocId, setDragOverDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setIsFileDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFileDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileDragging(false)
    if (e.dataTransfer.types.includes('Files')) {
      const files = e.dataTransfer.files
      if (files.length > 0) await onUpload(files)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(e.target.files)
      e.target.value = ''
    }
  }

  const handleDocDrop = (targetDocId: string) => {
    if (draggedDocId && draggedDocId !== targetDocId) {
      onMoveDoc(draggedDocId, targetDocId)
    }
    setDraggedDocId(null)
    setDragOverDocId(null)
  }

  const handleDragEnd = () => {
    setDraggedDocId(null)
    setDragOverDocId(null)
  }

  // 루트 드롭존 (드래그한 문서를 루트로)
  const handleRootDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    if (draggedDocId) {
      onMoveDoc(draggedDocId, null)
    }
    setDraggedDocId(null)
    setDragOverDocId(null)
  }

  return (
    <div
      className={`flex flex-col h-full transition-colors ${isFileDragging ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

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
            onClick={() => fileInputRef.current?.click()}
            title="md 파일 업로드"
            className="text-gray-400 hover:text-gray-600 text-sm px-1"
          >
            ↑
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
        {isFileDragging ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-400 text-xs gap-1">
            <span className="text-2xl">↑</span>
            <span>여기에 .md 파일을 놓으세요</span>
          </div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-4">문서가 없습니다</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {rootDocs.map((doc) => (
                <DocNode
                  key={doc.id}
                  doc={doc}
                  docs={docs}
                  currentDocId={currentDocId}
                  depth={0}
                  dragOverDocId={dragOverDocId}
                  draggedDocId={draggedDocId}
                  onCreateDoc={onCreateDoc}
                  onDeleteDoc={onDeleteDoc}
                  onMoveDoc={onMoveDoc}
                  onDragStart={(id) => setDraggedDocId(id)}
                  onDragOver={(id) => setDragOverDocId(id)}
                  onDocDrop={handleDocDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </ul>
            {/* 루트 드롭존 */}
            {draggedDocId && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverDocId(null) }}
                onDrop={handleRootDrop}
                className="mx-2 mt-1 h-8 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400"
              >
                여기에 놓으면 루트로 이동
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
