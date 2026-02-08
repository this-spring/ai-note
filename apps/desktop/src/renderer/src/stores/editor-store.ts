import { create } from 'zustand'

export interface EditorTab {
  id: string
  title: string
  filePath: string
  content: string
  savedContent: string
}

interface EditorState {
  tabs: EditorTab[]
  activeTabId: string | null
  showPreview: boolean

  openFile: (filePath: string) => Promise<void>
  reloadFile: (filePath: string) => Promise<void>
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateContent: (tabId: string, content: string) => void
  togglePreview: () => void
  saveFile: (tabId: string) => Promise<void>
  getActiveTab: () => EditorTab | undefined
  isDirty: (tabId: string) => boolean
}

// Extract file name from path
function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  showPreview: true,

  openFile: async (filePath: string) => {
    const { tabs } = get()

    // Check if tab already exists
    const existing = tabs.find((t) => t.filePath === filePath)
    if (existing) {
      set({ activeTabId: existing.id })
      return
    }

    try {
      const content = await window.electronAPI.file.readFile(filePath)
      const newTab: EditorTab = {
        id: filePath,
        title: getFileName(filePath),
        filePath,
        content,
        savedContent: content
      }
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id
      }))
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  },

  reloadFile: async (filePath: string) => {
    try {
      const content = await window.electronAPI.file.readFile(filePath)
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.filePath === filePath ? { ...t, content, savedContent: content } : t
        )
      }))
    } catch (error) {
      console.error('Failed to reload file:', error)
    }
  },

  closeTab: (tabId: string) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId)
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveId = state.activeTabId

      if (state.activeTabId === tabId) {
        if (newTabs.length === 0) {
          newActiveId = null
        } else if (idx >= newTabs.length) {
          newActiveId = newTabs[newTabs.length - 1].id
        } else {
          newActiveId = newTabs[idx].id
        }
      }

      return { tabs: newTabs, activeTabId: newActiveId }
    })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  updateContent: (tabId: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, content } : t))
    }))
  },

  togglePreview: () => {
    set((state) => ({ showPreview: !state.showPreview }))
  },

  saveFile: async (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab) return

    try {
      await window.electronAPI.file.writeFile(tab.filePath, tab.content)
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, savedContent: t.content } : t
        )
      }))
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId)
  },

  isDirty: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab) return false
    return tab.content !== tab.savedContent
  }
}))
