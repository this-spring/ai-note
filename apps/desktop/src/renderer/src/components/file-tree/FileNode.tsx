import { useRef, DragEvent } from 'react'
import type { FileNode } from '@shared/types/ipc'

interface FileNodeProps {
  node: FileNode
  depth: number
  isSelected: boolean
  isExpanded: boolean
  isRenaming: boolean
  renameValue: string
  onRenameChange: (value: string) => void
  onRenameSubmit: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDrop: (sourcePath: string, targetFolderPath: string) => void
}

// Simple icon characters for file types
function getFileIcon(node: FileNode, isExpanded: boolean): string {
  if (node.type === 'folder') {
    return isExpanded ? '\u{1F4C2}' : '\u{1F4C1}'
  }

  const ext = node.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'md':
    case 'markdown':
      return '\u{1F4DD}'
    case 'json':
      return '\u{1F4CB}'
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return '\u{1F4C4}'
    case 'css':
    case 'scss':
      return '\u{1F3A8}'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return '\u{1F5BC}'
    default:
      return '\u{1F4C4}'
  }
}

function FileNodeComponent({
  node,
  depth,
  isSelected,
  isExpanded,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onClick,
  onContextMenu,
  onDrop
}: FileNodeProps) {
  const indent = depth * 16
  const icon = getFileIcon(node, isExpanded)
  // Use a counter to handle nested dragEnter/dragLeave correctly
  const dragCounterRef = useRef(0)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1 && nodeRef.current) {
      nodeRef.current.style.backgroundColor = 'rgba(99, 102, 241, 0.12)'
      nodeRef.current.style.outline = '1px dashed rgba(99, 102, 241, 0.5)'
      nodeRef.current.style.outlineOffset = '-1px'
    }
  }

  const handleDragOver = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0 && nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    if (nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }

    if (node.type !== 'folder') return
    const sourcePath = e.dataTransfer.getData('text/plain')
    if (!sourcePath || sourcePath === node.path) return
    // Prevent dropping a folder into itself or its children
    if (node.path.startsWith(sourcePath + '/')) return
    onDrop(sourcePath, node.path)
  }

  const handleDragEnd = () => {
    dragCounterRef.current = 0
    if (nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }
  }

  return (
    <div
      ref={nodeRef}
      className={`flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-sm
        transition-colors select-none
        ${
          isSelected
            ? 'text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
        }`}
      style={{
        paddingLeft: `${indent + 8}px`,
        ...(isSelected ? { backgroundColor: 'rgba(99, 102, 241, 0.15)' } : {})
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Folder expand indicator */}
      {node.type === 'folder' && (
        <span className="w-3 text-center text-xs text-[var(--color-text-muted)]">
          {isExpanded ? '\u25BE' : '\u25B8'}
        </span>
      )}

      {/* Icon */}
      <span className="flex-shrink-0 text-xs">{icon}</span>

      {/* Name or rename input */}
      {isRenaming ? (
        <input
          autoFocus
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSubmit()
            if (e.key === 'Escape') onRenameSubmit()
          }}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-bg-primary)]
                     px-1 py-0 text-xs text-[var(--color-text-primary)] outline-none"
        />
      ) : (
        <span className="truncate">{node.name}</span>
      )}
    </div>
  )
}

export default FileNodeComponent
