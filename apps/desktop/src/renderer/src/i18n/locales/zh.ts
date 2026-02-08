const zh: Record<string, string> = {
  // App
  'app.name': 'AI-Note',
  'app.description': '本地优先的 Markdown 笔记应用',
  'app.opening': '正在打开...',

  // Workspace
  'workspace.open': '打开工作区',
  'workspace.recent': '最近的工作区',

  // Sidebar
  'sidebar.explorer': '资源管理器',
  'sidebar.search': '搜索',
  'sidebar.tags': '标签',
  'sidebar.git': 'Git',

  // Status bar
  'status.unsaved': '未保存',
  'status.saved': '已保存',
  'status.words': '字',
  'status.lines': '行',

  // File tree
  'fileTree.title': '资源管理器',
  'fileTree.empty': '工作区中没有文件',
  'fileTree.newFilePlaceholder': '文件名...',
  'fileTree.newFolderPlaceholder': '文件夹名...',
  'fileTree.contextMenu.newFile': '新建文件',
  'fileTree.contextMenu.newFolder': '新建文件夹',
  'fileTree.contextMenu.rename': '重命名',
  'fileTree.contextMenu.delete': '删除',
  'fileTree.deleteConfirm': '确定要删除 "{name}" 吗？',

  // Editor
  'editor.emptyTitle': '选择一个文件开始编辑',
  'editor.emptySubtitle': '或从资源管理器中创建新文件',
  'editor.closeTab': '关闭标签页',
  'editor.togglePreview': '切换预览',
  'editor.showPreview': '显示预览',
  'editor.hidePreview': '隐藏预览',
  'editor.history': '版本历史',
  'editor.toggleHistory': '切换版本历史',

  // Search
  'search.title': '搜索',
  'search.placeholder': '在文件中搜索...',
  'search.searching': '搜索中...',
  'search.noResults': '未找到结果',

  // Tags
  'tags.title': '标签',
  'tags.clearFilter': '清除筛选',
  'tags.empty': '没有标签',
  'tags.notesTagged': '标签为 "{tag}" 的笔记',

  // Version
  'version.title': '版本管理',
  'version.empty': '暂无保存的版本',
  'version.save': '保存',
  'version.saving': '保存中...',
  'version.descriptionPlaceholder': '版本说明...',
  'version.restore': '恢复',
  'version.restoreConfirm': '确定恢复到此版本吗？当前内容将被覆盖。',
  'version.preview': '预览',
  'version.selectToPreview': '选择一个版本查看内容',
  'version.loading': '加载中...',

  // Time
  'time.justNow': '刚刚',
  'time.minutesAgo': '{n}分钟前',
  'time.hoursAgo': '{n}小时前',
  'time.daysAgo': '{n}天前',
  'time.weeksAgo': '{n}周前',
  'time.monthsAgo': '{n}个月前',

  // Settings
  'settings.language': '语言',
  'settings.theme': '主题',
  'settings.light': '浅色',
  'settings.dark': '深色',
  'settings.system': '跟随系统',

  // Sync
  'sidebar.sync': '同步',
  'sync.title': '同步',
  'sync.on': '开启',
  'sync.off': '关闭',
  'sync.statusLabel': '状态',
  'sync.status.idle': '空闲',
  'sync.status.discovering': '发现中',
  'sync.status.connecting': '连接中',
  'sync.status.syncing': '同步中',
  'sync.status.error': '错误',
  'sync.lastSync': '上次同步',
  'sync.never': '从未同步',
  'sync.connectedDevices': '已连接设备',
  'sync.pairedDevices': '已配对设备',
  'sync.noDevices': '无已连接设备',
  'sync.connected': '已连接',
  'sync.revoke': '取消配对',
  'sync.conflicts': '冲突',
  'sync.pairDevice': '配对新设备',
  'sync.syncNow': '立即同步',
  'sync.generatingQR': '生成二维码...',
  'sync.orEnterPIN': '或在移动端输入 PIN 码',
  'sync.expiresIn': '有效期剩余',
  'sync.expired': '已过期',
  'sync.refreshPIN': '刷新 PIN 码'
}

export default zh
