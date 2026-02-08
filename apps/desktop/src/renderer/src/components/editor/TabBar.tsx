import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import { XIcon } from '../common/Icons'

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
    <div className="flex h-9 flex-shrink-0 items-end overflow-x-auto bg-[var(--color-bg-secondary)]"
         style={{ boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const dirty = isDirty(tab.id)

        return (
          <div
            key={tab.id}
            className={`group flex h-8 cursor-pointer items-center gap-1.5 px-3 text-xs
              transition-colors duration-100
              ${
                isActive
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-b-2 border-b-[var(--color-accent)]'
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
              className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md
                         text-[var(--color-text-muted)] opacity-0 transition-all duration-100
                         hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                         group-hover:opacity-100"
              title={t('editor.closeTab')}
            >
              <XIcon size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default TabBar
