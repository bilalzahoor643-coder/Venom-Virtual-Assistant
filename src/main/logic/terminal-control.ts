import { BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import path from 'path'

const sanitizePath = (inputPath: string) => {
  let clean = path.normalize(inputPath)
  if (clean.endsWith(path.sep)) clean = clean.slice(0, -1)
  return clean
}

export async function runShellCommand({
  command,
  cwd
}: {
  command: string
  cwd?: string
}): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const safeCwd = cwd ? sanitizePath(cwd) : undefined

    const win = BrowserWindow.getAllWindows()[0]

    const child = spawn('powershell.exe', ['-Command', command], {
      cwd: safeCwd,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    child.stdout.on('data', (data) => {
      const output = data.toString()
      if (win && !win.isDestroyed()) win.webContents.send('terminal-data', output)
    })

    child.stderr.on('data', (data) => {
      const output = data.toString()
      if (win && !win.isDestroyed())
        win.webContents.send('terminal-data', `\x1b[31m${output}\x1b[0m`)
    })

    child.on('close', (code) => {
      const msg = `\r\n[Process exited with code ${code}]\r\n`
      if (win && !win.isDestroyed()) win.webContents.send('terminal-data', msg)
      resolve({ success: code === 0, output: `Completed with code ${code}` })
    })

    child.on('error', (err) => {
      if (win && !win.isDestroyed()) win.webContents.send('terminal-data', `Error: ${err.message}`)
      resolve({ success: false, output: err.message })
    })
  })
}
