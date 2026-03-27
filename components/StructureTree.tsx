'use client'

import { HeadingNode } from '@/lib/parseHeadings'

interface Props {
  nodes: HeadingNode[]
  depth?: number
}

export default function StructureTree({ nodes, depth = 0 }: Props) {
  if (!nodes.length) {
    return (
      <p className="text-xs text-gray-400 px-3 py-2">
        헤딩(#, ##, ###)을 추가하면 구조가 표시됩니다
      </p>
    )
  }

  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'ml-3 space-y-0.5 border-l border-gray-200 pl-2'}>
      {nodes.map((node) => (
        <li key={node.id + node.text}>
          <a
            href={`#${node.id}`}
            className={`
              block py-0.5 text-sm leading-5 truncate hover:text-blue-600 transition-colors
              ${depth === 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}
            `}
          >
            {node.text}
          </a>
          {node.children.length > 0 && (
            <StructureTree nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}
