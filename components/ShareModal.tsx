'use client'

import { useState } from 'react'
import type { ShareLink } from '@/lib/store'

interface Props {
  docId: string
  existingLinks: ShareLink[]
  onCreateLink: (permission: ShareLink['permission']) => Promise<ShareLink>
  onClose: () => void
}

export default function ShareModal({ docId, existingLinks, onCreateLink, onClose }: Props) {
  const [created, setCreated] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)

  const permissionLabels = {
    view: '읽기 전용 — 내용만 볼 수 있음',
    comment: '코멘트 — 읽기 + 코멘트 가능',
  }

  const handleCreate = async (permission: ShareLink['permission']) => {
    const link = await onCreateLink(permission)
    setCreated(link)
    setCopied(false)
  }

  const getUrl = (token: string) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${token}`
      : `/share/${token}`

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(getUrl(token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border border-gray-200 rounded-xl w-[480px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">발행</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-400">권한을 선택해 발행 링크를 만드세요</p>

          {(['view', 'comment'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleCreate(p)}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 capitalize">{p}</p>
              <p className="text-xs text-gray-400 mt-0.5">{permissionLabels[p]}</p>
            </button>
          ))}

          {created && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <p className="text-xs text-green-700 font-medium">발행됨 ({created.permission})</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getUrl(created.token)}
                  className="flex-1 bg-white text-gray-700 text-xs rounded px-2 py-1.5 border border-gray-200"
                />
                <button
                  onClick={() => copyUrl(created.token)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium"
                >
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>
            </div>
          )}

          {existingLinks.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-2">기존 링크</p>
              <div className="space-y-1.5">
                {existingLinks.map((l) => (
                  <div key={l.token} className="flex items-center gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.permission}</span>
                    <span className="flex-1 text-gray-400 truncate">/share/{l.token.slice(0, 8)}...</span>
                    <button
                      onClick={() => copyUrl(l.token)}
                      className="text-blue-500 hover:text-blue-700 shrink-0"
                    >
                      복사
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
