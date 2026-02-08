// Re-export platform-agnostic types from shared package
export type {
  FileNode,
  FileChangeEvent,
  GitCommit,
  GitDiff,
  DiffHunk,
  GitStatus,
  SearchResult,
  SearchMatch,
  SearchOptions,
  Tag,
  AppConfig,
  WorkspaceInfo,
  SyncTransportType,
  SyncStatus,
  SyncDevice,
  PairingInfo,
  AuthToken,
  NoteManifestEntry,
  NoteManifest,
  SyncDelta,
  SyncConflict,
  SyncResult,
  SyncProgress,
  SyncConfig
} from '@ai-note/shared-types'

// Import types needed for ElectronAPI definition
import type {
  FileNode,
  FileChangeEvent,
  GitCommit,
  GitDiff,
  GitStatus,
  SearchResult,
  SearchOptions,
  Tag,
  AppConfig,
  WorkspaceInfo,
  SyncStatus,
  SyncDevice,
  PairingInfo,
  AuthToken,
  SyncProgress,
  SyncConflict,
  SyncConfig
} from '@ai-note/shared-types'

// Electron-specific API interface
export interface ElectronAPI {
  file: {
    readFile(filePath: string): Promise<string>
    writeFile(filePath: string, content: string): Promise<void>
    deleteFile(filePath: string): Promise<void>
    renameFile(oldPath: string, newPath: string): Promise<void>
    createFile(dirPath: string, fileName: string): Promise<string>
    createFolder(parentPath: string, folderName: string): Promise<string>
    getFileTree(): Promise<FileNode[]>
    openExternal(filePath: string): Promise<string>
    pasteFromClipboard(targetDir: string): Promise<string[]>
    copyWithin(sourcePath: string, targetDir: string): Promise<string>
    onFileChange(callback: (event: FileChangeEvent) => void): () => void
  }
  git: {
    getHistory(filePath: string, limit?: number): Promise<GitCommit[]>
    getDiff(sha1: string, sha2: string, filePath: string): Promise<GitDiff>
    getFileContent(sha: string, filePath: string): Promise<string>
    restoreFile(filePath: string, sha: string): Promise<void>
    commit(message: string, files?: string[]): Promise<string>
    saveVersion(filePath: string, description: string): Promise<string>
    getStatus(): Promise<GitStatus>
  }
  search: {
    query(query: string, options?: SearchOptions): Promise<SearchResult[]>
    rebuildIndex(): Promise<void>
  }
  tag: {
    getAllTags(): Promise<Tag[]>
    getNotesByTag(tagName: string): Promise<string[]>
    updateNoteTags(filePath: string, tags: string[]): Promise<void>
    renameTag(oldName: string, newName: string): Promise<void>
  }
  config: {
    get(key: string): Promise<any>
    set(key: string, value: any): Promise<void>
    getAll(): Promise<AppConfig>
  }
  workspace: {
    open(folderPath?: string): Promise<string | null>
    getRecent(): Promise<WorkspaceInfo[]>
    getCurrent(): Promise<string | null>
  }
  sync: {
    start(): Promise<void>
    stop(): Promise<void>
    getStatus(): Promise<{ status: SyncStatus; devices: SyncDevice[] }>
    generatePairing(): Promise<PairingInfo>
    revokeDevice(deviceId: string): Promise<void>
    getPairedDevices(): Promise<AuthToken[]>
    triggerSync(deviceId?: string): Promise<void>
    resolveConflict(path: string, resolution: 'local' | 'remote' | 'both'): Promise<void>
    getConfig(): Promise<SyncConfig>
    setConfig(key: string, value: any): Promise<void>
    onStatusChanged(callback: (status: SyncStatus) => void): () => void
    onDeviceConnected(callback: (device: SyncDevice) => void): () => void
    onDeviceDisconnected(callback: (deviceId: string) => void): () => void
    onProgress(callback: (progress: SyncProgress) => void): () => void
    onConflict(callback: (conflicts: SyncConflict[]) => void): () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
