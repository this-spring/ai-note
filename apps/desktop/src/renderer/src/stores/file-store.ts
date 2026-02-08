import { create } from 'zustand'
import type { FileNode } from '@shared/types/ipc'

interface FileState {
  tree: FileNode[]
  selectedFileId: string | null
  expandedFolders: Set<string>

  loadFileTree: () => Promise<void>
  selectFile: (id: string) => void
  toggleFolder: (id: string) => void
  createFile: (parentId: string, name: string) => Promise<void>
  createFolder: (parentId: string, name: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, newName: string) => Promise<void>
  moveFile: (sourcePath: string, targetFolderPath: string) => Promise<void>
}

// Helper to find a node by id (path) in the tree
function findNode(tree: FileNode[], id: string): FileNode | null {
  for (const node of tree) {
    if (node.id === id || node.path === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

// Helper to get parent directory path from a file path
function getParentPath(filePath: string): string {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/')
}

export const useFileStore = create<FileState>((set, get) => ({
  tree: [],
  selectedFileId: null,
  expandedFolders: new Set<string>(),

  loadFileTree: async () => {
    try {
      const tree = await window.electronAPI.file.getFileTree()
      set({ tree })
    } catch (error) {
      console.error('Failed to load file tree:', error)
    }
  },

  selectFile: (id: string) => {
    set({ selectedFileId: id })
  },

  toggleFolder: (id: string) => {
    const { expandedFolders } = get()
    const next = new Set(expandedFolders)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ expandedFolders: next })
  },

  createFile: async (parentId: string, name: string) => {
    try {
      await window.electronAPI.file.createFile(parentId, name)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  },

  createFolder: async (parentId: string, name: string) => {
    try {
      await window.electronAPI.file.createFolder(parentId, name)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  },

  deleteFile: async (id: string) => {
    try {
      const node = findNode(get().tree, id)
      if (!node) return
      await window.electronAPI.file.deleteFile(node.path)
      // Clear selection if the deleted file was selected
      if (get().selectedFileId === id) {
        set({ selectedFileId: null })
      }
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  },

  renameFile: async (id: string, newName: string) => {
    try {
      const node = findNode(get().tree, id)
      if (!node) return
      const parentPath = getParentPath(node.path)
      const newPath = parentPath ? `${parentPath}/${newName}` : newName
      await window.electronAPI.file.renameFile(node.path, newPath)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to rename file:', error)
    }
  },

  moveFile: async (sourcePath: string, targetFolderPath: string) => {
    try {
      const fileName = sourcePath.split('/').pop()
      if (!fileName) return
      const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName
      if (sourcePath === newPath) return
      await window.electronAPI.file.renameFile(sourcePath, newPath)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to move file:', error)
    }
  }
}))
