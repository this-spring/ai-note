# AI-Note Monorepo

## 项目简介
AI-Note 产品 monorepo，包含桌面应用、官网、移动端等子项目。

## 项目结构
- `apps/desktop/` — Electron 桌面应用（React + TypeScript + Zustand）
- `apps/website/` — 营销官网（Next.js 14 SSG + Tailwind + framer-motion）
- `apps/mobile/` — Android 移动应用（Expo SDK 52 + React Native Paper + Zustand）
- `packages/shared-types/` — 共享类型和常量（跨平台复用）
- `docs/` — 产品文档（PRD + 技术设计文档）

## 开发命令
```bash
pnpm install          # 安装所有依赖
pnpm dev              # 启动桌面应用开发服务器
pnpm build            # 构建桌面应用
pnpm dev:website      # 启动官网开发（localhost:3001）
pnpm build:website    # 构建静态官网
pnpm dev:mobile       # 启动移动端 Expo 开发服务器
pnpm android          # 在 Android 设备/模拟器上运行
pnpm lint             # 全仓库 lint
pnpm test             # 全仓库测试
```

## 权限配置
- 允许在项目目录下执行所有 bash 命令
- 允许读写项目目录下的所有文件
- 允许执行 git 操作（add, commit, push, pull, branch, merge 等）
- 允许安装和管理 pnpm 依赖
- 允许启动开发服务器和构建项目
- 允许执行测试命令

## 开发规范
- 使用中文进行沟通和文档编写
- 代码注释使用英文
- Git commit message 使用英文
- 文件和目录命名使用 kebab-case
- **架构变更时必须同步更新 `docs/technical-design.md`**（包括目录结构、模块设计、依赖关系、构建配置等）

## 环境要求
- Node.js >= 18
- pnpm >= 8
- VS Code 运行时需 `unset ELECTRON_RUN_AS_NODE`
