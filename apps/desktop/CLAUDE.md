# INote Desktop

## 项目简介
INote 桌面应用，本地优先的笔记与文件管理工具，内置 Git 版本控制。

## 技术栈
- Electron 33 + electron-vite
- React 18 + TypeScript + Zustand
- Milkdown (WYSIWYG) + CodeMirror 6 (源码编辑)
- isomorphic-git + better-sqlite3 + FlexSearch
- Tailwind CSS 3

## 开发命令
```bash
pnpm dev              # 启动 Electron 开发模式（需 unset ELECTRON_RUN_AS_NODE）
pnpm build            # 构建应用
pnpm preview          # 预览构建结果
pnpm test             # 运行 Vitest 测试
pnpm rebuild          # 重新编译原生模块（better-sqlite3）
```

## 目录结构
```
src/
├── main/             # 主进程
│   ├── index.ts      # 入口（BrowserWindow + 生命周期）
│   ├── ipc/          # IPC handlers（file, git, search, tag, config, workspace）
│   ├── services/     # 服务层（FileService, GitService, SearchService, DbService 等）
│   └── utils/        # logger
├── preload/          # 预加载脚本（electronAPI 安全桥接）
├── renderer/         # React UI
│   └── src/
│       ├── components/  # layout, editor, file-tree, search, tags, git, common
│       ├── stores/      # Zustand stores（workspace, file, editor, search, tag, git, settings）
│       ├── i18n/        # 国际化（中文/英文）
│       └── styles/      # globals.css
└── shared/           # 跨进程共享（types/ipc.ts, constants.ts）
```

## 架构要点
- **进程模型**: Main (Node.js) ↔ Preload (桥接) ↔ Renderer (React)
- **安全**: contextIsolation + 白名单 IPC channel + 路径校验
- **版本控制**: `saveVersion()` 更新 front matter updated 时间戳确保每次提交有实际变更
- **原生模块**: `better-sqlite3` 需要 `electron-rebuild` 编译为 Electron Node 版本

## 相关文档
- 产品需求：`docs/prd.md`
- 技术设计：`docs/technical-design.md`
