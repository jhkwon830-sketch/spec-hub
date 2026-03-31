'use client'

import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Comment } from '@/lib/store'

interface Props {
  content: string
  comments?: Comment[]
  onAddComment?: (sectionId: string) => void
  onSubmitComment?: (sectionId: string, author: string, body: string) => Promise<void>
  permission?: 'view' | 'comment' | 'suggest' | 'edit'
}

export default function MarkdownPreview({
  content,
  comments = [],
  onAddComment,
  onSubmitComment,
  permission = 'edit',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const renderer = new marked.Renderer()
    renderer.heading = ({ text, depth }) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '-')
      const sectionComments = comments.filter((c) => c.section_id === id && !c.resolved)
      const badge = sectionComments.length > 0
        ? `<span class="comment-badge" data-section="${id}">${sectionComments.length}</span>`
        : ''
      const canComment = permission !== 'view' && (onAddComment || onSubmitComment)
      const addBtn = canComment
        ? `<button class="add-comment-btn" data-section="${id}" title="코멘트 달기">💬</button>`
        : ''
      return `<h${depth} id="${id}" class="heading-anchor">${text}${badge}${addBtn}</h${depth}>\n`
    }
    marked.use({ renderer, gfm: true, breaks: true })

    const raw = marked.parse(content) as string
    ref.current.innerHTML = DOMPurify.sanitize(raw)

    // mermaid
    const els = ref.current.querySelectorAll('code.language-mermaid')
    if (els.length > 0) {
      import('mermaid').then((m) => {
        m.default.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
        els.forEach(async (el, i) => {
          if (!document.contains(el)) return
          const code = el.textContent || ''
          const id = `mermaid-${Date.now()}-${i}`
          try {
            const { svg } = await m.default.render(id, code)
            const wrapper = document.createElement('div')
            wrapper.className = 'mermaid-diagram'
            wrapper.innerHTML = svg
            el.parentElement?.replaceWith(wrapper)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            const wrapper = document.createElement('div')
            wrapper.style.cssText = 'border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;padding:10px 12px;font-size:12px;color:#b91c1c;white-space:pre-wrap;font-family:monospace'
            wrapper.textContent = `Mermaid 파싱 오류:\n${msg}`
            el.parentElement?.replaceWith(wrapper)
          }
        })
      })
    }
  }, [content, comments, permission])

  // 💬 클릭 핸들러
  useEffect(() => {
    if (!ref.current) return
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.add-comment-btn')
      if (!btn) return
      const sectionId = btn.getAttribute('data-section') || ''
      if (onAddComment) onAddComment(sectionId)
    }
    ref.current.addEventListener('click', handler)
    return () => ref.current?.removeEventListener('click', handler)
  }, [content, comments, onAddComment])

  return (
    <div
      ref={ref}
      className="prose prose-slate dark:prose-invert max-w-none p-6 h-full overflow-auto"
    />
  )
}
