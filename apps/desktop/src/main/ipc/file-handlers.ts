import { ipcMain, BrowserWindow } from 'electron'
import { FileService } from '../services/file-service'
import { logger } from '../utils/logger'

export function registerFileHandlers(
  fileService: FileService,
  mainWindow: BrowserWindow
): void {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return fileService.readFile(filePath)
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    await fileService.writeFile(filePath, content)
  })

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    await fileService.deleteFile(filePath)
  })

  ipcMain.handle('file:rename', async (_event, oldPath: string, newPath: string) => {
    await fileService.renameFile(oldPath, newPath)
  })

  ipcMain.handle('file:create', async (_event, dirPath: string, fileName: string) => {
    return fileService.createFile(dirPath, fileName)
  })

  ipcMain.handle('file:create-folder', async (_event, parentPath: string, folderName: string) => {
    return fileService.createFolder(parentPath, folderName)
  })

  ipcMain.handle('file:get-tree', async () => {
    return fileService.getFileTree()
  })

  // Forward file change events to renderer
  fileService.onFileChange((event) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('file:changed', event)
      }
    } catch (err) {
      logger.error('Failed to send file change event:', err)
    }
  })

  logger.info('File IPC handlers registered')
}

export function unregisterFileHandlers(): void {
  ipcMain.removeHandler('file:read')
  ipcMain.removeHandler('file:write')
  ipcMain.removeHandler('file:delete')
  ipcMain.removeHandler('file:rename')
  ipcMain.removeHandler('file:create')
  ipcMain.removeHandler('file:create-folder')
  ipcMain.removeHandler('file:get-tree')
}
