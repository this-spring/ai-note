import path from 'path'
import fs from 'fs/promises'
import { ipcMain, BrowserWindow, shell, clipboard } from 'electron'
import { FileService } from '../services/file-service'
import { logger } from '../utils/logger'

// Parse macOS plist XML to extract file paths
function parsePlistFilePaths(plistXml: string): string[] {
  const paths: string[] = []
  const regex = /<string>(.*?)<\/string>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(plistXml)) !== null) {
    paths.push(match[1])
  }
  return paths
}

// Parse Windows FileNameW clipboard buffer to extract file paths
function parseWindowsFilePaths(buffer: Buffer): string[] {
  // FileNameW is null-terminated UCS-2 strings, double-null terminated
  const text = buffer.toString('ucs2')
  return text.split('\0').filter((s) => s.length > 0)
}

// Get unique file path (avoid overwriting existing files)
async function getUniquePath(targetPath: string): Promise<string> {
  try {
    await fs.access(targetPath)
    // File exists, add suffix
    const ext = path.extname(targetPath)
    const base = targetPath.slice(0, -ext.length || undefined)
    let i = 1
    while (true) {
      const candidate = ext ? `${base}_${i}${ext}` : `${targetPath}_${i}`
      try {
        await fs.access(candidate)
        i++
      } catch {
        return candidate
      }
    }
  } catch {
    return targetPath // File doesn't exist, use as-is
  }
}

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

  ipcMain.handle('file:open-external', async (_event, filePath: string) => {
    const fullPath = path.join(fileService.getWorkspacePath(), filePath)
    fileService.validatePath(fullPath)
    return shell.openPath(fullPath)
  })

  ipcMain.handle('file:paste-from-clipboard', async (_event, targetDir: string) => {
    const workspacePath = fileService.getWorkspacePath()
    const fullTargetDir = path.join(workspacePath, targetDir)
    fileService.validatePath(fullTargetDir)
    await fs.mkdir(fullTargetDir, { recursive: true })

    const pastedFiles: string[] = []

    // Try reading file paths from clipboard (OS-specific)
    let filePaths: string[] = []
    if (process.platform === 'darwin') {
      const plist = clipboard.read('NSFilenamesPboardType')
      if (plist) {
        filePaths = parsePlistFilePaths(plist)
      }
    } else if (process.platform === 'win32') {
      const buffer = clipboard.readBuffer('FileNameW')
      if (buffer && buffer.length > 0) {
        filePaths = parseWindowsFilePaths(buffer)
      }
    }

    if (filePaths.length > 0) {
      // Copy each file/folder to the target directory
      for (const sourcePath of filePaths) {
        try {
          const fileName = path.basename(sourcePath)
          const destPath = await getUniquePath(path.join(fullTargetDir, fileName))
          const stat = await fs.stat(sourcePath)
          if (stat.isDirectory()) {
            await fs.cp(sourcePath, destPath, { recursive: true })
          } else {
            await fs.copyFile(sourcePath, destPath)
          }
          pastedFiles.push(path.relative(workspacePath, destPath))
          logger.info('Pasted file:', sourcePath, '→', destPath)
        } catch (err) {
          logger.error('Failed to paste file:', sourcePath, err)
        }
      }
    } else {
      // No file paths — check for clipboard image (e.g. screenshot)
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        const timestamp = Date.now()
        const fileName = `clipboard-${timestamp}.png`
        const destPath = await getUniquePath(path.join(fullTargetDir, fileName))
        await fs.writeFile(destPath, image.toPNG())
        pastedFiles.push(path.relative(workspacePath, destPath))
        logger.info('Pasted clipboard image:', destPath)
      }
    }

    return pastedFiles
  })

  ipcMain.handle('file:copy-within', async (_event, sourcePath: string, targetDir: string) => {
    const workspacePath = fileService.getWorkspacePath()
    const fullSource = path.join(workspacePath, sourcePath)
    const fullTargetDir = path.join(workspacePath, targetDir)
    fileService.validatePath(fullSource)
    fileService.validatePath(fullTargetDir)
    await fs.mkdir(fullTargetDir, { recursive: true })

    const fileName = path.basename(sourcePath)
    const destPath = await getUniquePath(path.join(fullTargetDir, fileName))
    const stat = await fs.stat(fullSource)
    if (stat.isDirectory()) {
      await fs.cp(fullSource, destPath, { recursive: true })
    } else {
      await fs.copyFile(fullSource, destPath)
    }
    const relativeDest = path.relative(workspacePath, destPath)
    logger.info('Copied file:', sourcePath, '→', relativeDest)
    return relativeDest
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
  ipcMain.removeHandler('file:open-external')
  ipcMain.removeHandler('file:paste-from-clipboard')
  ipcMain.removeHandler('file:copy-within')
}
