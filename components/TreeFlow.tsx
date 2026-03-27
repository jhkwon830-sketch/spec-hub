'use client'

import { useEffect, useState } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { parseHeadings, type HeadingNode } from '@/lib/parseHeadings'

interface Props {
  content: string
}

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#1e293b', border: '#1e293b', text: '#ffffff' },
  2: { bg: '#6d28d9', border: '#6d28d9', text: '#ffffff' },
  3: { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' },
  4: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
}

const LEVEL_WIDTH: Record<number, number> = {
  1: 200,
  2: 180,
  3: 160,
  4: 140,
}

const X_GAP = 260
const Y_GAP = 60

let nodeIdCounter = 0

function flattenTree(
  nodes: HeadingNode[],
  parentId: string | null,
  level: number,
  xOffset: number,
  yStart: number,
  flowNodes: Node[],
  flowEdges: Edge[],
): number {
  let y = yStart

  for (const node of nodes) {
    nodeIdCounter++
    const id = `node-${nodeIdCounter}`
    const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS[4]
    const width = LEVEL_WIDTH[level] ?? 140

    flowNodes.push({
      id,
      position: { x: xOffset, y },
      data: { label: node.text },
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: level <= 2 ? 600 : 400,
        width,
        textAlign: 'center' as const,
        boxShadow: level === 1 ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    if (parentId) {
      flowEdges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      })
    }

    const childY = node.children.length > 0
      ? flattenTree(node.children, id, level + 1, xOffset + X_GAP, y, flowNodes, flowEdges)
      : y

    y = Math.max(y + Y_GAP, childY + (node.children.length > 0 ? Y_GAP : 0))
  }

  return y
}

export default function TreeFlow({ content }: Props) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    nodeIdCounter = 0
    const headings = parseHeadings(content)
    if (!headings.length) return

    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []
    flattenTree(headings, null, 1, 0, 0, flowNodes, flowEdges)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [content])

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <p className="text-2xl mb-2">🌲</p>
          <p>헤딩(#, ##, ###)을 추가하면 트리가 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
