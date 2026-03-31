'use client'

import { useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, Handle, type Node, type Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Document } from '@/lib/store'

interface Props {
  docs: Document[]
  currentDocId?: string
  workspaceName?: string
}

type DepthOption = 'file' | 'h1' | 'h2' | 'h3'

const DEPTH_OPTIONS: { value: DepthOption; label: string }[] = [
  { value: 'file', label: '파일만' },
  { value: 'h1', label: 'H1 포함' },
  { value: 'h2', label: 'H2 포함' },
  { value: 'h3', label: 'H3 포함' },
]

const X_GAP = 240
const Y_GAP = 20
const DOC_NODE_HEIGHT = 40
const HEADING_NODE_HEIGHT = 32

let _id = 0
const uid = () => `n-${++_id}`

function parseHeadings(content: string, maxLevel: number): { text: string; level: number }[] {
  return content
    .split('\n')
    .filter((line) => {
      const m = line.match(/^(#{1,3}) /)
      return m && m[1].length <= maxLevel
    })
    .map((line) => {
      const m = line.match(/^(#{1,3}) /)!
      return { text: line.replace(/^#{1,3} /, '').trim(), level: m[1].length }
    })
}

function DocNodeComponent({ data }: { data: { title: string; isCurrent: boolean } }) {
  return (
    <div
      style={{
        background: data.isCurrent ? '#7c3aed' : '#6d28d9',
        border: `2px solid ${data.isCurrent ? '#7c3aed' : '#6d28d9'}`,
        borderRadius: 8,
        padding: '8px 12px',
        width: 180,
        height: DOC_NODE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        boxShadow: data.isCurrent ? '0 0 0 3px #ddd6fe' : 'none',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      {data.title}
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  )
}

function HeadingNodeComponent({ data }: { data: { text: string; level: number } }) {
  const indent = (data.level - 1) * 8
  const fontSize = data.level === 1 ? 12 : data.level === 2 ? 11 : 10
  const opacity = data.level === 1 ? 1 : data.level === 2 ? 0.85 : 0.7
  return (
    <div
      style={{
        background: '#ede9fe',
        border: '1.5px solid #c4b5fd',
        borderRadius: 6,
        padding: '4px 10px',
        paddingLeft: 10 + indent,
        width: 180,
        height: HEADING_NODE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        color: '#5b21b6',
        fontSize,
        opacity,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      {data.text}
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  )
}

function RootNodeComponent({ data }: { data: { name: string } }) {
  return (
    <div
      style={{
        background: '#1e1b4b',
        border: '2px solid #1e1b4b',
        borderRadius: 10,
        padding: '8px 14px',
        width: 180,
        height: DOC_NODE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      {data.name}
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  )
}

const nodeTypes = {
  rootNode: RootNodeComponent,
  docNode: DocNodeComponent,
  headingNode: HeadingNodeComponent,
}

function buildNodes(
  docs: Document[],
  currentDocId: string | undefined,
  maxHeadingLevel: number,
  workspaceName?: string,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const addEdge = (source: string, target: string, dashed = false) => {
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      style: { stroke: dashed ? '#c4b5fd' : '#94a3b8', strokeWidth: 1.5, strokeDasharray: dashed ? '4 3' : undefined },
    })
  }

  const addDoc = (doc: Document, parentNodeId: string | null, x: number, y: number): number => {
    const isCurrent = doc.id === currentDocId
    const nid = uid()

    nodes.push({
      id: nid,
      type: 'docNode',
      position: { x, y },
      data: { title: doc.title, isCurrent },
      style: { border: 'none', padding: 0, background: 'transparent' },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })
    if (parentNodeId) addEdge(parentNodeId, nid)

    let nextY = y + DOC_NODE_HEIGHT + Y_GAP

    // 헤딩 노드 + 자식 문서 모두 오른쪽 컬럼에 배치
    const childX = x + X_GAP

    if (maxHeadingLevel > 0) {
      const headings = parseHeadings(doc.content || '', maxHeadingLevel)
      // level별 마지막 노드 id 추적 (부모 연결용)
      const levelParent: Record<number, string> = { 0: nid }
      for (const h of headings) {
        const hid = uid()
        const hx = childX + (h.level - 1) * X_GAP
        nodes.push({
          id: hid,
          type: 'headingNode',
          position: { x: hx, y: nextY },
          data: { text: h.text, level: h.level },
          style: { border: 'none', padding: 0, background: 'transparent' },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        })
        // 가장 가까운 상위 레벨 노드에 연결
        const parentId = levelParent[h.level - 1] ?? nid
        addEdge(parentId, hid, true)
        levelParent[h.level] = hid
        // 이 레벨보다 하위 레벨 초기화 (형제로 돌아올 때)
        for (let l = h.level + 1; l <= 3; l++) delete levelParent[l]
        nextY += HEADING_NODE_HEIGHT + Y_GAP
      }
    }

    const children = docs.filter((d) => d.parent_id === doc.id)
    for (const child of children) {
      nextY = addDoc(child, nid, childX, nextY)
    }

    return nextY
  }

  const rootDocs = docs.filter((d) => d.parent_id === null)

  // 워크스페이스 루트 노드 (x=0, 1뎁스는 X_GAP, 2뎁스는 X_GAP*2 ...)
  const rootNid = uid()
  const totalHeight = rootDocs.length * (DOC_NODE_HEIGHT + Y_GAP)
  nodes.push({
    id: rootNid,
    type: 'rootNode',
    position: { x: 0, y: totalHeight / 2 - DOC_NODE_HEIGHT / 2 },
    data: { name: workspaceName || '워크스페이스' },
    style: { border: 'none', padding: 0, background: 'transparent' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  })

  let yOffset = 0
  for (const doc of rootDocs) {
    yOffset = addDoc(doc, rootNid, X_GAP, yOffset)
  }

  return { nodes, edges }
}

export default function WorkspaceTreeFlow({ docs: allDocs, currentDocId, workspaceName }: Props) {
  const [depth, setDepth] = useState<DepthOption>('file')
  const maxLevel = depth === 'file' ? 0 : depth === 'h1' ? 1 : depth === 'h2' ? 2 : 3

  const { nodes, edges } = useMemo(() => {
    _id = 0
    const docs = allDocs.filter((d) => !d.exclude_from_tree)

    return buildNodes(docs, currentDocId, maxLevel, workspaceName)
  }, [allDocs, currentDocId, maxLevel, workspaceName])

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
    <div className="h-full w-full relative">
      {/* 깊이 옵션 */}
      <div className="absolute top-3 right-3 z-10 flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
        {DEPTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDepth(opt.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              depth === opt.value
                ? 'bg-violet-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
