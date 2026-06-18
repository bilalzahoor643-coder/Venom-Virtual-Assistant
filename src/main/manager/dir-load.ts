import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const getFileType = (name: string, isDirectory: boolean): string => {
  if (isDirectory) return 'directory'
  const ext = path.extname(name).toLowerCase()
  const textExts = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.py', '.java', '.c', '.cpp', '.h', '.csv', '.env', '.log', '.xml', '.yml', '.yaml', '.sh', '.bat', '.ps1', '.rb', '.go', '.rs', '.swift', '.kt']
  const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff']
  const vidExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv']
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a']
  const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf']
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']
  const execExts = ['.exe', '.msi', '.bat', '.sh', '.app', '.dmg', '.deb', '.rpm']
  const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.swift', '.kt', '.rb', '.php']

  if (textExts.includes(ext)) return 'text'
  if (imgExts.includes(ext)) return 'image'
  if (vidExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  if (archiveExts.includes(ext)) return 'archive'
  if (execExts.includes(ext)) return 'executable'
  if (codeExts.includes(ext)) return 'code'
  return 'other'
}

const getSystemPath = (name: string): string => {
  try { return app.getPath(name as any) }
  catch {
    const home = os.homedir()
    switch (name) {
      case 'desktop': return path.join(home, 'Desktop')
      case 'documents': return path.join(home, 'Documents')
      case 'downloads': return path.join(home, 'Downloads')
      case 'music': return path.join(home, 'Music')
      case 'pictures': return path.join(home, 'Pictures')
      case 'videos': return path.join(home, 'Videos')
      case 'home': return home
      default: return home
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(ms: number): string {
  if (ms === 0) return 'Unknown'
  return new Date(ms).toLocaleString()
}

export async function readDirectory(dirPath: string): Promise<string> {
  try {
    let rawInput = dirPath.trim().replace(/^['"]+|['"]+$/g, '').replace(/\n/g, '').replace(/\r/g, '')
    let targetPath = rawInput
    const platform = os.platform()
    const home = os.homedir()

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

    if (systemFolders[rawInput.toLowerCase()]) {
      targetPath = systemFolders[rawInput.toLowerCase()]
    } else {
      for (const [name, fullPath] of Object.entries(systemFolders)) {
        if (rawInput.toLowerCase().startsWith(name + '/') || rawInput.toLowerCase().startsWith(name + '\\')) {
          targetPath = fullPath + rawInput.substring(name.length)
          break
        }
      }
    }

    if (targetPath === rawInput) {
      if (platform === 'win32' && /^[a-zA-Z]:$/.test(rawInput)) {
        targetPath = `${rawInput.charAt(0).toUpperCase()}:\\`
      } else if (!path.isAbsolute(targetPath)) {
        targetPath = path.join(home, rawInput)
      }
    }

    try {
      const stats = await fs.stat(targetPath)
      if (!stats.isDirectory()) {
        return JSON.stringify({
          success: false,
          error: `'${targetPath}' is a file, not a directory. Use 'read_file' to read it.`,
          errorCode: 'ENOTDIR'
        })
      }
    } catch (e: any) {
      if (e.code === 'EACCES') {
        return JSON.stringify({
          success: false,
          error: `Permission denied: Cannot access directory '${targetPath}'.`,
          errorCode: 'EACCES'
        })
      }
      return JSON.stringify({
        success: false,
        error: `Directory not found: '${targetPath}'`,
        errorCode: 'ENOENT'
      })
    }

    let dirents
    try {
      dirents = await fs.readdir(targetPath, { withFileTypes: true })
    } catch (e: any) {
      if (e.code === 'EACCES') {
        return JSON.stringify({
          success: false,
          error: `Permission denied: Cannot list contents of '${targetPath}'.`,
          errorCode: 'EACCES'
        })
      }
      throw e
    }

    const items = dirents
      .filter((d) => !d.name.startsWith('.'))
      .map((d) => ({
        name: d.name,
        path: path.join(targetPath, d.name),
        isDirectory: d.isDirectory(),
        ext: path.extname(d.name).toLowerCase()
      }))

    const itemsWithStats = await Promise.all(
      items.map(async (item) => {
        try {
          const stats = await fs.stat(item.path)
          return {
            ...item,
            mtime: stats.mtimeMs,
            ctime: stats.ctimeMs,
            size: stats.size,
            isHidden: item.name.startsWith('.')
          }
        } catch {
          return { ...item, mtime: 0, ctime: 0, size: 0, isHidden: false }
        }
      })
    )

    const sortedItems = itemsWithStats
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return b.mtime - a.mtime
      })

    const results = sortedItems.map((item) => {
      const type = getFileType(item.name, item.isDirectory)
      let infoString = ''
      if (item.isDirectory) {
        infoString = `[DIR]`
      } else {
        const sizeStr = formatSize(item.size)
        infoString = `[${type.toUpperCase()} | ${sizeStr}]`
      }
      return {
        name: item.name,
        type: type,
        path: item.path,
        info: infoString,
        size: item.size,
        sizeFormatted: formatSize(item.size),
        modified: formatDate(item.mtime),
        created: formatDate(item.ctime)
      }
    })

    return JSON.stringify({
      success: true,
      directory: targetPath,
      items_found: results.length,
      totalSize: formatSize(results.reduce((acc, item) => acc + (item.size || 0), 0)),
      content: results
    })
  } catch (err: any) {
    return JSON.stringify({
      success: false,
      error: `System Error: ${err.message || err}`,
      errorCode: err.code || 'UNKNOWN'
    })
  }
}
