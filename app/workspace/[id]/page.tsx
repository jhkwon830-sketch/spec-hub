'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { store } from '@/lib/store'
import type { Document } from '@/lib/store'

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store.getDocTree(id).then((d) => {
      if (d.length > 0) {
        router.replace(`/editor/${d[0].id}`)
      } else {
        setDocs([])
        setLoading(false)
      }
    })
  }, [id, router])

  const handleCreate = async () => {
    const doc = await store.createDoc('새 문서', '', null, id)
    router.push(`/editor/${doc.id}`)
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
      불러오는 중...
    </div>
  )

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-3xl mb-3">📄</p>
        <p className="text-gray-500 mb-6 text-sm">문서가 없습니다</p>
        <button
          onClick={handleCreate}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + 첫 문서 만들기
        </button>
      </div>
    </div>
  )
}
