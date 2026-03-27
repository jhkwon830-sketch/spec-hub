export interface HeadingNode {
  id: string
  level: number
  text: string
  children: HeadingNode[]
}

export function parseHeadings(markdown: string): HeadingNode[] {
  const lines = markdown.split('\n')
  const headings: { level: number; text: string; id: string }[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '-')
      headings.push({ level, text, id })
    }
  }

  return buildTree(headings)
}

function buildTree(
  headings: { level: number; text: string; id: string }[]
): HeadingNode[] {
  const root: HeadingNode[] = []
  const stack: HeadingNode[] = []

  for (const h of headings) {
    const node: HeadingNode = { ...h, children: [] }

    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return root
}
