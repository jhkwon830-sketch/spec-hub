'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '@/lib/store'
import type { Workspace } from '@/lib/store'

export default function HomePage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const list = await store.listWorkspaces()
    setWorkspaces(list)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { if (creating) inputRef.current?.focus() }, [creating])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const ws = await store.createWorkspace(name)
      setCreating(false)
      setNewName('')
      router.push(`/workspace/${ws.id}`)
    } catch (e) {
      console.error('워크스페이스 생성 실패:', e)
      alert('생성 실패: ' + (e as Error).message)
    }
  }

  const handleRename = async (id: string) => {
    const name = editingName.trim()
    if (!name) { setEditingId(null); return }
    await store.updateWorkspace(id, name)
    setEditingId(null)
    await refresh()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('워크스페이스와 모든 문서를 삭제합니까?')) return
    await store.deleteWorkspace(id)
    await refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spec Hub</h1>
            <p className="text-xs text-gray-400 mt-0.5">기능명세 · 구조시각화 · 유저플로우 · 피드백</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + 새 워크스페이스
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : (
          <>
            {creating && (
              <div className="mb-4 flex items-center gap-2 p-4 bg-white border border-blue-300 rounded-xl shadow-sm">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                  placeholder="워크스페이스 이름 (예: 쇼핑몰 앱, 어드민)"
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-300"
                />
                <button onClick={() => { setCreating(false); setNewName('') }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                <button onClick={handleCreate} className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">생성</button>
              </div>
            )}

            {workspaces.length === 0 && !creating ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">📂</p>
                <p className="text-gray-400 mb-2">워크스페이스가 없습니다</p>
                <p className="text-xs text-gray-300 mb-6">제품이나 프로젝트 단위로 워크스페이스를 만들어보세요</p>
                <button
                  onClick={() => setCreating(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  첫 워크스페이스 만들기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => router.push(`/workspace/${ws.id}`)}
                    className="group relative bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md rounded-xl p-5 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {editingId === ws.id ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(ws.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={() => handleRename(ws.id)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-1 text-base font-semibold focus:outline-none border-b border-blue-400"
                        />
                      ) : (
                        <h2 className="text-base font-semibold text-gray-900 truncate">{ws.name}</h2>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditingId(ws.id); setEditingName(ws.name) }}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1"
                          title="이름 변경"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, ws.id)}
                          className="text-gray-300 hover:text-red-400 text-xs px-1"
                          title="삭제"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      마지막 편집 {new Date(ws.updated_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
