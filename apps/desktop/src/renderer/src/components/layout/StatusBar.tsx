import { useEditorStore } from '../../stores/editor-store'
import { useI18n, Locale } from '../../i18n'
import SyncStatusIndicator from '../sync/SyncStatusIndicator'

function StatusBar() {
  const { tabs, activeTabId } = useEditorStore()
  const { t, locale, setLocale } = useI18n()

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en' as Locale)
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isDirty = activeTab
    ? activeTab.content !== activeTab.savedContent
    : false

  // Calculate word count for active tab
  const wordCount = activeTab
    ? activeTab.content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0

  // Calculate line count
  const lineCount = activeTab ? activeTab.content.split('\n').length : 0

  return (
    <div
      className="flex h-6 flex-shrink-0 items-center justify-between border-t
                    border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                    px-3 text-xs text-[var(--color-text-muted)]"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <SyncStatusIndicator />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {activeTab && (
          <>
            {/* Save status */}
            <span className={isDirty ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
              {isDirty ? t('status.unsaved') : t('status.saved')}
            </span>

            {/* Word count */}
            <span>{wordCount} {t('status.words')}</span>

            {/* Line count */}
            <span>{lineCount} {t('status.lines')}</span>

            {/* Editor mode */}
            <span className="uppercase">MD</span>
          </>
        )}

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="hover:text-[var(--color-text-primary)] transition-colors"
          title={t('settings.language')}
        >
          {locale === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </div>
  )
}

export default StatusBar
