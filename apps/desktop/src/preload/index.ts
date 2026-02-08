import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '@shared/types/ipc'

const electronAPI: ElectronAPI = {
  file: {
    readFile(filePath: string) {
      return ipcRenderer.invoke('file:read', filePath)
    },
    writeFile(filePath: string, content: string) {
      return ipcRenderer.invoke('file:write', filePath, content)
    },
    deleteFile(filePath: string) {
      return ipcRenderer.invoke('file:delete', filePath)
    },
    renameFile(oldPath: string, newPath: string) {
      return ipcRenderer.invoke('file:rename', oldPath, newPath)
    },
    createFile(dirPath: string, fileName: string) {
      return ipcRenderer.invoke('file:create', dirPath, fileName)
    },
    createFolder(parentPath: string, folderName: string) {
      return ipcRenderer.invoke('file:create-folder', parentPath, folderName)
    },
    getFileTree() {
      return ipcRenderer.invoke('file:get-tree')
    },
    openExternal(filePath: string) {
      return ipcRenderer.invoke('file:open-external', filePath)
    },
    pasteFromClipboard(targetDir: string) {
      return ipcRenderer.invoke('file:paste-from-clipboard', targetDir)
    },
    copyWithin(sourcePath: string, targetDir: string) {
      return ipcRenderer.invoke('file:copy-within', sourcePath, targetDir)
    },
    onFileChange(callback) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => {
        callback(data)
      }
      ipcRenderer.on('file:changed', handler)
      return () => {
        ipcRenderer.removeListener('file:changed', handler)
      }
    }
  },

  git: {
    getHistory(filePath: string, limit?: number) {
      return ipcRenderer.invoke('git:history', filePath, limit)
    },
    getDiff(sha1: string, sha2: string, filePath: string) {
      return ipcRenderer.invoke('git:diff', sha1, sha2, filePath)
    },
    getFileContent(sha: string, filePath: string) {
      return ipcRenderer.invoke('git:file-content', sha, filePath)
    },
    restoreFile(filePath: string, sha: string) {
      return ipcRenderer.invoke('git:restore', filePath, sha)
    },
    commit(message: string, files?: string[]) {
      return ipcRenderer.invoke('git:commit', message, files)
    },
    saveVersion(filePath: string, description: string) {
      return ipcRenderer.invoke('git:save-version', filePath, description)
    },
    getStatus() {
      return ipcRenderer.invoke('git:status')
    }
  },

  search: {
    query(query: string, options?: any) {
      return ipcRenderer.invoke('search:query', query, options)
    },
    rebuildIndex() {
      return ipcRenderer.invoke('search:rebuild')
    }
  },

  tag: {
    getAllTags() {
      return ipcRenderer.invoke('tag:get-all')
    },
    getNotesByTag(tagName: string) {
      return ipcRenderer.invoke('tag:get-notes', tagName)
    },
    updateNoteTags(filePath: string, tags: string[]) {
      return ipcRenderer.invoke('tag:update', filePath, tags)
    },
    renameTag(oldName: string, newName: string) {
      return ipcRenderer.invoke('tag:rename', oldName, newName)
    }
  },

  config: {
    get(key: string) {
      return ipcRenderer.invoke('config:get', key)
    },
    set(key: string, value: any) {
      return ipcRenderer.invoke('config:set', key, value)
    },
    getAll() {
      return ipcRenderer.invoke('config:get-all')
    }
  },

  workspace: {
    open(folderPath?: string) {
      return ipcRenderer.invoke('workspace:open', folderPath)
    },
    getRecent() {
      return ipcRenderer.invoke('workspace:get-recent')
    },
    getCurrent() {
      return ipcRenderer.invoke('workspace:get-current')
    }
  },

  sync: {
    start() {
      return ipcRenderer.invoke('sync:start')
    },
    stop() {
      return ipcRenderer.invoke('sync:stop')
    },
    getStatus() {
      return ipcRenderer.invoke('sync:get-status')
    },
    generatePairing() {
      return ipcRenderer.invoke('sync:generate-pairing')
    },
    revokeDevice(deviceId: string) {
      return ipcRenderer.invoke('sync:revoke-device', deviceId)
    },
    getPairedDevices() {
      return ipcRenderer.invoke('sync:get-paired-devices')
    },
    triggerSync(deviceId?: string) {
      return ipcRenderer.invoke('sync:trigger', deviceId)
    },
    resolveConflict(filePath: string, resolution: 'local' | 'remote' | 'both') {
      return ipcRenderer.invoke('sync:resolve-conflict', filePath, resolution)
    },
    getConfig() {
      return ipcRenderer.invoke('sync:get-config')
    },
    setConfig(key: string, value: any) {
      return ipcRenderer.invoke('sync:set-config', key, value)
    },
    onStatusChanged(callback: (status: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:status-changed', handler)
      return () => ipcRenderer.removeListener('sync:status-changed', handler)
    },
    onDeviceConnected(callback: (device: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:device-connected', handler)
      return () => ipcRenderer.removeListener('sync:device-connected', handler)
    },
    onDeviceDisconnected(callback: (deviceId: string) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:device-disconnected', handler)
      return () => ipcRenderer.removeListener('sync:device-disconnected', handler)
    },
    onProgress(callback: (progress: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:progress', handler)
      return () => ipcRenderer.removeListener('sync:progress', handler)
    },
    onConflict(callback: (conflicts: any[]) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:conflict', handler)
      return () => ipcRenderer.removeListener('sync:conflict', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
