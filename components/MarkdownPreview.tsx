'use client'

import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Comment } from '@/lib/store'

interface Props {
  content: string
  comments?: Comment[]
  onAddComment?: (sectionId: string) => void
  permission?: 'view' | 'comment' | 'suggest' | 'edit'
}

export default function MarkdownPreview({
  content,
  comments = [],
  onAddComment,
  permission = 'edit',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState('')

  useEffect(() => {
    const renderer = new marked.Renderer()

    renderer.heading = ({ text, depth }) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '-')
      const sectionComments = comments.filter(
        (c) => c.section_id === id && !c.resolved
      )
      const badge =
        sectionComments.length > 0
          ? `<span class="comment-badge" data-section="${id}">${sectionComments.length}</span>`
          : ''
      const addBtn =
        permission !== 'view'
          ? `<button class="add-comment-btn" data-section="${id}">💬</button>`
          : ''
      return `<h${depth} id="${id}" class="heading-anchor">${text}${badge}${addBtn}</h${depth}>\n`
    }

    marked.use({ renderer, gfm: true, breaks: true })

    const raw = marked.parse(content) as string
    setHtml(DOMPurify.sanitize(raw))
  }, [content, comments, permission])

  // Mermaid 렌더링
  useEffect(() => {
    if (!ref.current) return
    import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
      const els = ref.current!.querySelectorAll('code.language-mermaid')
      els.forEach(async (el, i) => {
        const code = el.textContent || ''
        const id = `mermaid-${Date.now()}-${i}`
        try {
          const { svg } = await m.default.render(id, code)
          const wrapper = document.createElement('div')
          wrapper.className = 'mermaid-diagram'
          wrapper.innerHTML = svg
          el.parentElement?.replaceWith(wrapper)
        } catch (e) {
          console.error('Mermaid error:', e)
        }
      })
    })
  }, [html])

  // 코멘트 버튼 이벤트
  useEffect(() => {
    if (!ref.current || !onAddComment) return
    const handler = (e: Event) => {
      const target = (e.target as HTMLElement).closest('.add-comment-btn')
      if (target) {
        const sectionId = target.getAttribute('data-section') || ''
        onAddComment(sectionId)
      }
    }
    ref.current.addEventListener('click', handler)
    return () => ref.current?.removeEventListener('click', handler)
  }, [html, onAddComment])

  return (
    <div
      ref={ref}
      className="prose prose-slate dark:prose-invert max-w-none p-6 h-full overflow-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
