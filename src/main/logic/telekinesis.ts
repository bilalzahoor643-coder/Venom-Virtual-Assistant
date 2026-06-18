import { screen } from 'electron'

let windowManager: any = null

try {
  const nwm = require('node-window-manager')
  windowManager = nwm.windowManager
} catch (e) {
  console.warn('[IRIS] node-window-manager not available')
}

export interface TeleportCommand {
  appName: string
  position:
    | 'left'
    | 'right'
    | 'top-left'
    | 'bottom-left'
    | 'top-right'
    | 'bottom-right'
    | 'maximize'
    | 'center'
}

export async function teleportWindows(commands: TeleportCommand[]) {
  try {
    if (!windowManager) {
      return { success: false, error: 'Window manager not available (node-window-manager not compiled)' }
    }

    windowManager.requestAccessibility()

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height, x: screenX, y: screenY } = primaryDisplay.workArea

    const openWindows = windowManager.getWindows()

    for (const cmd of commands) {
      const validWindows = openWindows.filter(
        (w) =>
          w.isWindow() &&
          w.isVisible() &&
          w.getTitle() !== '' &&
          (w.getTitle().toLowerCase().includes(cmd.appName.toLowerCase()) ||
            w.path.toLowerCase().includes(cmd.appName.toLowerCase()))
      )

      const targetWindow = validWindows[0]

      if (targetWindow) {
        targetWindow.restore()
        targetWindow.bringToTop()

        const halfW = Math.floor(width / 2)
        const halfH = Math.floor(height / 2)

        let newBounds = { x: screenX, y: screenY, width, height }

        switch (cmd.position) {
          case 'left':
            newBounds = { x: screenX, y: screenY, width: halfW, height }
            break
          case 'right':
            newBounds = { x: screenX + halfW, y: screenY, width: halfW, height }
            break
          case 'top-left':
            newBounds = { x: screenX, y: screenY, width: halfW, height: halfH }
            break
          case 'bottom-left':
            newBounds = { x: screenX, y: screenY + halfH, width: halfW, height: halfH }
            break
          case 'top-right':
            newBounds = { x: screenX + halfW, y: screenY, width: halfW, height: halfH }
            break
          case 'bottom-right':
            newBounds = { x: screenX + halfW, y: screenY + halfH, width: halfW, height: halfH }
            break
          case 'maximize':
            targetWindow.maximize()
            continue
        }

        targetWindow.setBounds(newBounds)
      }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
