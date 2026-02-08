# AI-Note 技术设计文档

**版本**: v1.5
**日期**: 2026-02-08
**状态**: 已实施（Monorepo + 官网 + 移动端 + 跨设备同步 LAN+BLE）

---

## 1. 整体架构设计

### 1.1 进程模型和通信机制

AI-Note 采用 Electron 标准的多进程架构，遵循安全最佳实践：

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ FileService  │  │ GitService  │  │SearchService │       │
│  └──────────────┘  └─────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │  TagService  │  │  DbService  │  │ConfigService │       │
│  └──────────────┘  └─────────────┘  └──────────────┘       │
│                                                              │
│                     IPC (contextBridge)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ Secure IPC Channels
┌────────────────────────┴────────────────────────────────────┐
│                    Preload Script                            │
│              window.electronAPI (Type-Safe)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Renderer Process                           │
│  ┌──────────────────────────────────────────────────┐       │
│  │              React Application                    │       │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────┐  │       │
│  │  │  UI Comps  │  │ Zustand Store│  │ Editors │  │       │
│  │  └────────────┘  └──────────────┘  └─────────┘  │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**进程职责划分**:

| 进程 | 职责 | 技术理由 |
|------|------|----------|
| Main Process | 文件系统 I/O、Git 操作、SQLite 数据库、搜索索引、文件监听 | Node.js 原生模块只能在主进程运行 |
| Renderer Process | React UI 渲染、用户交互、编辑器实例、状态管理 | 与主进程隔离提升安全性 |
| Preload Script | 暴露安全 API、类型定义桥接、IPC 封装 | `contextIsolation: true` 要求 |

**通信机制**:

- `ipcMain.handle` / `ipcRenderer.invoke` — 请求-响应模式
- `webContents.send` / `ipcRenderer.on` — 主进程推送事件（如文件变更通知）
- 所有 IPC channel 采用 `模块:操作` 命名（如 `file:read`、`git:commit`）

### 1.2 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  React Components + Milkdown/CodeMirror + Zustand       │
└────────────────────┬────────────────────────────────────┘
                     │ IPC API (window.electronAPI)
┌────────────────────┴────────────────────────────────────┐
│                    Service Layer                         │
│  FileService, GitService, SearchService, TagService      │
└────────────────────┬────────────────────────────────────┘
                     │ Direct Access
┌────────────────────┴────────────────────────────────────┐
│                     Data Layer                           │
│  File System + SQLite + Git Repository + FlexSearch      │
└─────────────────────────────────────────────────────────┘
```

### 1.3 依赖关系

```
Renderer Process:
React ─┬─> Zustand (状态管理)
       ├─> Milkdown ─> ProseMirror (WYSIWYG)
       ├─> CodeMirror 6 (源码编辑)
       └─> Tailwind CSS (样式)

Main Process:
FileService ─┬─> chokidar (文件监听)
             └─> fs/promises (Node.js)
GitService ──> isomorphic-git + fs
SearchService ─┬─> FlexSearch (索引引擎)
               └─> DbService
TagService ─┬─> gray-matter (Front Matter)
            └─> DbService (SQLite)
DbService ──> better-sqlite3
ConfigService ──> fs/promises
```

---

## 2. 目录结构设计

项目采用 **pnpm monorepo** 架构，便于后续扩展官网、移动端等子项目。

### 2.1 Monorepo 顶层结构

```
ai-note/                           # Monorepo 根目录
├── pnpm-workspace.yaml            # pnpm workspace 配置
├── package.json                   # 根 package.json（workspace scripts）
├── .npmrc                         # pnpm 配置（shamefully-hoist=true）
├── pnpm-lock.yaml
├── .gitignore
├── CLAUDE.md
├── README.md
├── docs/                          # 项目文档（全局共享）
│   ├── prd.md                     # 产品需求文档
│   └── technical-design.md        # 本技术设计文档
├── apps/                          # 应用目录
│   ├── desktop/                   # Electron 桌面应用
│   └── website/                   # 营销官网（Next.js SSG）
└── packages/                      # 共享包（预留）
```

**Workspace 配置** (`pnpm-workspace.yaml`):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**根 package.json scripts** 通过 `--filter` 转发到子包：
```json
{
  "scripts": {
    "dev": "pnpm --filter @ai-note/desktop dev",
    "build": "pnpm --filter @ai-note/desktop build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

### 2.2 桌面应用结构 (`apps/desktop/`)

```
apps/desktop/
├── package.json                   # @ai-note/desktop
├── electron.vite.config.ts        # electron-vite 构建配置
├── tailwind.config.js             # Tailwind CSS 配置
├── tsconfig.json                  # 根 TS 配置（project references）
├── tsconfig.main.json             # Main 进程 TS 配置
├── tsconfig.preload.json          # Preload TS 配置
├── tsconfig.renderer.json         # Renderer TS 配置
├── resources/                     # 应用资源（图标等）
└── src/
    ├── main/                      # 主进程代码
    │   ├── index.ts               # 入口文件
    │   ├── ipc/                   # IPC handlers
    │   │   ├── index.ts           # 注册所有 handlers
    │   │   ├── file-handlers.ts
    │   │   ├── git-handlers.ts
    │   │   ├── search-handlers.ts
    │   │   ├── tag-handlers.ts
    │   │   ├── config-handlers.ts
    │   │   └── workspace-handlers.ts
    │   ├── services/              # 服务层
    │   │   ├── file-service.ts
    │   │   ├── git-service.ts
    │   │   ├── search-service.ts
    │   │   ├── tag-service.ts
    │   │   ├── db-service.ts
    │   │   └── config-service.ts
    │   └── utils/
    │       └── logger.ts
    ├── preload/
    │   └── index.ts               # electronAPI 安全桥接
    ├── renderer/                  # React UI
    │   ├── index.html
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── components/
    │       │   ├── layout/        # MainLayout, Sidebar, StatusBar
    │       │   ├── editor/        # EditorContainer, SourceEditor, MarkdownPreview, TabBar
    │       │   ├── file-tree/     # FileTree, FileNode
    │       │   ├── search/        # SearchPanel
    │       │   ├── tags/          # TagPanel
    │       │   ├── git/           # HistoryPanel
    │       │   └── common/        # ContextMenu, Modal
    │       ├── stores/            # Zustand 状态管理
    │       │   ├── workspace-store.ts
    │       │   ├── file-store.ts
    │       │   ├── editor-store.ts
    │       │   ├── search-store.ts
    │       │   ├── tag-store.ts
    │       │   ├── git-store.ts
    │       │   └── settings-store.ts
    │       ├── i18n/              # 国际化
    │       │   ├── index.ts
    │       │   └── locales/       # en.ts, zh.ts
    │       └── styles/
    │           └── globals.css
    └── shared/                    # 桌面应用内跨进程共享
        ├── constants.ts
        └── types/
            └── ipc.ts             # IPC 类型定义 + ElectronAPI 接口
```

### 2.3 官网结构 (`apps/website/`)

营销官网采用 Next.js 14 (App Router) + 静态导出，单页落地页设计。

```
apps/website/
├── package.json                   # @ai-note/website
├── next.config.mjs                # output: 'export' 静态导出
├── tailwind.config.ts             # darkMode: 'class'
├── tsconfig.json
├── postcss.config.mjs
├── public/images/                 # 截图、logo 等资源
└── src/
    ├── app/
    │   ├── globals.css            # CSS 变量（:root + .dark）+ Tailwind
    │   ├── layout.tsx             # 根布局：字体、Meta、Provider
    │   └── page.tsx               # 首页（组合所有 Section）
    ├── providers/
    │   ├── theme-provider.tsx     # 暗色/亮色/跟随系统
    │   └── i18n-provider.tsx      # 中文/英文切换
    ├── hooks/
    │   └── use-theme.ts
    ├── i18n/
    │   ├── index.ts
    │   └── locales/               # zh.ts, en.ts
    ├── lib/
    │   └── constants.ts           # 下载链接、版本号、技术栈数据
    └── components/
        ├── layout/                # Header, Footer
        ├── ui/                    # ThemeToggle, LangToggle, SectionWrapper, FeatureCard
        ├── icons/                 # SVG 图标组件
        └── sections/              # HeroSection, FeaturesGrid, Comparison 等 6 个
```

**落地页 Section 结构**：Hero → Features Grid → Feature Deep Dive → Comparison Table → Tech Stack → Download CTA

**关键技术选型**：
- Next.js 14 静态导出（`output: 'export'`），零服务器依赖
- framer-motion 滚动动画
- 轻量 React Context i18n（中文优先 + 英文）
- CSS 变量主题系统，与桌面应用一致

### 2.4 未来扩展规划

```
apps/
├── desktop/        # Electron 桌面应用（已实现）
├── website/        # 营销官网（已实现，Next.js SSG）
└── mobile/         # 移动端（React Native / Expo）

packages/
├── shared-types/   # 跨项目共享类型
├── markdown/       # Markdown 解析/渲染工具
└── i18n/           # 共享国际化资源
```

---

## 3. 核心模块详细设计

### 3.1 主进程入口 (main/index.ts)

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // better-sqlite3 需要
      webSecurity: true,
    },
  });

  registerIpcHandlers();

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow!.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

**设计要点**:
- `show: false` + `ready-to-show` 防止白屏闪烁
- `sandbox: false` 因为 better-sqlite3 原生模块需要
- 服务延迟初始化（用户选择工作区后）

### 3.2 Preload 安全 API

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  file: {
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:write', filePath, content),
    deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
    renameFile: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('file:rename', oldPath, newPath),
    createFile: (dirPath: string, fileName: string) =>
      ipcRenderer.invoke('file:create', dirPath, fileName),
    createFolder: (parentPath: string, folderName: string) =>
      ipcRenderer.invoke('file:create-folder', parentPath, folderName),
    getFileTree: () => ipcRenderer.invoke('file:get-tree'),
    onFileChange: (callback: (event: FileChangeEvent) => void) => {
      const handler = (_e: any, data: FileChangeEvent) => callback(data);
      ipcRenderer.on('file:changed', handler);
      return () => ipcRenderer.removeListener('file:changed', handler);
    },
  },
  git: {
    initRepo: (path: string) => ipcRenderer.invoke('git:init', path),
    getHistory: (filePath: string, limit?: number) =>
      ipcRenderer.invoke('git:history', filePath, limit),
    getDiff: (sha1: string, sha2: string, filePath: string) =>
      ipcRenderer.invoke('git:diff', sha1, sha2, filePath),
    restoreFile: (filePath: string, sha: string) =>
      ipcRenderer.invoke('git:restore', filePath, sha),
    commit: (message: string, files?: string[]) =>
      ipcRenderer.invoke('git:commit', message, files),
    getStatus: () => ipcRenderer.invoke('git:status'),
  },
  search: {
    query: (query: string, options?: SearchOptions) =>
      ipcRenderer.invoke('search:query', query, options),
    rebuildIndex: () => ipcRenderer.invoke('search:rebuild'),
  },
  tag: {
    getAllTags: () => ipcRenderer.invoke('tag:get-all'),
    getNotesByTag: (tagName: string) => ipcRenderer.invoke('tag:get-notes', tagName),
    updateNoteTags: (filePath: string, tags: string[]) =>
      ipcRenderer.invoke('tag:update', filePath, tags),
    renameTag: (oldName: string, newName: string) =>
      ipcRenderer.invoke('tag:rename', oldName, newName),
  },
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:get-all'),
  },
  workspace: {
    open: (folderPath: string) => ipcRenderer.invoke('workspace:open', folderPath),
    close: () => ipcRenderer.invoke('workspace:close'),
    getRecent: () => ipcRenderer.invoke('workspace:get-recent'),
  },
  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:show-open', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:show-save', options),
    showMessageBox: (options: any) => ipcRenderer.invoke('dialog:show-message', options),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### 3.3 IPC 完整类型定义

```typescript
// src/shared/types/ipc.ts

// ========== File API Types ==========
export interface FileNode {
  id: string;           // 相对路径
  name: string;
  type: 'file' | 'folder';
  path: string;         // 绝对路径
  children?: FileNode[];
  isExpanded?: boolean;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

// ========== Git API Types ==========
export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
}

export interface GitDiff {
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];   // '+added', '-removed', ' unchanged'
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

// ========== Search API Types ==========
export interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  context?: {
    before: string[];
    after: string[];
  };
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  folderFilter?: string[];
  tagFilter?: string[];
}

// ========== Tag API Types ==========
export interface Tag {
  id: number;
  name: string;
  color?: string;
  count: number;
}

// ========== Config Types ==========
export interface AppConfig {
  version: number;
  editor: {
    defaultMode: 'wysiwyg' | 'source';
    autoSaveDelay: number;
    fontSize: number;
    fontFamily: string;
    maxWidth: number;
  };
  git: {
    autoCommit: boolean;
    autoCommitInterval: number;
    autoCommitStrategy: 'immediate' | 'interval' | 'manual';
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    sidebarWidth: number;
  };
  search: {
    debounceDelay: number;
  };
}

// ========== Workspace Types ==========
export interface WorkspaceInfo {
  path: string;
  name: string;
  lastOpened: number;
}

// ========== Complete ElectronAPI ==========
export interface ElectronAPI {
  file: FileAPI;
  git: GitAPI;
  search: SearchAPI;
  tag: TagAPI;
  config: ConfigAPI;
  workspace: WorkspaceAPI;
  dialog: DialogAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

### 3.4 FileService — 文件服务

```typescript
// src/main/services/file-service.ts
export class FileService {
  private workspacePath: string;
  private watcher: FSWatcher | null = null;
  private changeCallbacks: Set<(event: FileChangeEvent) => void> = new Set();

  constructor(workspacePath: string) { ... }

  // 初始化 chokidar 文件监听
  async initialize(): Promise<void>;

  // 文件 CRUD
  async readFile(relativePath: string): Promise<string>;
  async writeFile(relativePath: string, content: string): Promise<void>;
  async createFile(dirPath: string, fileName: string): Promise<string>;
  async deleteFile(relativePath: string): Promise<void>;  // 移至 .ai-note/trash/
  async renameFile(oldPath: string, newPath: string): Promise<void>;
  async createFolder(parentPath: string, folderName: string): Promise<string>;

  // 文件树
  async getFileTree(): Promise<FileNode[]>;     // 递归构建，文件夹在前
  private async buildTree(basePath: string, relativePath: string): Promise<FileNode[]>;

  // 事件
  onFileChange(callback: (event: FileChangeEvent) => void): () => void;

  // 安全
  private validatePath(fullPath: string): void;  // 防路径遍历
  // 模板
  private generateNoteTemplate(fileName: string): string;  // Front Matter 模板

  async dispose(): Promise<void>;
}
```

**关键实现细节**:
- chokidar 配置 `awaitWriteFinish: { stabilityThreshold: 500 }` 避免重复触发
- 忽略 `/(^|[\/\\])\../` 即所有隐藏文件（.git、.ai-note）
- 删除走回收站：移至 `.ai-note/trash/{timestamp}_{filename}`
- `validatePath` 确保所有路径在工作区内，防止路径遍历攻击

---

### 3.5 GitService — Git 版本控制服务

```typescript
// src/main/services/git-service.ts
export class GitService {
  private workspacePath: string;
  private autoCommitTimer: NodeJS.Timeout | null = null;
  private pendingFiles: Set<string> = new Set();

  constructor(workspacePath: string) { ... }

  // 仓库管理
  async initialize(): Promise<void>;           // 检测/初始化 Git 仓库
  private async createGitignore(): Promise<void>;

  // 暂存与提交
  async stageFile(relativePath: string): Promise<void>;
  async commit(message: string, files?: string[]): Promise<string>;
  startAutoCommit(strategy: 'immediate' | 'interval' | 'manual', interval?: number): void;

  // 版本历史
  async getHistory(relativePath: string, limit?: number): Promise<GitCommit[]>;
  async getCommit(sha: string): Promise<GitCommit>;

  // Diff
  async getDiff(sha1: string, sha2: string, relativePath: string): Promise<GitDiff>;
  private async getFileAtCommit(sha: string, relativePath: string): Promise<string>;

  // 回滚
  async restoreFile(relativePath: string, sha: string): Promise<void>;

  // 状态
  async getStatus(): Promise<GitStatus>;

  dispose(): void;
}
```

**自动提交三种策略**:
- `immediate`: 文件保存后立即 `git add` + `git commit`
- `interval`: 收集变更，每 5 分钟批量提交 `auto: batch update (N files)`
- `manual`: 仅 `git add`，不自动提交，等待用户手动操作

**回滚流程**:
1. `readBlob` 读取目标版本的文件内容
2. 写入当前工作区
3. `git add` + `git commit "revert: restore <file> to <sha>"`

---

### 3.6 SearchService — 全文搜索服务

```typescript
// src/main/services/search-service.ts
export class SearchService {
  private index: FlexSearch.Index;
  private documents: Map<string, IndexedDocument> = new Map();

  constructor(workspacePath: string, fileService: FileService) { ... }

  // 索引管理
  async buildIndex(): Promise<void>;          // 全量构建
  async indexFile(absolutePath: string): Promise<void>;    // 索引单文件
  async removeFile(relativePath: string): Promise<void>;   // 移除
  async updateFile(absolutePath: string): Promise<void>;   // 更新（remove + add）

  // 搜索
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // 辅助
  private findMatches(content: string, query: string, options: SearchOptions): SearchMatch[];
  private scanMarkdownFiles(dirPath: string): Promise<string[]>;
  private removeFrontMatter(content: string): string;
}
```

**FlexSearch 配置**:
```typescript
new FlexSearch.Index({
  tokenize: 'forward',       // 前向分词，支持中文
  charset: 'latin:extra',    // 扩展字符集
  resolution: 9,
  context: { depth: 2, resolution: 3 },
});
```

**中文搜索**: `tokenize: 'forward'` 支持逐字前向匹配，若需更精确的中文分词可后续集成 `jieba-wasm`。

---

### 3.7 TagService — 标签服务

```typescript
// src/main/services/tag-service.ts
export class TagService {
  private workspacePath: string;
  private dbService: DbService;

  constructor(workspacePath: string, dbService: DbService) { ... }

  async initialize(): Promise<void>;  // 扫描所有 .md，同步标签到 SQLite
  async syncFileTags(absolutePath: string): Promise<void>;  // 单文件同步
  async getAllTags(): Promise<Tag[]>;
  async getNotesByTag(tagName: string): Promise<string[]>;
  async updateNoteTags(relativePath: string, tags: string[]): Promise<void>;  // 更新文件 + DB
  async renameTag(oldName: string, newName: string): Promise<void>;  // 全局重命名
}
```

**双向同步策略**:
- 写入标签时：gray-matter 更新 Front Matter → 写入文件 → 更新 SQLite
- 读取标签时：从 SQLite 查询（快速），Front Matter 为权威数据源

---

### 3.8 DbService — SQLite 数据库服务

```typescript
// src/main/services/db-service.ts
export class DbService {
  private db: Database.Database;

  constructor(workspacePath: string) { ... }

  // DDL
  private initialize(): void;  // CREATE TABLE IF NOT EXISTS

  // 笔记元数据
  upsertNote(id: string, title: string, createdAt: string, updatedAt: string, hash: string): void;
  deleteNote(noteId: string): void;

  // 标签
  updateNoteTags(noteId: string, tagNames: string[]): void;
  getAllTags(): Tag[];
  getNotesByTag(tagName: string): string[];

  close(): void;
}
```

**表结构 DDL**:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,           -- 文件相对路径
  title TEXT,
  created_at TEXT,
  updated_at TEXT,
  content_hash TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT,
  tag_id INTEGER,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
```

**性能优化**: `PRAGMA journal_mode = WAL` 提升并发读写性能。

---

### 3.9 ConfigService — 配置管理服务

```typescript
// src/main/services/config-service.ts
export class ConfigService {
  private configPath: string;   // .ai-note/config.json
  private config: AppConfig;

  constructor(workspacePath: string) { ... }

  async load(): Promise<void>;   // 加载配置，不存在则用默认值
  async save(): Promise<void>;   // 持久化到文件
  get(key: string): any;         // 点号路径: 'editor.fontSize'
  async set(key: string, value: any): Promise<void>;
  getAll(): AppConfig;

  private mergeConfig(defaults: any, loaded: any): any;  // 深度合并
}
```

**默认配置**:
```json
{
  "version": 1,
  "editor": { "defaultMode": "wysiwyg", "autoSaveDelay": 1000, "fontSize": 16, "fontFamily": "system-ui", "maxWidth": 800 },
  "git": { "autoCommit": true, "autoCommitInterval": 300000, "autoCommitStrategy": "interval" },
  "appearance": { "theme": "system", "sidebarWidth": 260 },
  "search": { "debounceDelay": 300 }
}
```

---

## 4. 前端架构设计

### 4.1 React 组件树

```
App
├── MainLayout
│   ├── Sidebar
│   │   ├── FileTreePanel → FileTree → FileNode (recursive)
│   │   ├── SearchPanel → SearchInput + SearchResultList → SearchResultItem
│   │   ├── TagPanel → TagItem
│   │   └── GitHistoryPanel → CommitItem
│   ├── EditorArea
│   │   ├── TabBar → TabItem
│   │   └── EditorContainer
│   │       ├── Toolbar (WYSIWYG only)
│   │       ├── WysiwygEditor (Milkdown)
│   │       ├── SourceEditor (CodeMirror 6)
│   │       └── TagEditor
│   └── StatusBar
└── GlobalModals
    ├── DiffViewerModal
    ├── ConfirmDialog
    └── SettingsModal
```

### 4.2 Zustand Store 设计

**workspace-store.ts**:
```typescript
interface WorkspaceStore {
  currentWorkspace: WorkspaceInfo | null;
  recentWorkspaces: WorkspaceInfo[];
  isLoading: boolean;
  error: string | null;

  openWorkspace: (path: string) => Promise<void>;
  closeWorkspace: () => Promise<void>;
  loadRecentWorkspaces: () => Promise<void>;
}
```

**file-store.ts**:
```typescript
interface FileStore {
  tree: FileNode[];
  selectedFileId: string | null;
  expandedFolderIds: Set<string>;

  loadFileTree: () => Promise<void>;
  selectFile: (fileId: string) => void;
  toggleFolder: (folderId: string) => void;
  createFile: (parentId: string, name: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
}
```

**editor-store.ts**:
```typescript
interface EditorTab {
  id: string;          // 文件路径
  title: string;
  content: string;
  isDirty: boolean;
  mode: 'wysiwyg' | 'source';
}

interface EditorStore {
  tabs: EditorTab[];
  activeTabId: string | null;

  openFile: (filePath: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateContent: (tabId: string, content: string) => void;  // 触发防抖自动保存
  switchMode: (tabId: string, mode: 'wysiwyg' | 'source') => void;
  saveFile: (tabId: string) => Promise<void>;
}
```

**search-store.ts**:
```typescript
interface SearchStore {
  query: string;
  results: SearchResult[];
  isSearching: boolean;

  search: (query: string, options?: SearchOptions) => Promise<void>;
  clearSearch: () => void;
}
```

**tag-store.ts**:
```typescript
interface TagStore {
  tags: Tag[];
  selectedTagName: string | null;
  filteredNotes: string[];

  loadTags: () => Promise<void>;
  selectTag: (tagName: string) => Promise<void>;
  clearFilter: () => void;
}
```

**git-store.ts**:
```typescript
interface GitStore {
  history: GitCommit[];
  status: GitStatus | null;
  currentDiff: GitDiff | null;

  loadHistory: (filePath: string) => Promise<void>;
  loadStatus: () => Promise<void>;
  loadDiff: (sha1: string, sha2: string, filePath: string) => Promise<void>;
  restoreFile: (filePath: string, sha: string) => Promise<void>;
}
```

### 4.3 编辑器集成

#### Milkdown WYSIWYG

```typescript
// src/renderer/src/components/editor/WysiwygEditor.tsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
```

- 使用 `listenerCtx.markdownUpdated` 获取 Markdown 输出
- 支持 CommonMark + GFM 完整语法
- 通过 `defaultValueCtx` 接收外部内容

#### CodeMirror 6 源码模式

```typescript
// src/renderer/src/components/editor/SourceEditor.tsx
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
```

- 使用 `EditorView.updateListener` 监听内容变更
- 内置 basicSetup 提供行号、高亮、括号匹配等

#### 模式切换机制

**数据流**:
1. WYSIWYG → 源码：Milkdown 输出 Markdown string → 传给 CodeMirror
2. 源码 → WYSIWYG：CodeMirror string → 传给 Milkdown `defaultValueCtx`
3. 中间格式为 **Markdown 纯文本**，确保无损切换

```typescript
// EditorContainer 通过 currentContent state 桥接两个编辑器
const [currentContent, setCurrentContent] = useState(initialContent);

// 切换时只需改变渲染的编辑器组件，currentContent 保持一致
{mode === 'wysiwyg' ? (
  <WysiwygEditor initialValue={currentContent} onChange={setCurrentContent} />
) : (
  <SourceEditor initialValue={currentContent} onChange={setCurrentContent} />
)}
```

---

## 5. 数据流设计

### 5.1 文件编辑 → 自动保存 → Git 提交

```
用户输入
  → Milkdown/CodeMirror onChange
  → EditorStore.updateContent() [isDirty=true]
  → 防抖定时器 (1s)
  → EditorStore.saveFile() → IPC file:write
  → FileService.writeFile() → 磁盘
  → chokidar 检测到变更
  → 并行触发:
      ├─ GitService.stageFile() → git add → pendingFiles
      ├─ SearchService.updateFile() → FlexSearch 索引更新
      └─ TagService.syncFileTags() → SQLite 更新
  → 自动提交检查:
      ├─ immediate → 立即 commit
      ├─ interval → 等待定时器 (5min) → batch commit
      └─ manual → 不操作
```

### 5.2 搜索索引更新

```
文件变更 (add/change/unlink)
  → FileService.notifyChange()
  → SearchService.updateFile() / removeFile()
  → FlexSearch.addAsync() / removeAsync()
  → 索引更新完成
```

### 5.3 标签同步

```
用户修改标签
  → TagEditor → IPC tag:update
  → TagService.updateNoteTags()
      ├─ gray-matter 更新 Front Matter → fs.writeFile
      └─ DbService.updateNoteTags() → SQLite
```

---

## 6. 关键技术方案

### 6.1 Electron 安全配置

**CSP (Content-Security-Policy)**:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: file:;
  font-src 'self' data:;
"/>
```

**IPC 安全**:
- 禁用 `nodeIntegration`，启用 `contextIsolation`
- 白名单化 IPC channel，主进程验证参数
- `validatePath` 防止路径遍历
- 应用仅访问用户显式选择的工作区目录

### 6.2 Git 自动提交防抖

- `immediate`: 无防抖，每次保存立即提交
- `interval`: 收集 5 分钟内所有变更，批量提交
- `manual`: 仅 stage 不 commit

### 6.3 大文件处理

- 超过 1MB 的 Markdown 文件强制切换到源码模式
- FlexSearch 对大文件分片索引

---

## 7. 构建与部署

### 7.1 Monorepo 工具链

**包管理器**: pnpm（内置 workspace 支持）

**关键配置文件**:
- `pnpm-workspace.yaml` — 定义 workspace 包范围（`apps/*`、`packages/*`）
- `.npmrc` — `shamefully-hoist=true`（Electron 生态部分包需要扁平 node_modules）
- 根 `package.json` — workspace scripts，通过 `--filter` 转发到子包

**常用命令**:
```bash
pnpm install                              # 安装所有 workspace 依赖
pnpm dev                                  # 启动桌面应用开发
pnpm build                                # 构建桌面应用
pnpm dev:website                          # 启动官网开发（localhost:3001）
pnpm build:website                        # 构建静态官网
pnpm --filter @ai-note/desktop add xxx    # 给桌面应用添加依赖
pnpm --filter @ai-note/website add xxx    # 给官网添加依赖
pnpm -r lint                              # 全仓库 lint
```

### 7.2 electron-vite 配置

位于 `apps/desktop/electron.vite.config.ts`，所有路径使用 `__dirname` 相对解析：

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    css: { postcss: { plugins: [tailwindcss, autoprefixer] } },
  },
});
```

### 7.3 桌面应用 scripts (`apps/desktop/package.json`)

```json
{
  "name": "@ai-note/desktop",
  "scripts": {
    "dev": "unset ELECTRON_RUN_AS_NODE && electron-vite dev",
    "build": "electron-vite build",
    "preview": "unset ELECTRON_RUN_AS_NODE && electron-vite preview",
    "rebuild": "electron-rebuild",
    "postinstall": "electron-rebuild",
    "lint": "eslint . --ext .ts,.tsx --fix",
    "test": "vitest run"
  }
}
```

### 7.4 打包配置

```json
{
  "build": {
    "appId": "com.ainote.app",
    "productName": "AI-Note",
    "directories": { "output": "dist" },
    "files": ["out/**/*", "resources/**/*"],
    "mac": { "category": "public.app-category.productivity", "target": ["dmg", "zip"] },
    "win": { "target": ["nsis", "portable"] },
    "linux": { "target": ["AppImage", "deb"], "category": "Utility" }
  }
}
```

### 7.5 官网构建与部署

**构建方式**: Next.js 静态导出（`output: 'export'`），生成纯静态 HTML/CSS/JS

```bash
pnpm build:website    # 输出到 apps/website/out/
```

**部署目标**: GitHub Pages / Vercel / Netlify 等任意静态托管平台，无需 Node.js 服务器

**技术栈**: Next.js 14 (App Router) + Tailwind CSS 3 + framer-motion

---

## 8. 测试策略

### 8.1 单元测试 (Vitest)

**重点覆盖**:
- Service 层: FileService、GitService、SearchService 核心逻辑
- 工具函数: debounce、路径验证、Markdown 解析
- Store: Zustand store 的状态变更

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

### 8.2 E2E 测试 (Playwright)

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('应用启动并显示主窗口', async () => {
  const app = await electron.launch({ args: ['out/main/index.js'] });
  const window = await app.firstWindow();
  await expect(window.title()).resolves.toBe('AI-Note');
  await app.close();
});
```

### 8.3 测试覆盖目标

- 核心模块（Git、文件操作、搜索引擎）: > 80%
- UI 组件: 关键交互流程 E2E 覆盖

---

## 9. 技术风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| better-sqlite3 编译失败 | 高 | electron-builder 预编译，fallback 到 sql.js |
| Milkdown 大文件性能瓶颈 | 中 | 超大文件强制源码模式 |
| FlexSearch 内存占用（万级文件） | 中 | 分片索引 + LRU 缓存 |
| isomorphic-git 性能不及原生 | 低 | fallback 到系统 Git (child_process) |
| chokidar macOS 误触发 | 低 | awaitWriteFinish + debounce |

---

## 10. 关键文件依赖图

所有路径相对于 `apps/desktop/`：

```
src/main/index.ts
  ├─> src/main/ipc/index.ts
  │     ├─> file-handlers.ts → services/file-service.ts
  │     ├─> git-handlers.ts  → services/git-service.ts
  │     ├─> search-handlers.ts → services/search-service.ts
  │     ├─> tag-handlers.ts  → services/tag-service.ts → services/db-service.ts
  │     ├─> config-handlers.ts → services/config-service.ts
  │     └─> workspace-handlers.ts
  └─> services/config-service.ts

src/preload/index.ts
  └─> src/shared/types/ipc.ts

src/renderer/src/main.tsx
  └─> App.tsx
        ├─> components/layout/MainLayout.tsx
        │     ├─> Sidebar.tsx
        │     ├─> StatusBar.tsx
        │     └─> EditorContainer.tsx
        ├─> stores/workspace-store.ts
        ├─> stores/file-store.ts
        ├─> stores/editor-store.ts
        └─> i18n/index.ts → locales/en.ts, locales/zh.ts
```

---

## 11. 移动端架构（Android）

### 11.1 技术选型

| 类别 | 技术方案 | 选型理由 |
|------|----------|----------|
| 框架 | Expo SDK 52 (React Native) | 托管工作流，开发体验好，OTA 更新 |
| 路由 | Expo Router | 文件路由，深度链接支持 |
| UI 组件 | React Native Paper | Material Design 3，Android 原生风格 |
| 状态管理 | Zustand | 与桌面端一致，框架无关 |
| 文件系统 | expo-file-system | Expo 托管，Android 可靠 |
| 数据库 | expo-sqlite | 异步 SQLite，Expo 托管 |
| Git | isomorphic-git + fs-adapter | 纯 JS，通过 fs 适配器在 RN 运行 |
| 搜索 | FlexSearch | 纯 JS，无需修改 |
| 前置数据 | gray-matter | 纯 JS，无需修改 |
| 配置存储 | AsyncStorage | 键值对持久化 |
| 编辑器 | TextInput (source) / TenTap (WYSIWYG) | ProseMirror WebView |

### 11.2 架构概览

```
┌─────────────────────────────────────────────────────┐
│                   React Native App                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Expo Router (File-based)             │ │
│  │  ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐ │ │
│  │  │ Explorer │ │ Search │ │ Tags │ │ Settings │ │ │
│  │  └────┬─────┘ └───┬────┘ └──┬───┘ └──────────┘ │ │
│  │       └────────────┴─────────┘                    │ │
│  │                    │                              │ │
│  │            ┌───────┴───────┐                      │ │
│  │            │ Editor Screen │                      │ │
│  │            └───────────────┘                      │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│  ┌─────────────────────┴───────────────────────────┐ │
│  │              Zustand Stores                       │ │
│  │  workspace / file / editor / search / tag / settings │
│  └─────────────────────┬───────────────────────────┘ │
│                        │ (直接调用，无 IPC)            │
│  ┌─────────────────────┴───────────────────────────┐ │
│  │               Services Layer                      │ │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────────┐    │ │
│  │  │FileService│ │GitService│ │SearchService │    │ │
│  │  └───────────┘ └──────────┘ └──────────────┘    │ │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────────┐    │ │
│  │  │TagService │ │DbService │ │ConfigService │    │ │
│  │  └───────────┘ └──────────┘ └──────────────┘    │ │
│  └─────────────────────┬───────────────────────────┘ │
│                        │                              │
│  ┌─────────────────────┴───────────────────────────┐ │
│  │              fs-adapter.ts                        │ │
│  │   expo-file-system → fs/promises interface        │ │
│  └─────────────────────┬───────────────────────────┘ │
│                        │                              │
│  ┌─────────────────────┴───────────────────────────┐ │
│  │          Native Layer (Expo Modules)              │ │
│  │  expo-file-system | expo-sqlite | AsyncStorage    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 11.3 与桌面端的关键差异

| 维度 | 桌面端 (Electron) | 移动端 (Expo) |
|------|-------------------|---------------|
| 进程模型 | Main + Renderer (IPC 通信) | 单进程 (Services 直接调用) |
| 文件系统 | Node.js fs/promises | expo-file-system + fs-adapter |
| 文件监听 | chokidar 实时监听 | 无（状态驱动更新） |
| 数据库 | better-sqlite3 (同步) | expo-sqlite (异步) |
| 编辑器 | Milkdown (WYSIWYG) + CodeMirror (Source) | TenTap (WYSIWYG) + TextInput (Source) |
| 编辑模式 | 多标签 (tabs[]) | 单文件聚焦 + 返回导航 |
| 导航 | 侧边栏 + 垂直标签 | 底部 Tab 栏 (4 tabs) |
| 布局 | 固定宽度侧边栏 + 编辑区 | 全屏页面 + Stack 导航 |
| 配置存储 | JSON 文件 | AsyncStorage |

### 11.4 目录结构

```
apps/mobile/
├── app/                          # Expo Router 文件路由
│   ├── _layout.tsx               # 根布局 (providers, theme)
│   ├── index.tsx                 # 欢迎页 / 工作区选择
│   └── (main)/                   # 主应用 (工作区加载后)
│       ├── _layout.tsx           # 底部 Tab 导航
│       ├── explorer.tsx          # 文件树
│       ├── search.tsx            # 搜索
│       ├── tags.tsx              # 标签
│       ├── settings.tsx          # 设置
│       └── editor/[path].tsx     # 笔记编辑器 (Stack)
├── src/
│   ├── services/                 # 数据层 (从桌面端移植)
│   │   ├── fs-adapter.ts        # expo-file-system → fs/promises 适配器
│   │   ├── workspace-service.ts # 工作区管理
│   │   ├── file-service.ts      # 文件 CRUD
│   │   ├── git-service.ts       # Git 版本控制
│   │   ├── search-service.ts    # FlexSearch 全文搜索
│   │   ├── tag-service.ts       # 标签管理
│   │   ├── db-service.ts        # SQLite 数据库
│   │   └── config-service.ts    # 应用配置
│   ├── stores/                   # Zustand 状态 (适配自桌面端)
│   ├── components/               # UI 组件
│   ├── i18n/                     # 国际化 (zh/en)
│   └── theme/                    # Material Design 3 主题
└── assets/                       # 图标和启动图
```

### 11.5 共享类型包

`packages/shared-types/` 提供跨平台共享的类型定义和常量：

- **类型**: FileNode, GitCommit, GitDiff, SearchResult, Tag, AppConfig, WorkspaceInfo
- **常量**: APP_NAME, CONFIG_DIR, DB_FILE, TRASH_DIR, DEFAULT_GITIGNORE
- 桌面端通过 `@shared/*` 别名 re-export
- 移动端直接从 `@ai-note/shared-types` 导入

### 11.6 fs-adapter 设计

核心适配器将 `expo-file-system` 包装为 `fs/promises` 兼容接口，使 `isomorphic-git` 和移植的 Services 可直接使用：

```typescript
// isomorphic-git 使用示例
import fsAdapter from './fs-adapter'
await git.init({ fs: fsAdapter, dir: workspacePath })
```

适配的方法：`readFile`, `writeFile`, `unlink`, `readdir`, `mkdir`, `stat`, `lstat`, `rename`, `rmdir`

### 11.7 导航结构

```
Root Stack
├── Welcome Screen (工作区选择)
└── Main Tabs (工作区加载后)
    ├── Explorer Tab → FileTree → Editor (Stack push)
    ├── Search Tab → SearchResults → Editor (Stack push)
    ├── Tags Tab → TagList → FilteredNotes → Editor (Stack push)
    └── Settings Tab
```

---

## 12. 跨设备同步架构

### 12.1 架构概览

AI-Note 采用**混合同步**方案，支持桌面端与移动端之间的笔记数据同步：

- **主通道**: 局域网 Wi-Fi（Fastify HTTP + WebSocket + mDNS 自动发现）
- **备用通道**: BLE 蓝牙（GATT Service，无 Wi-Fi 时降级）

核心设计原则：**传输层与同步协议分离**。同步逻辑（Manifest 比对、Delta 计算、冲突处理）独立于传输方式，通过 `SyncTransport` 接口抽象。

```
┌──────────────────────────────────────────────────────────┐
│                     SyncService (Orchestrator)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ SyncProtocol │  │   SyncAuth   │  │  Conflict    │   │
│  │ (Manifest +  │  │ (PIN/Token)  │  │  Resolution  │   │
│  │  Delta)      │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
│         ┌─────────────────────────────┐                  │
│         │   SyncTransport Interface   │                  │
│         └──────┬──────────────┬───────┘                  │
│                │              │                           │
│  ┌─────────────┴──┐  ┌───────┴──────────┐               │
│  │ LanSyncTransport│  │ BleSyncTransport │               │
│  │ (Fastify+WS+   │  │ (bleno GATT +    │               │
│  │  mDNS)         │  │  chunking+gzip)  │               │
│  └────────────────┘  └──────────────────┘               │
└──────────────────────────────────────────────────────────┘
```

### 12.2 同步协议

#### Manifest 比对

每个设备维护一份笔记清单（NoteManifest），包含所有 `.md` 文件的元数据：

```typescript
interface NoteManifestEntry {
  path: string          // relative path, e.g. "notes/hello.md"
  title: string         // from front matter
  updatedAt: number     // unix timestamp from front matter 'updated'
  contentHash: string   // SHA-256 of full file content
  size: number          // file size in bytes
}
```

#### Delta 计算

比较本地与远端 Manifest，生成同步差异：

| 情况 | 处理 |
|------|------|
| 仅本地存在 | 发送给远端（toSend） |
| 仅远端存在 | 从远端接收（toReceive） |
| 双方存在，hash 相同 | 跳过（已同步） |
| 双方存在，hash 不同，时间戳不同 | 较新的一方胜出 |
| 双方存在，hash 不同，时间戳相同 | 冲突 |

#### 同步流程

```
桌面端                                    移动端
  |  1. 发现 (mDNS 或 BLE 扫描)            |
  |<----------------------------------------|
  |  2. 配对 (首次: QR/PIN → token)         |
  |---------------------------------------->|
  |  3. 交换 NoteManifest                   |
  |<----------------------------------------|
  |  4. 计算 SyncDelta                      |
  |  5. 传输变更文件 (仅 changed)           |
  |<--------- bidirectional --------------->|
  |  6. 冲突处理                            |
  |  7. 完成，更新同步时间戳                 |
```

### 12.3 认证方案

采用 **PIN 配对 + Bearer Token** 模式（类似 AirDrop / KDE Connect）：

1. 桌面端生成 6 位 PIN + QR 码（含 PIN、IP、端口、设备 ID）
2. 移动端扫码或手动输入 PIN
3. 验证通过后，桌面端签发 Bearer Token（32 字节 crypto random hex）
4. 后续请求携带 `Authorization: Bearer <token>`
5. Token 持久化到 `.ai-note/config.json` 的 `sync.pairedDevices`

PIN 有效期 5 分钟，Token 长期有效但可随时撤销。

### 12.4 冲突处理策略

可通过 `SyncConfig.conflictStrategy` 配置：

| 策略 | 行为 |
|------|------|
| `last-write-wins`（默认） | `updatedAt` 较新的胜出，旧版备份到 `.ai-note/sync-conflicts/` |
| `keep-both` | 远端版本另存为 `{name}.conflict.md` |
| `ask` | 弹出 UI 让用户逐个选择 |

### 12.5 局域网传输层（LAN Transport）

**技术栈**: Fastify + @fastify/websocket + @fastify/cors + bonjour-service

**mDNS 服务发现**: 广播 `_ai-note-sync._tcp` 服务，移动端自动发现桌面端

**REST API 端点** (默认端口 18923):

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/sync/status` | 否 | 设备信息、是否需要配对 |
| POST | `/api/sync/pair` | 否 | 提交 PIN 获取 token |
| GET | `/api/sync/manifest` | 是 | 返回笔记清单 |
| POST | `/api/sync/delta` | 是 | 提交远端清单，返回差异 |
| GET | `/api/notes/:path` | 是 | 获取单篇笔记内容 |
| PUT | `/api/notes/:path` | 是 | 创建/更新笔记 |
| DELETE | `/api/notes/:path` | 是 | 删除笔记（移至回收站） |
| POST | `/api/sync/complete` | 是 | 标记同步完成 |

**WebSocket** (`ws://<ip>:<port>/ws`):
- 认证：首条消息发送 `{ type: "auth", token }`
- 服务端推送：`file-changed`、`sync-status`、`sync-progress`

### 12.6 BLE 蓝牙传输层（BLE Transport）

**技术栈**: `@abandonware/bleno`（桌面端作为 BLE Peripheral），native 模块需 `electron-rebuild`。

**实现文件**: `apps/desktop/src/main/services/sync/ble-sync-transport.ts`

**GATT Service** (自定义 128-bit UUID):

| Characteristic | UUID | 权限 | 用途 |
|---------------|------|------|------|
| DEVICE_INFO | `13370002...` | Read | 设备 JSON 元数据 |
| SYNC_CONTROL | `13370003...` | Write + Notify | 命令/响应通道（auth、request-manifest、request-file、sync-complete 等） |
| SYNC_DATA | `13370004...` | Write + Notify | 分片数据传输（manifest + 文件内容） |

**控制协议（SYNC_CONTROL）**:

写入命令（Central → Peripheral）:
- `{ type: "auth", token }` — 认证
- `{ type: "request-manifest" }` — 请求清单
- `{ type: "request-file", path }` — 请求文件内容
- `{ type: "send-file-start", path, size, compressed }` — 开始发送文件
- `{ type: "send-file-end", path }` — 文件发送完成
- `{ type: "delete-file", path }` — 删除文件
- `{ type: "sync-complete" }` — 同步完成

通知响应（Peripheral → Central）:
- `{ type: "auth-ok", deviceId }` / `{ type: "auth-fail" }`
- `{ type: "manifest-ready", chunks }` / `{ type: "file-ready", path, chunks, compressed }`
- `{ type: "ack" }` / `{ type: "error", message }`

**分片协议（SYNC_DATA）**:

二进制分片格式（MTU 限制下传输大数据）:

| 字节 | 含义 |
|------|------|
| `0x01` + uint32BE(totalChunks) | START 包 |
| `0x02` + raw data | DATA 包 |
| `0x03` | END 包 |

**数据传输优化**:
- MTU 协商（默认 20 字节 → 协商至 247 字节）
- 数据分片：按 (MTU - 1) 大小切分，接收端重组
- gzip 压缩：仅对 > 1KB 的数据压缩（`BLE_COMPRESS_THRESHOLD`）
- Delta 同步：仅传输变更文件
- 事件循环让步：分片间 `setImmediate()` 避免 BLE 拥塞

**注意事项**:
- `bleno` 为可选依赖，未安装时 `BleSyncTransport.start()` 会抛出明确错误
- BLE 仅支持单连接（一次只能同步一台设备）
- macOS 支持良好，Windows 有限制
- 安装需要：`pnpm --filter @ai-note/desktop add @abandonware/bleno && electron-rebuild`
- pnpm 的 `onlyBuiltDependencies` 需包含 `@abandonware/bleno` 和 `xpc-connect`

### 12.7 配置扩展

`AppConfig` 新增 `sync` 字段：

```typescript
sync: {
  enabled: boolean              // default false
  lanPort: number               // default 18923
  lanEnabled: boolean           // default true
  bleEnabled: boolean           // default false
  conflictStrategy: 'last-write-wins' | 'keep-both' | 'ask'
  autoSync: boolean             // auto-sync on device connect
  pairedDevices: AuthToken[]    // persisted tokens
}
```

### 12.8 新增文件清单

```
apps/desktop/src/main/services/sync/
├── sync-service.ts              # orchestrator
├── sync-protocol.ts             # manifest + delta logic
├── sync-auth.ts                 # PIN/token auth
├── lan-sync-transport.ts        # Fastify + WS + mDNS
└── ble-sync-transport.ts        # bleno GATT service

apps/desktop/src/main/ipc/
└── sync-handlers.ts             # IPC handlers

apps/desktop/src/renderer/src/stores/
└── sync-store.ts                # Zustand store

apps/desktop/src/renderer/src/components/sync/
├── SyncPanel.tsx                # sidebar panel
├── SyncStatusIndicator.tsx      # status bar icon
├── PairingModal.tsx             # QR + PIN
└── SyncSettings.tsx             # settings

packages/shared-types/src/models/
└── sync.ts                      # shared sync types
```

### 12.9 新增依赖

| 包名 | 用途 | 阶段 |
|------|------|------|
| fastify | HTTP 服务器 | LAN Transport |
| @fastify/websocket | WebSocket 支持 | LAN Transport |
| @fastify/cors | CORS 跨域 | LAN Transport |
| bonjour-service | mDNS 服务发现 | LAN Transport |
| qrcode | QR 码生成 | UI |
| @abandonware/bleno | BLE Peripheral | BLE Transport |
| nan | C++ Native Abstractions (bleno 构建依赖) | BLE Transport |

### 12.10 数据流

**局域网同步数据流**:

```
移动端发起同步
  → mDNS 发现桌面端 IP:Port
  → POST /api/sync/pair (首次) 或 Bearer token (已配对)
  → GET /api/sync/manifest (获取桌面端清单)
  → POST /api/sync/delta (提交移动端清单，获取差异)
  → 按 Delta 双向传输文件:
      GET /api/notes/:path (桌面端 → 移动端)
      PUT /api/notes/:path (移动端 → 桌面端)
  → POST /api/sync/complete
  → WebSocket 保持连接，推送后续变更
```

**桌面端文件变更 → 推送**:

```
用户编辑笔记
  → FileService.writeFile() → 磁盘
  → chokidar 检测变更
  → 并行触发:
      ├─ SearchService.updateFile()
      ├─ TagService.syncFileTags()
      └─ LanSyncTransport.broadcastFileChange() → WebSocket 推送
  → 移动端收到 file-changed 事件
  → 移动端拉取更新的文件
```
