import { useState } from 'react'
import { useI18n } from '../../i18n'
import FileTree from '../file-tree/FileTree'
import SearchPanel from '../search/SearchPanel'
import TagPanel from '../tags/TagPanel'
import SyncPanel from '../sync/SyncPanel'

type SidebarPanel = 'explorer' | 'search' | 'tags' | 'sync'

// Icon button for the sidebar tab bar
function TabButton({
  icon,
  label,
  isActive,
  onClick
}: {
  icon: string
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-10 w-10 items-center justify-center text-lg transition-colors
        ${
          isActive
            ? 'text-[var(--color-accent)] border-l-2 border-[var(--color-accent)] bg-[var(--color-bg-secondary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        }`}
    >
      {icon}
    </button>
  )
}

function Sidebar() {
  const [activePanel, setActivePanel] = useState<SidebarPanel>('explorer')
  const { t } = useI18n()

  const renderPanel = () => {
    switch (activePanel) {
      case 'explorer':
        return <FileTree />
      case 'search':
        return <SearchPanel />
      case 'tags':
        return <TagPanel />
      case 'sync':
        return <SyncPanel />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full">
      {/* Vertical tab bar */}
      <div className="flex w-10 flex-shrink-0 flex-col items-center gap-1 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] pt-2">
        <TabButton
          icon="&#128196;"
          label={t('sidebar.explorer')}
          isActive={activePanel === 'explorer'}
          onClick={() => setActivePanel('explorer')}
        />
        <TabButton
          icon="&#128269;"
          label={t('sidebar.search')}
          isActive={activePanel === 'search'}
          onClick={() => setActivePanel('search')}
        />
        <TabButton
          icon="&#127991;"
          label={t('sidebar.tags')}
          isActive={activePanel === 'tags'}
          onClick={() => setActivePanel('tags')}
        />
        <TabButton
          icon="&#128259;"
          label={t('sidebar.sync')}
          isActive={activePanel === 'sync'}
          onClick={() => setActivePanel('sync')}
        />
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar bg-[var(--color-bg-secondary)]">
        {renderPanel()}
      </div>
    </div>
  )
}

export default Sidebar
