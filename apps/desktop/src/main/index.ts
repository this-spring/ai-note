import path from 'path'
import fs from 'fs/promises'
import { app, BrowserWindow, screen, shell } from 'electron'
import { CONFIG_DIR, APP_NAME } from '@shared/constants'
import { WorkspaceInfo } from '@shared/types/ipc'
import { DbService } from './services/db-service'
import { FileService } from './services/file-service'
import { GitService } from './services/git-service'
import { SearchService } from './services/search-service'
import { TagService } from './services/tag-service'
import { ConfigService } from './services/config-service'
import { SyncService } from './services/sync/sync-service'
import { LanSyncTransport } from './services/sync/lan-sync-transport'
import { BleSyncTransport } from './services/sync/ble-sync-transport'
import { registerAllHandlers, unregisterAllHandlers, Services } from './ipc/index'
import { registerWorkspaceHandlers, unregisterWorkspaceHandlers } from './ipc/workspace-handlers'
import { registerConfigHandlers, unregisterConfigHandlers } from './ipc/config-handlers'
import { logger } from './utils/logger'

// ---- Global state ----
let mainWindow: BrowserWindow | null = null
let currentWorkspacePath: string | null = null
let services: Services | null = null
let dbService: DbService | null = null
let recentWorkspaces: WorkspaceInfo[] = []

// ---- Window creation ----
function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.round(screenWidth * 0.8),
    height: Math.round(screenHeight * 0.8),
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ---- Workspace initialization ----
async function initializeWorkspace(workspacePath: string): Promise<void> {
  // Clean up previous workspace if any
  await cleanupServices()

  // Ensure .ai-note config directory exists
  const configDir = path.join(workspacePath, CONFIG_DIR)
  await fs.mkdir(configDir, { recursive: true })

  // Initialize services
  dbService = new DbService(workspacePath)

  const fileService = new FileService(workspacePath)
  await fileService.initialize()

  const gitService = new GitService(workspacePath)
  await gitService.initialize()

  const searchService = new SearchService(workspacePath)
  await searchService.buildIndex()

  const tagService = new TagService(workspacePath, dbService)
  await tagService.initialize()

  const configService = new ConfigService(workspacePath)
  await configService.load()

  // Initialize sync service
  const syncService = new SyncService(workspacePath, fileService, gitService, configService)
  const syncConfig = configService.get('sync')
  if (syncConfig?.lanEnabled) {
    const lanTransport = new LanSyncTransport(syncService, syncConfig.lanPort || 18923)
    syncService.registerTransport(lanTransport)
  }
  if (syncConfig?.bleEnabled) {
    const bleTransport = new BleSyncTransport(syncService)
    syncService.registerTransport(bleTransport)
  }
  await syncService.initialize()

  services = {
    fileService,
    gitService,
    searchService,
    tagService,
    configService,
    syncService
  }

  currentWorkspacePath = workspacePath

  // Get transport references for broadcasting file changes
  const lanTransport = syncService.getTransport('lan') as LanSyncTransport | undefined
  const bleTransport = syncService.getTransport('ble') as BleSyncTransport | undefined

  // Update file index on file changes
  fileService.onFileChange(async (event) => {
    const absolutePath = path.join(workspacePath, event.path)

    if (event.path.endsWith('.md')) {
      if (event.type === 'add' || event.type === 'change') {
        await searchService.updateFile(absolutePath)
        await tagService.syncFileTags(absolutePath)
      } else if (event.type === 'unlink') {
        await searchService.removeFile(event.path)
        dbService?.deleteNote(event.path)
      }
    }

    // Broadcast file changes to connected mobile devices
    lanTransport?.broadcastFileChange(event)
    bleTransport?.broadcastFileChange(event)
  })

  // Update recent workspaces
  updateRecentWorkspaces(workspacePath)

  // Register IPC handlers (unregister early handlers + all service handlers)
  if (mainWindow) {
    unregisterAllHandlers()
    unregisterWorkspaceHandlers()
    unregisterConfigHandlers()
    registerAllHandlers(mainWindow, services, {
      onOpen: initializeWorkspace,
      getRecent: async () => recentWorkspaces,
      getCurrent: () => currentWorkspacePath
    })
  }

  logger.info('Workspace initialized:', workspacePath)
}

function updateRecentWorkspaces(workspacePath: string): void {
  const name = path.basename(workspacePath)
  const now = Date.now()

  // Remove existing entry if present
  recentWorkspaces = recentWorkspaces.filter((ws) => ws.path !== workspacePath)

  // Add to front
  recentWorkspaces.unshift({ path: workspacePath, name, lastOpened: now })

  // Keep only last 10
  if (recentWorkspaces.length > 10) {
    recentWorkspaces = recentWorkspaces.slice(0, 10)
  }
}

// ---- Cleanup ----
async function cleanupServices(): Promise<void> {
  if (services) {
    await services.syncService.dispose()
    await services.fileService.dispose()
    services.gitService.dispose()
    services = null
  }

  if (dbService) {
    dbService.close()
    dbService = null
  }

  currentWorkspacePath = null
  logger.info('Services cleaned up')
}

// ---- App lifecycle ----
app.whenReady().then(() => {
  createWindow()

  // Register workspace and config handlers early (before workspace is opened)
  if (mainWindow) {
    registerWorkspaceHandlers(mainWindow, {
      onOpen: initializeWorkspace,
      getRecent: async () => recentWorkspaces,
      getCurrent: () => currentWorkspacePath
    })

    // Register config handler with default config for pre-workspace state
    const defaultConfig = new ConfigService(app.getPath('userData'))
    defaultConfig.load().then(() => {
      registerConfigHandlers(defaultConfig)
    }).catch(() => {
      // Register with fallback even if load fails
      registerConfigHandlers(defaultConfig)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await cleanupServices()
})
