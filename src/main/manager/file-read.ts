import fs from 'fs/promises'
import path from 'path'
import os from 'os'

interface FileReadResult {
  success: boolean
  content?: string
  error?: string
  errorCode?: string
  resolvedPath?: string
  truncated?: boolean
  totalLength?: number
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

export async function readFile(filePath: string): Promise<FileReadResult | string> {
  const resolvedPath = resolveSystemPath(filePath)

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8')
    const truncated = content.length > 5000
    const displayContent = truncated ? content.slice(0, 5000) + '\n\n...(Truncated at 5000 chars)' : content

    return {
      success: true,
      content: displayContent,
      resolvedPath,
      truncated,
      totalLength: content.length
    }
  } catch (err: any) {
    const code = err.code || 'UNKNOWN'
    let message = ''

    if (code === 'EISDIR') {
      message = `'${filePath}' is a directory. Use read_directory to browse it. Resolved: ${resolvedPath}`
    } else if (code === 'ENOENT') {
      message = `File not found: '${filePath}'. Resolved: ${resolvedPath}`
    } else if (code === 'EACCES' || code === 'EPERM') {
      message = `Permission denied: '${filePath}'. Resolved: ${resolvedPath}`
    } else if (code === 'EBUSY') {
      message = `File is locked: '${filePath}'. Close it first. Resolved: ${resolvedPath}`
    } else {
      message = `Error reading '${filePath}': ${err.message}. Resolved: ${resolvedPath}`
    }

    return { success: false, error: message, errorCode: code, resolvedPath }
  }
}
