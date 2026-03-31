'use client'

import { useState } from 'react'
import type { ShareLink } from '@/lib/store'

interface Props {
  links: ShareLink[]
  onClose: () => void
  onRegenerate: (token: string) => Promise<void>
}

export default function WorkspaceShareModal({ links, onClose, onRegenerate }: Props) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [regeneratingToken, setRegeneratingToken] = useState<string | null>(null)

  const viewLink = links.find((l) => l.permission === 'view')
  const commentLink = links.find((l) => l.permission === 'comment')

  const getUrl = (link: ShareLink) => {
    const id = link.slug || link.token
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/share/workspace/${id}`
  }

  const copyUrl = (link: ShareLink) => {
    navigator.clipboard.writeText(getUrl(link))
    setCopiedToken(link.token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRegenerate = async (link: ShareLink) => {
    if (!confirm('링크를 재발급하면 기존 링크가 무효화됩니다. 계속할까요?')) return
    setRegeneratingToken(link.token)
    await onRegenerate(link.token)
    setRegeneratingToken(null)
  }

  const LinkRow = ({ link, label }: { link: ShareLink; label: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <button
          onClick={() => handleRegenerate(link)}
          disabled={regeneratingToken === link.token}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {regeneratingToken === link.token ? '발급 중...' : '새 링크 발급'}
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs text-gray-600 truncate">
          {getUrl(link)}
        </div>
        <button
          onClick={() => copyUrl(link)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium shrink-0"
        >
          {copiedToken === link.token ? '복사됨!' : '복사'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-[460px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">공유 링크</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5">
          {!viewLink && !commentLink ? (
            <p className="text-sm text-gray-400 text-center py-4">먼저 발행해주세요</p>
          ) : (
            <div className="space-y-5">
              {viewLink && <LinkRow link={viewLink} label="읽기 전용" />}
              {commentLink && (
                <>
                  {viewLink && <div className="border-t border-gray-100" />}
                  <LinkRow link={commentLink} label="코멘트 가능" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
