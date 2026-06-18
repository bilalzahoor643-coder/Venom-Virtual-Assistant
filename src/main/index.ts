import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  globalShortcut,
  screen,
  session,
  safeStorage,
  systemPreferences,
  dialog
} from 'electron'
import path, { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import registerScreenPeeler from './handlers/ScreenPeeler-handler'
import registerPhantomKeyboard from './handlers/PhantomControl-handler'
import registerSecurityVault from './security/Security'
import registerLockSystem from './security/lock-system'
import { autoUpdater } from 'electron-updater'
import { pushVisionToGemini, StartIRIS, stopIRIS, toggleIRISMic } from './agents/iris-ai'
import { getMemory, addMemory } from './hooks/iris-memory'
import {
  connectAdb,
  disconnectAdb,
  executeAdbQuickAction,
  getAdbHistory,
  getAdbNotifications,
  getAdbTelemetry,
  takeAdbScreenshot
} from './mobile/adb-manager'
import registerSystemHandlers from './lib/system'
import registerFrontendIPC from './handler/ui-ipc-bridge'
import { executeDeepResearch } from './services/deep-research'
import { fetchInstalledApps } from './lib/system'
import { getLiveLocation } from './logic/live-location'
import registerAllMissingHandlers from './handler/all-handlers'

app.commandLine.appendSwitch('use-fake-ui-for-media-stream')

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('iris', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('iris')
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let isOverlayMode = false

const secureConfigPath = join(app.getPath('userData'), 'iris_secure_vault.json')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  ipcMain.on('window-min', () => mainWindow?.minimize())
  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.on('window-max', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', (event, commandLine) => {
  if (!event) {
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const url = commandLine.find((arg) => arg.startsWith('iris://'))
    if (url) {
      mainWindow.webContents.send('oauth-callback', url)
    }
  }
})

function toggleOverlayMode() {
  if (!mainWindow) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  if (isOverlayMode) {
    mainWindow.setResizable(true)
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setBounds({ width: 950, height: 670 })
    mainWindow.center()
    mainWindow.webContents.send('overlay-mode', false)
  } else {
    const w = 340
    const h = 70
    mainWindow.setBounds({
      width: w,
      height: h,
      x: Math.floor(width / 2 - w / 2),
      y: height - h - 50
    })
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setResizable(false)
    mainWindow.webContents.send('overlay-mode', true)
  }
  isOverlayMode = !isOverlayMode
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  registerFrontendIPC()

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Found',
      message: `Neural Core Update Found: v${info.version}. Downloading in background...`
    })
  })

  autoUpdater.on('error', (err) => {
    dialog.showErrorBox(
      'Auto-Updater Error',
      err == null ? 'unknown error' : (err.stack || err).toString()
    )
  })

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'New version downloaded! The system will now force reboot to apply the patch.',
        buttons: ['Execute Restart']
      })
      .then(() => {
        setImmediate(() => {
          app.removeAllListeners('window-all-closed')
          autoUpdater.quitAndInstall(false, true)
        })
      })
  })

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = [
      'media',
      'audioCapture',
      'videoCapture',
      'desktopVideoCapture',
      'microphone',
      'camera'
    ]
    if (allowedPermissions.includes(permission)) {
      callback(true)
    } else {
      callback(false)
    }
  })

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowedPermissions = [
      'media',
      'audioCapture',
      'videoCapture',
      'desktopVideoCapture',
      'microphone',
      'camera'
    ]
    return allowedPermissions.includes(permission)
  })

  if (process.platform === 'darwin') {
    if (systemPreferences.getMediaAccessStatus('microphone') !== 'granted') {
      systemPreferences.askForMediaAccess('microphone')
    }
    if (systemPreferences.getMediaAccessStatus('camera') !== 'granted') {
      systemPreferences.askForMediaAccess('camera')
    }
  }

  ipcMain.removeHandler('secure-save-keys')
  ipcMain.removeHandler('secure-get-keys')
  ipcMain.removeHandler('check-keys-exist')

  ipcMain.handle('secure-save-keys', async (_, { groqKey, geminiKey, hfKey, tavilyKey }) => {
    try {
      let groqEncrypted, geminiEncrypted, hfEncrypted, tavilyEncrypted

      if (safeStorage.isEncryptionAvailable()) {
        groqEncrypted = groqKey ? safeStorage.encryptString(groqKey).toString('base64') : ''
        geminiEncrypted = geminiKey ? safeStorage.encryptString(geminiKey).toString('base64') : ''
        hfEncrypted = hfKey ? safeStorage.encryptString(hfKey).toString('base64') : ''
        tavilyEncrypted = tavilyKey ? safeStorage.encryptString(tavilyKey).toString('base64') : ''
      } else {
        groqEncrypted = groqKey ? Buffer.from(groqKey).toString('base64') : ''
        geminiEncrypted = geminiKey ? Buffer.from(geminiKey).toString('base64') : ''
        hfEncrypted = hfKey ? Buffer.from(hfKey).toString('base64') : ''
        tavilyEncrypted = tavilyKey ? Buffer.from(tavilyKey).toString('base64') : ''
      }

      const secureData = {
        groq: groqEncrypted,
        gemini: geminiEncrypted,
        hf: hfEncrypted,
        tavily: tavilyEncrypted
      }

      fs.writeFileSync(secureConfigPath, JSON.stringify(secureData))
      return { success: true }
    } catch (error: any) {
      console.error('[Vault] Save Error:', error.message)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('secure-get-keys', async () => {
    if (!fs.existsSync(secureConfigPath)) return null
    try {
      const data = JSON.parse(fs.readFileSync(secureConfigPath, 'utf8'))
      let groqKey = '',
        geminiKey = '',
        hfKey = '',
        tavilyKey = ''

      if (safeStorage.isEncryptionAvailable()) {
        if (data.groq) groqKey = safeStorage.decryptString(Buffer.from(data.groq, 'base64'))
        if (data.gemini) geminiKey = safeStorage.decryptString(Buffer.from(data.gemini, 'base64'))
        if (data.hf) hfKey = safeStorage.decryptString(Buffer.from(data.hf, 'base64'))
        if (data.tavily) tavilyKey = safeStorage.decryptString(Buffer.from(data.tavily, 'base64'))
      } else {
        if (data.groq) groqKey = Buffer.from(data.groq, 'base64').toString('utf8')
        if (data.gemini) geminiKey = Buffer.from(data.gemini, 'base64').toString('utf8')
        if (data.hf) hfKey = Buffer.from(data.hf, 'base64').toString('utf8')
        if (data.tavily) tavilyKey = Buffer.from(data.tavily, 'base64').toString('utf8')
      }

      return { groqKey, geminiKey, hfKey, tavilyKey }
    } catch (err) {
      console.error('[Vault] Read Error:', err)
      return null
    }
  })

  ipcMain.handle('check-keys-exist', () => {
    return fs.existsSync(secureConfigPath)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders }
    delete responseHeaders['content-security-policy']
    delete responseHeaders['x-content-security-policy']
    delete responseHeaders['access-control-allow-origin']

    callback({
      responseHeaders,
      statusLine: details.statusLine
    })
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (mainWindow && url.startsWith('iris://')) {
      mainWindow.webContents.send('oauth-callback', url)
    }
  })

  ipcMain.on('iris:start-session', (event) => {
    console.log('Starting IRIS...')
    StartIRIS(event)
  })

  ipcMain.on('iris:stop-session', () => {
    console.log('Stopping IRIS...')
    stopIRIS()
  })

  ipcMain.on('iris:toggle-mic', (_event, isMuted: boolean) => {
    console.log(`Toggling Mic... Muted state: ${isMuted}`)
    toggleIRISMic(isMuted)
  })

  ipcMain.handle('iris:get-history', async () => {
    return await getMemory()
  })

  ipcMain.handle('adb-get-history', async () => {
    return await getAdbHistory()
  })

  ipcMain.on('iris:send-vision-frame', (_event, base64Data: string) => {
    pushVisionToGemini(base64Data)
  })

  registerSystemHandlers(ipcMain)

  ipcMain.removeHandler('get-running-apps')
  ipcMain.handle('get-running-apps', async () => {
    return await fetchInstalledApps()
  })

  ipcMain.removeHandler('get-live-location')
  ipcMain.handle('get-live-location', async () => {
    return await getLiveLocation()
  })

  ipcMain.removeHandler('get-history')
  ipcMain.handle('get-history', async () => {
    return await getMemory()
  })

  ipcMain.removeHandler('add-message')
  ipcMain.handle('add-message', async (_event, { role, text }) => {
    await addMemory(role, text)
    return { success: true }
  })

  ipcMain.handle('trigger-deep-research', async (event, { query }) => {
    return await executeDeepResearch({ query })
  })

  ipcMain.handle('adb-connect', async (_, args) => {
    return await connectAdb({ ip: args.ip, port: args.port })
  })

  ipcMain.handle('adb-disconnect', async () => {
    return await disconnectAdb()
  })

  ipcMain.handle('adb-telemetry', async () => {
    return await getAdbTelemetry()
  })

  ipcMain.handle('adb-quick-action', async (_, args) => {
    return await executeAdbQuickAction(args.action)
  })

  ipcMain.handle('adb-screenshot', async () => {
    return await takeAdbScreenshot()
  })

  ipcMain.handle('adb-get-notifications', async () => {
    return await getAdbNotifications()
  })

  registerLockSystem()
  registerSecurityVault()
  registerPhantomKeyboard()
  registerScreenPeeler()
  registerAllMissingHandlers()

  ipcMain.handle('get-screen-source', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    return sources[0]?.id
  })

  createWindow()

  globalShortcut.register('CommandOrControl+Shift+I', () => toggleOverlayMode())
  ipcMain.on('toggle-overlay', () => toggleOverlayMode())

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
