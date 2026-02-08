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
  saveSession: () => void
  restoreSession: () => Promise<void>
}

// Extract file name from path
function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}

// Text file extensions that can be opened in the editor
const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
  '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg',
  '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg',
  '.csv', '.log', '.sh', '.bash', '.zsh', '.fish',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.c', '.cpp', '.h', '.hpp',
  '.swift', '.m', '.r', '.lua', '.php', '.pl', '.sql',
  '.env', '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc'
])

function isTextFile(filePath: string): boolean {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()!.toLowerCase() : ''
  if (!ext) return true // No extension, treat as text
  return TEXT_EXTENSIONS.has(ext)
}

// Debounced session save to avoid frequent disk writes
let saveSessionTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveSession() {
  if (saveSessionTimer) clearTimeout(saveSessionTimer)
  saveSessionTimer = setTimeout(() => {
    useEditorStore.getState().saveSession()
  }, 500)
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  showPreview: true,

  openFile: async (filePath: string) => {
    // Non-text files: open with system default app
    if (!isTextFile(filePath)) {
      try {
        await window.electronAPI.file.openExternal(filePath)
      } catch (error) {
        console.error('Failed to open external file:', error)
      }
      return
    }

    const { tabs } = get()

    // Check if tab already exists
    const existing = tabs.find((t) => t.filePath === filePath)
    if (existing) {
      set({ activeTabId: existing.id })
      debouncedSaveSession()
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
      debouncedSaveSession()
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
    debouncedSaveSession()
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
    debouncedSaveSession()
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
  },

  saveSession: () => {
    const { tabs, activeTabId } = get()
    const openFiles = tabs.map((t) => t.filePath)
    const activeFile = activeTabId || null
    window.electronAPI.config.set('session', { openFiles, activeFile })
  },

  restoreSession: async () => {
    try {
      const session = await window.electronAPI.config.get('session')
      if (!session || !session.openFiles || session.openFiles.length === 0) return

      const { openFile } = get()
      for (const filePath of session.openFiles) {
        await openFile(filePath)
      }

      // Restore active tab
      if (session.activeFile) {
        const { tabs } = get()
        const target = tabs.find((t) => t.filePath === session.activeFile)
        if (target) {
          set({ activeTabId: target.id })
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
    }
  }
}))
