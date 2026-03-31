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

type DropZone = 'before' | 'into' | 'after'

function DocNode({
  doc, docs, currentDocId, depth,
  dropTarget, draggedDocId,
  selectedIds, onToggleSelect,
  onCreateDoc, onDeleteDoc, onMoveDoc, onShareDoc, onToggleExclude,
  onDragStart, onDragOver, onDocDrop, onDragEnd,
}: {
  doc: Document
  docs: Document[]
  currentDocId?: string
  depth: number
  dropTarget: { docId: string; zone: DropZone } | null
  draggedDocId: string | null
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onCreateDoc: (parentId: string | null) => Promise<void>
  onDeleteDoc: (id: string) => Promise<void>
  onMoveDoc: (docId: string, parentId: string | null) => Promise<void>
  onShareDoc: (docId: string) => void
  onToggleExclude: (docId: string, exclude: boolean) => Promise<void>
  onDragStart: (docId: string) => void
  onDragOver: (docId: string, zone: DropZone) => void
  onDocDrop: (targetDocId: string, zone: DropZone) => void
  onDragEnd: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const children = docs.filter((d) => d.parent_id === doc.id)
  const isCurrent = doc.id === currentDocId
  const isDragging = draggedDocId === doc.id
  const isSelected = selectedIds.has(doc.id)
  const hasSelection = selectedIds.size > 0

  const canDrop = draggedDocId
    ? draggedDocId !== doc.id && !isDescendant(docs, draggedDocId, doc.id)
    : false

  const isDropTarget = dropTarget?.docId === doc.id && canDrop
  const zone = isDropTarget ? dropTarget!.zone : null

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files') || !canDrop) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height
    const z: DropZone = ratio < 0.3 ? 'before' : ratio > 0.7 ? 'after' : 'into'
    onDragOver(doc.id, z)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer.types.includes('Files') && canDrop && dropTarget?.docId === doc.id) {
      onDocDrop(doc.id, dropTarget!.zone)
    }
  }

  return (
    <li>
      {/* before 인디케이터 */}
      {zone === 'before' && (
        <div className="mx-2 h-0.5 bg-blue-400 rounded" style={{ marginLeft: `${8 + depth * 14}px` }} />
      )}

      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', doc.id)
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(doc.id)
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1 py-1 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50' : isCurrent ? 'bg-blue-100' : 'hover:bg-gray-100'}
          ${zone === 'into' ? 'ring-1 ring-blue-400 ring-inset' : ''}
          ${isDragging ? 'opacity-40' : ''}
        `}
        style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: '6px' }}
      >
        {/* 체크박스 */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(doc.id)}
          onClick={(e) => e.stopPropagation()}
          className={`shrink-0 w-3 h-3 rounded accent-blue-500 transition-opacity ${hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        />
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
                  onClick={() => { onShareDoc(doc.id); setShowMenu(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
                >
                  링크 발행
                </button>
              </div>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => { onMoveDoc(doc.id, null); setShowMenu(false) }}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
                >
                  루트로 이동
                </button>
              </div>
              <div className="border-t border-gray-100">
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!doc.exclude_from_tree}
                    onChange={() => { onToggleExclude(doc.id, !doc.exclude_from_tree); setShowMenu(false) }}
                    className="w-3 h-3 accent-blue-500"
                  />
                  <span className="text-gray-600">구조도 포함</span>
                </label>
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

      {/* after 인디케이터 */}
      {zone === 'after' && (
        <div className="h-0.5 bg-blue-400 rounded" style={{ marginLeft: `${8 + depth * 14}px`, marginRight: '6px' }} />
      )}

      {open && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <DocNode
              key={child.id}
              doc={child}
              docs={docs}
              currentDocId={currentDocId}
              depth={depth + 1}
              dropTarget={dropTarget}
              draggedDocId={draggedDocId}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onCreateDoc={onCreateDoc}
              onDeleteDoc={onDeleteDoc}
              onMoveDoc={onMoveDoc}
              onShareDoc={onShareDoc}
              onToggleExclude={onToggleExclude}
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
  onReorder: (updates: { id: string; sort_order: number }[]) => Promise<void>
  onShareDoc: (docId: string) => void
  onToggleExclude: (docId: string, exclude: boolean) => Promise<void>
  onBulkCreate: () => void
  onDeleteAll: () => Promise<void>
  onUpload: (files: FileList) => Promise<void>
}

export default function Sidebar({ docs, currentDocId, onCreateDoc, onDeleteDoc, onMoveDoc, onReorder, onShareDoc, onToggleExclude, onBulkCreate, onDeleteAll, onUpload }: Props) {
  const rootDocs = docs.filter((d) => d.parent_id === null)
  const [showMore, setShowMore] = useState(false)
  const [isFileDragging, setIsFileDragging] = useState(false)
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ docId: string; zone: DropZone } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`선택한 ${selectedIds.size}개 문서를 삭제하시겠습니까?`)) return
    setDeleteLoading(true)
    for (const id of selectedIds) {
      await onDeleteDoc(id)
    }
    setSelectedIds(new Set())
    setDeleteLoading(false)
  }

  const handleFileDragOver = (e: React.DragEvent) => {
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

  const handleFileDrop = async (e: React.DragEvent) => {
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

  const handleDocDrop = (targetDocId: string, zone: DropZone) => {
    if (!draggedDocId || draggedDocId === targetDocId) {
      setDraggedDocId(null)
      setDropTarget(null)
      return
    }

    const dragged = docs.find((d) => d.id === draggedDocId)!
    const target = docs.find((d) => d.id === targetDocId)!

    if (zone === 'into') {
      // 하위 자식으로 이동
      onMoveDoc(draggedDocId, targetDocId)
    } else {
      // 형제 순서 이동 (before/after)
      // target의 부모 아래 형제들 가져오기
      const siblings = docs.filter((d) => d.parent_id === target.parent_id)
      const withoutDragged = siblings.filter((d) => d.id !== draggedDocId)
      const targetIdx = withoutDragged.findIndex((d) => d.id === targetDocId)
      const insertIdx = zone === 'after' ? targetIdx + 1 : targetIdx
      withoutDragged.splice(insertIdx, 0, dragged)

      if (dragged.parent_id !== target.parent_id) {
        // 다른 부모면 계층 이동 후 순서 적용
        onMoveDoc(draggedDocId, target.parent_id).then(() => {
          onReorder(withoutDragged.map((d, i) => ({ id: d.id, sort_order: i })))
        })
      } else {
        onReorder(withoutDragged.map((d, i) => ({ id: d.id, sort_order: i })))
      }
    }

    setDraggedDocId(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedDocId(null)
    setDropTarget(null)
  }

  const handleRootDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    if (draggedDocId) {
      const dragged = docs.find((d) => d.id === draggedDocId)
      if (dragged && dragged.parent_id === null) {
        const roots = docs.filter((d) => d.parent_id === null && d.id !== draggedDocId)
        onReorder([...roots, dragged].map((d, i) => ({ id: d.id, sort_order: i })))
      } else {
        onMoveDoc(draggedDocId, null)
      }
    }
    setDraggedDocId(null)
    setDropTarget(null)
  }

  return (
    <div
      className={`flex flex-col h-full transition-colors ${isFileDragging ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''}`}
      onDragOver={handleFileDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      <input ref={fileInputRef} type="file" accept=".md" multiple className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">문서</span>
        <div className="flex items-center gap-1">
          <button onClick={onBulkCreate} title="일괄 생성" className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors">일괄</button>
          <button onClick={() => fileInputRef.current?.click()} title="md 파일 업로드" className="text-gray-400 hover:text-gray-600 text-sm px-1">↑</button>
          <button onClick={() => onCreateDoc(null)} title="새 문서" className="text-gray-400 hover:text-gray-600 text-sm px-1">+</button>
          <div className="relative">
            <button onClick={() => setShowMore(!showMore)} className="text-gray-400 hover:text-gray-600 text-sm px-1" title="더보기">⋯</button>
            {showMore && (
              <div className="absolute right-0 top-5 z-50 bg-white border border-gray-200 rounded shadow-lg text-xs w-32">
                <button onClick={() => { onDeleteAll(); setShowMore(false) }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-500">전체 삭제</button>
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
                  dropTarget={dropTarget}
                  draggedDocId={draggedDocId}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onCreateDoc={onCreateDoc}
                  onDeleteDoc={onDeleteDoc}
                  onMoveDoc={onMoveDoc}
                  onShareDoc={onShareDoc}
                  onToggleExclude={onToggleExclude}
                  onDragStart={(id) => setDraggedDocId(id)}
                  onDragOver={(id, zone) => setDropTarget({ docId: id, zone })}
                  onDocDrop={handleDocDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </ul>
            {draggedDocId && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDropTarget(null) }}
                onDrop={handleRootDrop}
                className="mx-2 mt-1 h-8 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400"
              >
                여기에 놓으면 루트로 이동
              </div>
            )}
          </>
        )}
      </div>

      {/* 다중 선택 삭제 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-white shrink-0">
          <span className="text-xs text-gray-500">{selectedIds.size}개 선택됨</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
            <button
              onClick={handleDeleteSelected}
              disabled={deleteLoading}
              className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
            >
              {deleteLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
