import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import { HistoryIcon, EyeIcon, EyeOffIcon, PenLineIcon } from '../common/Icons'
import TabBar from './TabBar'
import SourceEditor from './SourceEditor'
import MarkdownPreview from './MarkdownPreview'
import HistoryPanel from '../git/HistoryPanel'

const AUTO_SAVE_DELAY = 1000

function EditorContainer() {
  const { tabs, activeTabId, showPreview, updateContent, togglePreview, saveFile } =
    useEditorStore()
  const { t } = useI18n()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bidirectional scroll sync: separate scroll targets for each side
  const [previewScrollTo, setPreviewScrollTo] = useState<number | undefined>(undefined)
  const [editorScrollTo, setEditorScrollTo] = useState<number | undefined>(undefined)
  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showHistory, setShowHistory] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Auto-save: debounce content changes by 1s
  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeTabId) return

      updateContent(activeTabId, content)

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // Set new auto-save timer
      saveTimerRef.current = setTimeout(() => {
        saveFile(activeTabId)
      }, AUTO_SAVE_DELAY)
    },
    [activeTabId, updateContent, saveFile]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (activeTabId) {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
          }
          saveFile(activeTabId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, saveFile])

  // Reset scroll when switching tabs
  useEffect(() => {
    setPreviewScrollTo(undefined)
    setEditorScrollTo(undefined)
    scrollSourceRef.current = null
  }, [activeTabId])

  // Editor scrolled → sync preview
  const handleEditorScroll = useCallback((fraction: number) => {
    if (scrollSourceRef.current === 'preview') return
    scrollSourceRef.current = 'editor'
    setPreviewScrollTo(fraction)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollSourceRef.current = null
    }, 100)
  }, [])

  // Preview scrolled → sync editor
  const handlePreviewScroll = useCallback((fraction: number) => {
    if (scrollSourceRef.current === 'editor') return
    scrollSourceRef.current = 'preview'
    setEditorScrollTo(fraction)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollSourceRef.current = null
    }, 100)
  }, [])

  // Empty state
  if (!activeTab) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-[var(--color-text-muted)] opacity-30">
          <PenLineIcon size={48} />
        </div>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          {t('editor.emptyTitle')}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-70">
          {t('editor.emptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg-primary)]">
      {/* Tab bar */}
      <TabBar />

      {/* Toolbar */}
      <div className="flex items-center justify-end border-b border-[var(--color-border)] px-3 py-1 gap-1">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
            ${showHistory
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title={t('editor.toggleHistory')}
        >
          <HistoryIcon size={14} />
          {t('editor.history')}
        </button>
        <button
          onClick={togglePreview}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                     transition-all duration-150"
          title={t('editor.togglePreview')}
        >
          {showPreview ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
          {showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
        </button>
      </div>

      {/* Editor content: split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Source editor (left) */}
        <div className={showPreview ? 'w-1/2 border-r border-[var(--color-border)]' : 'w-full'}>
          <SourceEditor
            value={activeTab.content}
            onChange={handleContentChange}
            onScroll={showPreview ? handleEditorScroll : undefined}
            scrollTo={editorScrollTo}
          />
        </div>

        {/* Markdown preview (right) */}
        {showPreview && (
          <div className="w-1/2">
            <MarkdownPreview
              content={activeTab.content}
              scrollTo={previewScrollTo}
              onScroll={handlePreviewScroll}
            />
          </div>
        )}
      </div>

      {/* File version history (bottom panel) */}
      {showHistory && (
        <div className="h-56 flex-shrink-0">
          <HistoryPanel
            filePath={activeTab.filePath}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}
    </div>
  )
}

export default EditorContainer
