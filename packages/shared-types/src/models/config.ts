import type { SyncConfig } from './sync'

export interface AppConfig {
  version: number
  editor: {
    defaultMode: 'wysiwyg' | 'source'
    autoSaveDelay: number
    fontSize: number
    fontFamily: string
    maxWidth: number
  }
  git: {
    autoCommit: boolean
    autoCommitInterval: number
    autoCommitStrategy: 'immediate' | 'interval' | 'manual'
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    locale: 'en' | 'zh' | 'system'
    sidebarWidth: number
  }
  search: { debounceDelay: number }
  sync: SyncConfig
}
