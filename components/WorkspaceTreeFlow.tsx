'use client'

import { useEffect, useState } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Document } from '@/lib/store'

interface Props {
  docs: Document[]
  currentDocId?: string
}

const X_GAP = 220
const Y_GAP = 56

let _id = 0
const uid = () => `n-${++_id}`

function buildNodes(
  docs: Document[],
  currentDocId?: string,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let yOffset = 0

  const addEdge = (source: string, target: string) => {
    edges.push({
      id: `e-${source}-${target}`,
      source, target,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    })
  }

  const addDoc = (doc: Document, parentNodeId: string | null, x: number, y: number): number => {
    const isCurrent = doc.id === currentDocId
    const nid = uid()
    nodes.push({
      id: nid,
      position: { x, y },
      data: { label: doc.title },
      style: {
        background: isCurrent ? '#7c3aed' : '#6d28d9',
        border: `2px solid ${isCurrent ? '#7c3aed' : '#6d28d9'}`,
        color: '#fff',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        width: 160,
        textAlign: 'center' as const,
        boxShadow: isCurrent ? '0 0 0 3px #ddd6fe' : 'none',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })
    if (parentNodeId) addEdge(parentNodeId, nid)

    const children = docs.filter((d) => d.parent_id === doc.id)
    let nextY = y + Y_GAP
    for (const child of children) {
      nextY = addDoc(child, nid, x + X_GAP, nextY)
    }

    return nextY
  }

  const rootDocs = docs.filter((d) => d.parent_id === null)
  for (const doc of rootDocs) {
    const next = addDoc(doc, null, 0, yOffset)
    yOffset = next
  }

  return { nodes, edges }
}

export default function WorkspaceTreeFlow({ docs, currentDocId }: Props) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    _id = 0
    const { nodes: n, edges: e } = buildNodes(docs, currentDocId)
    setNodes(n)
    setEdges(e)
    setLoading(false)
  }, [docs, currentDocId])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">불러오는 중...</div>

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <p className="text-2xl mb-2">🗂</p>
          <p>문서를 추가하면 트리가 표시됩니다</p>
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
