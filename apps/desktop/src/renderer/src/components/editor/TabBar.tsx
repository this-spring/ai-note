import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'

function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, isDirty } =
    useEditorStore()
  const { t } = useI18n()

  if (tabs.length === 0) return null

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    // Middle-click to close
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  return (
    <div className="flex h-9 flex-shrink-0 items-end overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const dirty = isDirty(tab.id)

        return (
          <div
            key={tab.id}
            className={`group flex h-8 cursor-pointer items-center gap-1.5 border-r
              border-[var(--color-border)] px-3 text-xs transition-colors
              ${
                isActive
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-t-2 border-t-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => handleMouseDown(e, tab.id)}
          >
            {/* Dirty indicator */}
            {dirty && (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
            )}

            {/* Tab title */}
            <span className="max-w-[120px] truncate">{tab.title}</span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded
                         text-[var(--color-text-muted)] opacity-0 transition-opacity
                         hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                         group-hover:opacity-100"
              title={t('editor.closeTab')}
            >
              &times;
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default TabBar
