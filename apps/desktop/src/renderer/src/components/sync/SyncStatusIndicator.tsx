import { useSyncStore } from '../../stores/sync-store'
import { useI18n } from '../../i18n'

function SyncStatusIndicator() {
  const { status, devices } = useSyncStore()
  const { t } = useI18n()

  const statusConfig: Record<string, { icon: string; color: string }> = {
    idle: { icon: '\u2B24', color: 'var(--color-text-muted)' },
    discovering: { icon: '\u2B24', color: 'var(--color-warning)' },
    connecting: { icon: '\u2B24', color: 'var(--color-warning)' },
    syncing: { icon: '\u2B24', color: 'var(--color-accent)' },
    error: { icon: '\u2B24', color: 'var(--color-danger)' }
  }

  const { icon, color } = statusConfig[status] || statusConfig.idle
  const connectedCount = devices.filter((d) => d.isConnected).length

  const label = connectedCount > 0
    ? `${t('sync.status.' + status)} (${connectedCount})`
    : t('sync.status.' + status)

  return (
    <span
      className="flex items-center gap-1 text-xs"
      title={label}
    >
      <span style={{ color, fontSize: '6px' }}>{icon}</span>
      <span className="text-[var(--color-text-muted)]">
        {t('sync.title')}
      </span>
    </span>
  )
}

export default SyncStatusIndicator
