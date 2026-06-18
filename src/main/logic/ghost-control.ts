import { app, shell, clipboard, screen } from 'electron'
import path from 'path'
import { exec } from 'child_process'

let keyboard: any = null
let Key: any = null
let mouse: any = null
let Point: any = null
let Button: any = null
let screenshot: any = null
let loudness: any = null

try {
  const nutjs = require('@nut-tree-fork/nut-js')
  keyboard = nutjs.keyboard
  Key = nutjs.Key
  mouse = nutjs.mouse
  Point = nutjs.Point
  Button = nutjs.Button
  keyboard.config.autoDelayMs = 20
} catch (e) {
  console.warn('[IRIS] nut-js not available, using PowerShell fallbacks')
}

try {
  screenshot = require('screenshot-desktop')
} catch (e) {
  console.warn('[IRIS] screenshot-desktop not available, using PowerShell fallback')
}

try {
  loudness = require('loudness')
} catch (e) {
  console.warn('[IRIS] loudness not available, using PowerShell fallback')
}

const KEY_MAP: Record<string, any> = {
  enter: Key?.Enter || '{ENTER}',
  return: Key?.Enter || '{ENTER}',
  space: Key?.Space || '{SPACE}',
  tab: Key?.Tab || '{TAB}',
  escape: Key?.Escape || '{ESC}',
  esc: Key?.Escape || '{ESC}',
  backspace: Key?.Backspace || '{BACKSPACE}',
  shift: Key?.LeftShift || '+',
  control: Key?.LeftControl || '^',
  ctrl: Key?.LeftControl || '^',
  alt: Key?.LeftAlt || '%',
  command: Key?.LeftSuper || '',
  win: Key?.LeftSuper || '',
  up: Key?.Up || '{UP}',
  down: Key?.Down || '{DOWN}',
  left: Key?.Left || '{LEFT}',
  right: Key?.Right || '{RIGHT}',
  pageup: Key?.PageUp || '{PGUP}',
  pagedown: Key?.PageDown || '{PGDN}',
  a: Key?.A || 'a',
  b: Key?.B || 'b',
  c: Key?.C || 'c',
  d: Key?.D || 'd',
  e: Key?.E || 'e',
  f: Key?.F || 'f',
  g: Key?.G || 'g',
  h: Key?.H || 'h',
  i: Key?.I || 'i',
  j: Key?.J || 'j',
  k: Key?.K || 'k',
  l: Key?.L || 'l',
  m: Key?.M || 'm',
  n: Key?.N || 'n',
  o: Key?.O || 'o',
  p: Key?.P || 'p',
  q: Key?.Q || 'q',
  r: Key?.R || 'r',
  s: Key?.S || 's',
  t: Key?.T || 't',
  u: Key?.U || 'u',
  v: Key?.V || 'v',
  w: Key?.W || 'w',
  x: Key?.X || 'x',
  y: Key?.Y || 'y',
  z: Key?.Z || 'z',
  f1: Key?.F1 || '{F1}',
  f5: Key?.F5 || '{F5}',
  f11: Key?.F11 || '{F11}',
  f12: Key?.F12 || '{F12}'
}

function generateHumanPath(start: any, end: any): any[] {
  if (!Point) return [end]

  const steps = 25
  const pathArray: any[] = []

  const directionX = end.x > start.x ? 1 : -1
  const directionY = end.y > start.y ? 1 : -1
  const deviation = Math.random() * 80 + 20

  const controlPoint = new Point(
    start.x +
      (Math.abs(end.x - start.x) / 2) * directionX +
      (Math.random() < 0.5 ? -deviation : deviation),
    start.y +
      (Math.abs(end.y - start.y) / 2) * directionY +
      (Math.random() < 0.5 ? -deviation : deviation)
  )

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlPoint.x + t * t * end.x
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlPoint.y + t * t * end.y
    pathArray.push(new Point(x, y))
  }
  return pathArray
}

export async function copyFileToClipboard(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = `powershell -command "Set-Clipboard -Path '${filePath}'"`
    exec(cmd, (error) => {
      if (error) {
        resolve(false)
      } else resolve(true)
    })
  })
}

export async function executeGhostSequence(actions: any[]): Promise<boolean> {
  try {
    if (keyboard && Key && mouse) {
      for (const action of actions) {
        if (action.type === 'paste') {
          clipboard.writeText(action.text)
          await new Promise((r) => setTimeout(r, 200))
          await keyboard.pressKey(Key.LeftControl, Key.V)
          await keyboard.releaseKey(Key.V, Key.LeftControl)
        } else if (action.type === 'wait') {
          await new Promise((r) => setTimeout(r, action.ms || 500))
        } else if (action.type === 'type') {
          await keyboard.type(action.text)
        } else if (action.type === 'press') {
          const k = KEY_MAP[action.key.toLowerCase()]
          if (k !== undefined) {
            if (action.modifiers) {
              const mods = action.modifiers.map((m: any) => KEY_MAP[m.toLowerCase()]).filter(Boolean)
              for (const mod of mods) await keyboard.pressKey(mod)
              await keyboard.pressKey(k)
              await keyboard.releaseKey(k)
              for (const mod of mods.reverse()) await keyboard.releaseKey(mod)
            } else {
              await keyboard.pressKey(k)
              await keyboard.releaseKey(k)
            }
          }
        } else if (action.type === 'click') {
          await mouse.leftClick()
        }
      }
    } else {
      // PowerShell fallback
      const { exec } = require('child_process')
      for (const action of actions) {
        if (action.type === 'type') {
          const escapedText = action.text.replace(/'/g, "''")
          await new Promise<void>((resolve) => {
            exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`, () => resolve())
          })
        } else if (action.type === 'press') {
          const psKey = action.key === 'enter' ? '{ENTER}' : action.key === 'space' ? '{SPACE}' : action.key.toUpperCase()
          await new Promise<void>((resolve) => {
            exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::Send('${psKey}')"`, () => resolve())
          })
        } else if (action.type === 'wait') {
          await new Promise<void>((r) => setTimeout(r, action.ms || 500))
        }
      }
    }
    return true
  } catch (e) {
    return false
  }
}

export async function ghostClickCoordinate({
  x,
  y,
  doubleClick
}: {
  x: number
  y: number
  doubleClick?: boolean
}): Promise<boolean> {
  try {
    if (mouse && Point) {
      const primaryDisplay = screen.getPrimaryDisplay()
      const scaleFactor = primaryDisplay.scaleFactor

      const logicalX = Math.round(x / scaleFactor)
      const logicalY = Math.round(y / scaleFactor)

      const startPoint = await mouse.getPosition()
      const endPoint = new Point(logicalX, logicalY)

      const pathPoints = generateHumanPath(startPoint, endPoint)
      await mouse.move(pathPoints)

      if (doubleClick) await mouse.doubleClick(Button.LEFT)
      else await mouse.leftClick()
    } else {
      // PowerShell fallback
      const { exec } = require('child_process')
      const primaryDisplay = screen.getPrimaryDisplay()
      const scaleFactor = primaryDisplay.scaleFactor
      const logicalX = Math.round(x / scaleFactor)
      const logicalY = Math.round(y / scaleFactor)

      await new Promise<void>((resolve) => {
        exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${logicalX}, ${logicalY})"`, () => resolve())
      })

      if (doubleClick) {
        await new Promise<void>((resolve) => {
          exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"`, () => resolve())
        })
      }
    }
    return true
  } catch (e) {
    return false
  }
}

export async function ghostScroll({
  direction,
  amount
}: {
  direction: 'up' | 'down'
  amount?: number
}): Promise<boolean> {
  try {
    if (mouse) {
      const scrollAmount = amount || 500
      if (direction === 'up') await mouse.scrollUp(scrollAmount)
      else await mouse.scrollDown(scrollAmount)
    } else {
      // PowerShell fallback
      const { exec } = require('child_process')
      const scrollKey = direction === 'up' ? '{PGUP}' : '{PGDN}'
      await new Promise<void>((resolve) => {
        exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::Send('${scrollKey}')"`, () => resolve())
      })
    }
    return true
  } catch (e) {
    return false
  }
}

export async function getScreenSize(): Promise<{ width: number; height: number }> {
  const primaryDisplay = screen.getPrimaryDisplay()
  return {
    width: primaryDisplay.size.width * primaryDisplay.scaleFactor,
    height: primaryDisplay.size.height * primaryDisplay.scaleFactor
  }
}

export async function setVolume(level: number): Promise<string> {
  try {
    if (loudness) {
      await loudness.setVolume(level)
      return `Volume ${level}%`
    } else {
      // PowerShell fallback
      const { exec } = require('child_process')
      await new Promise<void>((resolve) => {
        exec(`powershell -command "$wsh = New-Object -ComObject WScript.Shell; 1..50 | ForEach-Object { $wsh.SendKeys([char]174) }; 1..${Math.floor(level / 2)} | ForEach-Object { $wsh.SendKeys([char]175) }"`, () => resolve())
      })
      return `Volume set to ~${level}%`
    }
  } catch (e) {
    return 'Error setting volume'
  }
}

export async function takeScreenshot(): Promise<string> {
  try {
    if (screenshot) {
      const filename = `IRIS_Capture_${Date.now()}.png`
      const savePath = path.join(app.getPath('pictures'), filename)
      await screenshot({ filename: savePath })
      shell.showItemInFolder(savePath)
      return `Screenshot saved.`
    } else {
      // PowerShell fallback
      const { exec } = require('child_process')
      const filename = `IRIS_Capture_${Date.now()}.png`
      const savePath = path.join(app.getPath('pictures'), filename)
      await new Promise<void>((resolve) => {
        exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; \\$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; \\$bitmap = New-Object System.Drawing.Bitmap(\\$screen.Width, \\$screen.Height); \\$graphics = [System.Drawing.Graphics]::FromImage(\\$bitmap); \\$graphics.CopyFromScreen(\\$screen.Location, [System.Drawing.Point]::Empty, \\$screen.Size); \\$bitmap.Save('${savePath.replace(/\\/g, '\\\\')}'); \\$graphics.Dispose(); \\$bitmap.Dispose()"`, () => resolve())
      })
      shell.showItemInFolder(savePath)
      return `Screenshot saved.`
    }
  } catch (e) {
    return 'Error taking screenshot'
  }
}
