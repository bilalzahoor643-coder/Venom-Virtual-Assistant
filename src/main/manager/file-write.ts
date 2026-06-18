import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

interface FileWriteResult {
  success: boolean
  path?: string
  resolvedPath?: string
  error?: string
  errorCode?: string
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

export async function writeFile({
  fileName,
  content
}: {
  fileName: string
  content: string
}): Promise<FileWriteResult | string> {
  const targetPath = resolveSystemPath(fileName)

  try {
    const dirPath = path.dirname(targetPath)
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }

    await fs.writeFile(targetPath, content, 'utf-8')

    return { success: true, path: targetPath, resolvedPath: targetPath }
  } catch (err: any) {
    const code = err.code || 'UNKNOWN'
    let message = `Error writing '${fileName}'. Resolved: ${targetPath}`

    if (code === 'EACCES' || code === 'EPERM') {
      message = `Permission denied writing '${fileName}'. Resolved: ${targetPath}`
    } else if (code === 'ENOSPC') {
      message = `Disk full. Cannot write '${fileName}'. Resolved: ${targetPath}`
    } else if (code === 'ENOENT') {
      message = `Path not found: '${fileName}'. Resolved: ${targetPath}`
    }

    return { success: false, error: message, errorCode: code, resolvedPath: targetPath }
  }
}
