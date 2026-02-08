export const APP_NAME = 'AI-Note'
export const CONFIG_DIR = '.ai-note'
export const CONFIG_FILE = 'config.json'
export const DB_FILE = 'db.sqlite'
export const TRASH_DIR = 'trash'
export const DEFAULT_GITIGNORE = `.ai-note/\n.DS_Store\nThumbs.db\n`

// Sync
export const SYNC_PORT = 18923
export const SYNC_CONFLICTS_DIR = 'sync-conflicts'
export const SYNC_SERVICE_NAME = '_ai-note-sync._tcp'
export const SYNC_PAIRING_TTL = 5 * 60 * 1000 // 5 minutes

// BLE Sync
export const BLE_SERVICE_UUID = '13370001a1b2c3d4e5f6000000000000'
export const BLE_DEVICE_INFO_UUID = '13370002a1b2c3d4e5f6000000000000'
export const BLE_SYNC_CONTROL_UUID = '13370003a1b2c3d4e5f6000000000000'
export const BLE_SYNC_DATA_UUID = '13370004a1b2c3d4e5f6000000000000'
export const BLE_DEFAULT_MTU = 20
export const BLE_PREFERRED_MTU = 247
export const BLE_COMPRESS_THRESHOLD = 1024 // gzip data > 1KB
