'use client'

import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'


interface Props {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export default function MarkdownEditor({ value, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          lineNumbers(),
          markdown(),
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
          EditorState.readOnly.of(readOnly),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px', background: '#fff' },
            '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
            '.cm-content': { padding: '16px' },
            '.cm-gutters': { background: '#f9fafb', borderRight: '1px solid #e5e7eb', color: '#9ca3af' },
            '.cm-activeLineGutter': { background: '#eff6ff' },
            '.cm-activeLine': { background: '#eff6ff' },
            '.cm-cursor': { borderLeftColor: '#3b82f6' },
            '.cm-selectionBackground': { background: '#bfdbfe !important' },
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부 value 변경 동기화 (버전 복원 등)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return <div ref={containerRef} className="h-full w-full" />
}
