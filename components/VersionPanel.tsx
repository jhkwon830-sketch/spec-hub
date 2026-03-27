'use client'

import { useState } from 'react'
import type { Version } from '@/lib/store'

interface Props {
  versions: Version[]
  onSave: (label: string) => void
  onRestore: (versionId: string) => void
  onClose: () => void
}

export default function VersionPanel({ versions, onSave, onRestore, onClose }: Props) {
  const [label, setLabel] = useState('')

  const handleSave = () => {
    const l = label.trim() || `v${versions.length + 1}`
    onSave(l)
    setLabel('')
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-64 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">버전 이력</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="p-3 border-b border-gray-200 space-y-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="버전 이름 (예: v0.1 초안)"
          className="w-full bg-gray-50 text-gray-700 text-xs rounded px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleSave}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded py-1.5 font-medium transition-colors"
        >
          현재 상태 저장
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
        {versions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">저장된 버전이 없습니다</p>
        )}
        {versions.map((v) => (
          <div key={v.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700">{v.label}</p>
                <p className="text-xs text-gray-400">
                  {new Date(v.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => onRestore(v.id)}
                className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
              >
                복원
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
