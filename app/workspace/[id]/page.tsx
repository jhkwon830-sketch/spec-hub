'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { store } from '@/lib/store'
import type { Document } from '@/lib/store'
import Sidebar from '@/components/Sidebar'

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBulkCreate, setShowBulkCreate] = useState(false)

  useEffect(() => {
    store.getDocTree(id).then((docs) => {
      if (docs.length > 0) {
        router.replace(`/editor/${docs[0].id}`)
        return
      }
      setAllDocs([])
      setLoading(false)
    })
    store.listWorkspaces().then((ws) => {
      const w = ws.find((w) => w.id === id)
      if (w) setWorkspaceName(w.name)
    })
  }, [id, router])

  const handleCreateDoc = async (parentId: string | null) => {
    const doc = await store.createDoc('새 문서', '', parentId, id)
    router.push(`/editor/${doc.id}`)
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await store.deleteDoc(docId)
    const remaining = await store.getDocTree(id)
    setAllDocs(remaining)
  }

  const handleMoveDoc = async (docId: string, parentId: string | null) => {
    await store.updateDoc(docId, { parent_id: parentId })
    const docs = await store.getDocTree(id)
    setAllDocs(docs)
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 문서를 삭제하시겠습니까?')) return
    for (const doc of allDocs) await store.deleteDoc(doc.id)
    setAllDocs([])
  }

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const text = await file.text()
      const title = file.name.replace(/\.md$/i, '')
      const doc = await store.createDoc(title, text, null, id)
      router.push(`/editor/${doc.id}`)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 text-sm">불러오는 중...</div>

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* GNB */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">←</button>
        {workspaceName && (
          <>
            <span className="text-sm font-medium text-gray-700 shrink-0">{workspaceName}</span>
            <span className="text-gray-300 shrink-0">/</span>
          </>
        )}
        <span className="flex-1 text-gray-300 text-base">문서를 선택하세요</span>
        <div className="flex items-center gap-1.5 opacity-30 pointer-events-none">
          <button className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">구조도 보기</button>
          <button className="px-2.5 py-1 rounded text-sm text-gray-500">💬</button>
          <button className="px-2.5 py-1 rounded text-sm text-gray-500">🕐</button>
          <button className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">↓ MD</button>
          <button className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">↓ 전체</button>
          <button className="px-3 py-1 rounded text-xs font-medium bg-gray-800 text-white">발행</button>
          <button className="px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white">공유</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
          <Sidebar
            docs={allDocs}
            currentDocId={undefined}
            onCreateDoc={handleCreateDoc}
            onDeleteDoc={handleDeleteDoc}
            onMoveDoc={handleMoveDoc}
            onReorder={async (updates) => { await store.reorderDocs(updates); const docs = await store.getDocTree(id); setAllDocs(docs) }}
            onShareDoc={() => {}}
            onToggleExclude={async (docId, exclude) => { await store.toggleExcludeFromTree(docId, exclude); const docs = await store.getDocTree(id); setAllDocs(docs) }}
            onBulkCreate={() => setShowBulkCreate(true)}
            onDeleteAll={handleDeleteAll}
            onUpload={handleUpload}
          />
        </aside>

        {/* 빈 상태 */}
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-3xl mb-3">📄</p>
            <p className="text-sm mb-4">문서가 없습니다</p>
            <button
              onClick={() => handleCreateDoc(null)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              + 첫 문서 만들기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
