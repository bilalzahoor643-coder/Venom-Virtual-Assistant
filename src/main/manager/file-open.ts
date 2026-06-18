import { shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

interface OpenResult {
  success: boolean
  error?: string
  errorCode?: string
  resolvedPath?: string
}

function sanitizePath(inputPath: string): string {
  let cleaned = inputPath.trim()
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, '')
  cleaned = cleaned.replace(/\n/g, '').replace(/\r/g, '')
  return cleaned
}

function resolveSystemPath(inputPath: string): string {
  const sanitized = sanitizePath(inputPath)
  const home = os.homedir()
  const lower = sanitized.toLowerCase()

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

  let resolved = sanitized

  for (const [name, fullPath] of Object.entries(systemFolders)) {
    if (resolved.toLowerCase().startsWith(name + '/') || resolved.toLowerCase().startsWith(name + '\\')) {
      resolved = fullPath + resolved.substring(name.length)
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

export async function openFile(filePath: string): Promise<OpenResult> {
  const resolvedPath = resolveSystemPath(filePath)
  try {
    const error = await shell.openPath(resolvedPath)
    if (error) {
      return { success: false, error: `Failed to open: ${error}. Resolved: ${resolvedPath}`, errorCode: 'EOPEN', resolvedPath }
    }
    return { success: true, resolvedPath }
  } catch (e: any) {
    return { success: false, error: `Error opening '${filePath}': ${e.message}. Resolved: ${resolvedPath}`, errorCode: e.code || 'UNKNOWN', resolvedPath }
  }
}

export async function revealFile(filePath: string): Promise<OpenResult> {
  const resolvedPath = resolveSystemPath(filePath)
  try {
    shell.showItemInFolder(resolvedPath)
    return { success: true, resolvedPath }
  } catch (e: any) {
    return { success: false, error: `Failed to reveal: ${e.message}. Resolved: ${resolvedPath}`, errorCode: e.code || 'UNKNOWN', resolvedPath }
  }
}

export async function openFileInApp(filePath: string, appName: string): Promise<OpenResult> {
  const resolvedPath = resolveSystemPath(filePath)
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    let cmd = ''
    switch (appName.toLowerCase()) {
      case 'vscode':
      case 'vs code':
      case 'visual studio code':
        cmd = `code "${resolvedPath}"`
        break
      case 'notepad':
        cmd = `notepad "${resolvedPath}"`
        break
      case 'notepad++':
      case 'notepadplusplus':
        cmd = `notepad++ "${resolvedPath}"`
        break
      case 'sublime':
      case 'sublime text':
        cmd = `subl "${resolvedPath}"`
        break
      default:
        await shell.openPath(resolvedPath)
        return { success: true, resolvedPath }
    }

    try {
      await execAsync(cmd)
      return { success: true, resolvedPath }
    } catch {
      await shell.openPath(resolvedPath)
      return { success: true, resolvedPath }
    }
  } catch (e: any) {
    return { success: false, error: `Error: ${e.message}. Resolved: ${resolvedPath}`, errorCode: e.code || 'UNKNOWN', resolvedPath }
  }
}
