const en = {
  // App
  'app.name': 'INote',
  'app.description': 'A local-first note-taking & file management app',
  'app.opening': 'Opening...',

  // Workspace
  'workspace.open': 'Open Workspace',
  'workspace.recent': 'Recent Workspaces',

  // Sidebar
  'sidebar.explorer': 'Explorer',
  'sidebar.search': 'Search',
  'sidebar.tags': 'Tags',
  'sidebar.git': 'Git',

  // Status bar
  'status.unsaved': 'Unsaved',
  'status.saved': 'Saved',
  'status.words': 'words',
  'status.lines': 'lines',

  // File tree
  'fileTree.title': 'Explorer',
  'fileTree.empty': 'No files in workspace',
  'fileTree.newFilePlaceholder': 'file name...',
  'fileTree.newFolderPlaceholder': 'folder name...',
  'fileTree.contextMenu.newFile': 'New File',
  'fileTree.contextMenu.newFolder': 'New Folder',
  'fileTree.contextMenu.rename': 'Rename',
  'fileTree.contextMenu.copy': 'Copy',
  'fileTree.contextMenu.cut': 'Cut',
  'fileTree.contextMenu.delete': 'Delete',
  'fileTree.contextMenu.paste': 'Paste',
  'fileTree.deleteConfirm': 'Are you sure you want to delete "{name}"?',

  // Editor
  'editor.emptyTitle': 'Select a file to start editing',
  'editor.emptySubtitle': 'Or create a new file from the explorer',
  'editor.closeTab': 'Close tab',
  'editor.togglePreview': 'Toggle preview',
  'editor.showPreview': 'Show Preview',
  'editor.hidePreview': 'Hide Preview',
  'editor.history': 'History',
  'editor.toggleHistory': 'Toggle version history',

  // Search
  'search.title': 'Search',
  'search.placeholder': 'Search in files...',
  'search.searching': 'Searching...',
  'search.noResults': 'No results found',

  // Tags
  'tags.title': 'Tags',
  'tags.clearFilter': 'Clear filter',
  'tags.empty': 'No tags found',
  'tags.notesTagged': 'Notes tagged "{tag}"',

  // Version
  'version.title': 'Versions',
  'version.empty': 'No versions saved yet',
  'version.save': 'Save',
  'version.saving': 'Saving...',
  'version.descriptionPlaceholder': 'Version description...',
  'version.restore': 'Restore',
  'version.restoreConfirm': 'Restore this version? Current content will be overwritten.',
  'version.preview': 'Preview',
  'version.selectToPreview': 'Select a version to preview',
  'version.loading': 'Loading...',

  // Time
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.daysAgo': '{n}d ago',
  'time.weeksAgo': '{n}w ago',
  'time.monthsAgo': '{n}mo ago',

  // Settings
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.system': 'System',

  // Sync
  'sidebar.sync': 'Sync',
  'sync.title': 'Sync',
  'sync.on': 'On',
  'sync.off': 'Off',
  'sync.statusLabel': 'Status',
  'sync.status.idle': 'Idle',
  'sync.status.discovering': 'Discovering',
  'sync.status.connecting': 'Connecting',
  'sync.status.syncing': 'Syncing',
  'sync.status.error': 'Error',
  'sync.lastSync': 'Last synced',
  'sync.never': 'Never',
  'sync.connectedDevices': 'Connected Devices',
  'sync.pairedDevices': 'Paired Devices',
  'sync.noDevices': 'No devices connected',
  'sync.connected': 'Connected',
  'sync.revoke': 'Revoke',
  'sync.conflicts': 'Conflicts',
  'sync.pairDevice': 'Pair New Device',
  'sync.syncNow': 'Sync Now',
  'sync.generatingQR': 'Generating QR...',
  'sync.orEnterPIN': 'Or enter PIN on mobile',
  'sync.expiresIn': 'Expires in',
  'sync.expired': 'Expired',
  'sync.refreshPIN': 'Refresh PIN'
} as const

export type TranslationKey = keyof typeof en
export default en
