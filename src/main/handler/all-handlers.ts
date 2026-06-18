import { ipcMain, shell, BrowserWindow } from 'electron'
import { openApp, closeApp } from '../logic/app-launcher'
import { executeGhostSequence, ghostClickCoordinate, ghostScroll, getScreenSize, setVolume, takeScreenshot, copyFileToClipboard } from '../logic/ghost-control'
import { runShellCommand } from '../logic/terminal-control'
import { hackWebsite } from '../logic/reality-hacker'
import { readFile } from '../manager/file-read'
import { writeFile } from '../manager/file-write'
import { executeFileOp } from '../manager/file-ops'
import { openFile, revealFile, openFileInApp } from '../manager/file-open'
import { readDirectory } from '../manager/dir-load'
import { indexFolder, searchFiles, simpleFileSearch } from '../manager/file-search'
import { saveCoreMemory, searchCoreMemory } from '../manager/permanent-memory'
import { openWormhole, closeWormhole } from '../services/wormhole'
import { createWidget, closeAllWidgets } from '../auto/widget-manager'
import { loadWorkflows, saveWorkflow, deleteWorkflow } from '../workflow/workflow-manager'
import {
  openAdbApp,
  closeAdbApp,
  tapAdb,
  swipeAdb,
  getMobileInfoAi,
  pushFileToAdb,
  pullFileFromAdb,
  toggleAdbHardware
} from '../mobile/adb-manager'
import {
  getFileProperties,
  getFolderInfo,
  fileExists,
  renameFile,
  getRecentFiles,
  getFileTypeInfo,
  findDuplicateFiles,
  openInIRISViewer
} from '../manager/file-management-enhanced'
import os from 'os'
import path from 'path'

function resolveSystemPath(inputPath: string): string {
  const home = os.homedir()
  const lower = inputPath.toLowerCase().trim()

  const systemFolders: Record<string, string> = {
    'desktop': path.join(home, 'Desktop'),
    'documents': path.join(home, 'Documents'),
    'downloads': path.join(home, 'Downloads'),
    'music': path.join(home, 'Music'),
    'pictures': path.join(home, 'Pictures'),
    'videos': path.join(home, 'Videos'),
    'home': home,
    '~': home
  }

  if (systemFolders[lower]) return systemFolders[lower]

  let resolved = inputPath

  for (const [name, fullPath] of Object.entries(systemFolders)) {
    if (resolved.toLowerCase().startsWith(name + '/') || resolved.toLowerCase().startsWith(name + '\\')) {
      resolved = resolved.substring(name.length)
      resolved = fullPath + resolved
      break
    }
  }

  if (/^[a-zA-Z]:$/.test(resolved.trim())) {
    return `${resolved.trim().charAt(0).toUpperCase()}:\\`
  }

  if (!path.isAbsolute(resolved)) {
    return path.join(home, resolved)
  }

  return resolved
}

export default function registerAllMissingHandlers() {
  const safe = (name: string, handler: (...args: any[]) => any) => {
    ipcMain.removeHandler(name)
    ipcMain.handle(name, handler)
  }

  safe('open-app', async (_, appName: string) => await openApp(appName))
  safe('close-app', async (_, appName: string) => await closeApp(appName))

  safe('ghost-sequence', async (_, actions: any[]) => await executeGhostSequence(actions))
  safe('ghost-click-coordinate', async (_, coords: { x: number; y: number; doubleClick?: boolean }) => await ghostClickCoordinate(coords))
  safe('ghost-scroll', async (_, opts: { direction: 'up' | 'down'; amount?: number }) => await ghostScroll(opts))

  safe('set-volume', async (_, level: number) => await setVolume(level))
  safe('take-screenshot', async () => await takeScreenshot())
  safe('get-screen-size', async () => await getScreenSize())

  safe('read-file', async (_, filePath: string) => await readFile(filePath))
  safe('write-file', async (_, args: { fileName: string; content: string }) => await writeFile(args))
  safe('file-ops', async (_, args: { operation: string; sourcePath: string; destPath?: string }) => await executeFileOp(args as any))
  safe('file:open', async (_, filePath: string) => await openFile(filePath))
  safe('file:reveal', async (_, filePath: string) => await revealFile(filePath))
  safe('file:open-in-app', async (_, { filePath, appName }: { filePath: string; appName: string }) => await openFileInApp(filePath, appName))
  safe('file:open-in-iris', async (_, filePath: string) => await openInIRISViewer(filePath))
  safe('read-directory', async (_, dirPath: string) => await readDirectory(dirPath))
  safe('create-directory', async (_, dirPath: string) => {
    const fs = await import('fs/promises')
    const resolved = resolveSystemPath(dirPath)
    await fs.mkdir(resolved, { recursive: true })
    return { success: true, path: resolved }
  })

  // Enhanced file management
  safe('get-file-properties', async (_, filePath: string) => await getFileProperties(filePath))
  safe('get-folder-info', async (_, folderPath: string) => await getFolderInfo(folderPath))
  safe('file-exists', async (_, filePath: string) => await fileExists(filePath))
  safe('rename-file', async (_, { oldPath, newName }: { oldPath: string; newName: string }) => await renameFile(oldPath, newName))
  safe('get-recent-files', async (_, { dirPath, count }: { dirPath: string; count?: number }) => await getRecentFiles(dirPath, count))
  safe('get-file-type', async (_, filePath: string) => await getFileTypeInfo(filePath))
  safe('find-duplicates', async (_, folderPath: string) => await findDuplicateFiles(folderPath))

  safe('index-folder', async (_, folderPath: string) => await indexFolder(folderPath))
  safe('search-files', async (_, args: { query: string; groqKey: string }) => await searchFiles(args))
  safe('simple-file-search', async (_, args: { query: string; searchDir?: string }) => await simpleFileSearch(args.query, args.searchDir))

  safe('save-core-memory', async (_, fact: string) => await saveCoreMemory(fact))
  safe('search-core-memory', async () => await searchCoreMemory())

  safe('hack-website', async (_, args: { url: string; mode: string; customText?: boolean }) => await hackWebsite(args))
  safe('build-animated-website', async () => 'Website build complete.')

  safe('open-wormhole', async (_, port: number) => await openWormhole(port))
  safe('close-wormhole', async () => await closeWormhole())

  safe('create-widget', async (_, args: { htmlCode: string; width: number; height: number }) => await createWidget(args))
  safe('close-widgets', async () => await closeAllWidgets())

  safe('load-workflows', async () => await loadWorkflows())
  safe('save-workflow', async (_, args: any) => await saveWorkflow(args))
  safe('delete-workflow', async (_, args: { name: string }) => await deleteWorkflow(args.name))

  safe('run-shell-command', async (_, args: { command: string; cwd?: string }) => await runShellCommand(args))

  safe('execute-deep-research', async (_, { query, tavilyKey, groqKey }) => {
    const { executeDeepResearch } = await import('../services/deep-research')
    return await executeDeepResearch({ query })
  })

  safe('copy-file-to-clipboard', async (_, filePath: string) => await copyFileToClipboard(filePath))

  safe('check-vault-status', async () => ({ faceCount: 0 }))
  safe('get-app-version', async () => '1.5.1')

  safe('google-search', async (_, query: string) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    shell.openExternal(url)
    return { success: true, url }
  })

  // ADB mobile handlers
  safe('adb-open-app', async (_, { packageName }: { packageName: string }) => await openAdbApp(packageName))
  safe('adb-close-app', async (_, { packageName }: { packageName: string }) => await closeAdbApp(packageName))
  safe('adb-tap', async (_, { xPercent, yPercent }: { xPercent: number; yPercent: number }) => await tapAdb({ xPercent, yPercent }))
  safe('adb-swipe', async (_, { direction }: { direction: 'up' | 'down' | 'left' | 'right' }) => await swipeAdb(direction))
  safe('adb-push-file', async (_, { sourcePath, destPath }: { sourcePath: string; destPath?: string }) => await pushFileToAdb({ sourcePath, destPath }))
  safe('adb-pull-file', async (_, { sourcePath, destPath }: { sourcePath: string; destPath?: string }) => await pullFileFromAdb({ sourcePath, destPath }))
  safe('adb-hardware-toggle', async (_, { setting, state }: { setting: string; state: boolean }) => await toggleAdbHardware({ setting, state }))
  safe('get-mobile-info-ai', async () => await getMobileInfoAi())

  // Teleport windows (ghost control)
  safe('teleport-windows', async (_, commands: any[]) => {
    return await executeGhostSequence(commands)
  })

  // Open file in VS Code
  safe('open-in-vscode', async (_, filePath: string) => {
    try {
      shell.openExternal(`vscode://file/${filePath}`)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // Gmail handlers
  safe('gmail-read', async (_, maxResults: number = 5) => {
    const { readGmails } = await import('../services/gmail-service')
    return await readGmails(maxResults)
  })
  safe('gmail-send', async (_, { to, subject, body }: { to: string; subject: string; body: string }) => {
    const { sendGmail } = await import('../services/gmail-service')
    return await sendGmail({ to, subject, body })
  })
  safe('gmail-draft', async (_, { to, subject, body }: { to: string; subject: string; body: string }) => {
    const { draftGmail } = await import('../services/gmail-service')
    return await draftGmail({ to, subject, body })
  })
  safe('gmail-get-auth-url', async () => {
    const { getGmailAuthUrl } = await import('../services/gmail-service')
    return await getGmailAuthUrl()
  })
  safe('gmail-handle-callback', async (_, code: string) => {
    const { handleGmailCallback } = await import('../services/gmail-service')
    return await handleGmailCallback(code)
  })
  safe('gmail-save-credentials', async (_, credentials: any) => {
    const { saveGmailCredentials } = await import('../services/gmail-service')
    return await saveGmailCredentials(credentials)
  })
  safe('gmail-check-status', async () => {
    const { isGmailConnected } = await import('../services/gmail-service')
    return { connected: await isGmailConnected() }
  })

  // RAG Oracle handlers
  safe('ingest-codebase', async (_, { dirPath, geminiKey }: { dirPath: string; geminiKey: string }) => {
    const { ingestCodebase } = await import('../services/rag-oracle-service')
    const win = BrowserWindow.getAllWindows()[0]
    return await ingestCodebase({ dirPath, geminiKey, win })
  })
  safe('consult-oracle', async (_, { query, geminiKey, groqKey }: { query: string; geminiKey: string; groqKey: string }) => {
    const { consultOracle } = await import('../services/rag-oracle-service')
    return await consultOracle({ query, geminiKey, groqKey })
  })
  safe('cancel-ingestion', async () => {
    const { cancelIngestion } = await import('../services/rag-oracle-service')
    cancelIngestion()
    return { success: true }
  })

  console.log('[IRIS] All missing IPC handlers registered.')
}
