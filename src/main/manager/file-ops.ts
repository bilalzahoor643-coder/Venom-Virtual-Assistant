import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface FileOpArgs {
  operation: 'copy' | 'move' | 'delete'
  sourcePath: string
  destPath?: string
}

interface FileOpResult {
  success: boolean
  message?: string
  error?: string
  errorCode?: string
  resolvedSource?: string
  resolvedDest?: string
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

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

async function removeDirRecursive(dirPath: string): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      await removeDirRecursive(fullPath)
    } else {
      await fs.unlink(fullPath)
    }
  }
  await fs.rmdir(dirPath)
}

export async function executeFileOp({
  operation,
  sourcePath,
  destPath
}: FileOpArgs): Promise<FileOpResult | string> {
  const resolvedSource = resolveSystemPath(sourcePath)
  const resolvedDest = destPath ? resolveSystemPath(destPath) : undefined

  try {
    switch (operation) {
      case 'copy': {
        if (!destPath) return { success: false, error: 'Destination required for copy.', errorCode: 'EDEST', resolvedSource }

        const srcStat = await fs.stat(resolvedSource)
        if (srcStat.isDirectory()) {
          await copyDirRecursive(resolvedSource, resolvedDest!)
        } else {
          const destDir = path.dirname(resolvedDest!)
          try { await fs.access(destDir) } catch { await fs.mkdir(destDir, { recursive: true }) }
          await fs.copyFile(resolvedSource, resolvedDest!)
        }
        return { success: true, message: `Copied to ${resolvedDest}`, resolvedSource, resolvedDest }
      }

      case 'move': {
        if (!destPath) return { success: false, error: 'Destination required for move.', errorCode: 'EDEST', resolvedSource }

        try {
          const srcDir = path.parse(resolvedSource).root
          const destDir = path.parse(resolvedDest!).root

          if (srcDir !== destDir) {
            throw new Error('EXDEV')
          }

          await fs.rename(resolvedSource, resolvedDest!)
        } catch (renameErr: any) {
          if (renameErr.code === 'EXDEV' || renameErr.message === 'EXDEV' || renameErr.code === 'EISDIR') {
            const srcStat = await fs.stat(resolvedSource)
            if (srcStat.isDirectory()) {
              await copyDirRecursive(resolvedSource, resolvedDest!)
              await removeDirRecursive(resolvedSource)
            } else {
              const destDir = path.dirname(resolvedDest!)
              try { await fs.access(destDir) } catch { await fs.mkdir(destDir, { recursive: true }) }
              await fs.copyFile(resolvedSource, resolvedDest!)
              await fs.unlink(resolvedSource)
            }
          } else {
            throw renameErr
          }
        }
        return { success: true, message: `Moved to ${resolvedDest}`, resolvedSource, resolvedDest }
      }

      case 'delete': {
        const srcStat = await fs.stat(resolvedSource)
        if (srcStat.isDirectory()) {
          await removeDirRecursive(resolvedSource)
        } else {
          await fs.unlink(resolvedSource)
        }
        return { success: true, message: `Deleted ${sourcePath}`, resolvedSource }
      }

      default:
        return { success: false, error: `Unknown operation: ${operation}`, errorCode: 'EINVALID', resolvedSource }
    }
  } catch (err: any) {
    const code = err.code || 'UNKNOWN'
    let message = `Error ${operation} '${sourcePath}'. Resolved: ${resolvedSource}`

    if (code === 'EACCES' || code === 'EPERM') {
      message = `Permission denied ${operation}ing '${sourcePath}'. Resolved: ${resolvedSource}`
    } else if (code === 'ENOENT') {
      message = `Not found: '${sourcePath}'. Resolved: ${resolvedSource}`
    } else if (code === 'EBUSY') {
      message = `Locked: '${sourcePath}'. Close it first. Resolved: ${resolvedSource}`
    } else if (code === 'ENOTEMPTY') {
      message = `Cannot delete '${sourcePath}': folder not empty. Resolved: ${resolvedSource}`
    }

    return { success: false, error: message, errorCode: code, resolvedSource, resolvedDest }
  }
}
