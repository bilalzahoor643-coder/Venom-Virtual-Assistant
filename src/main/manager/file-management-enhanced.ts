import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { BrowserWindow, shell } from 'electron'

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

// ==================== FILE PROPERTIES ====================
interface FileProperties {
  success: boolean
  properties?: {
    name: string
    path: string
    extension: string
    type: string
    size: number
    sizeFormatted: string
    created: string
    modified: string
    accessed: string
    isReadOnly: boolean
    isHidden: boolean
    isSymlink: boolean
    permissions: {
      readable: boolean
      writable: boolean
      executable: boolean
    }
  }
  error?: string
  errorCode?: string
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function getFileMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json',
    '.js': 'text/javascript', '.ts': 'text/typescript', '.html': 'text/html',
    '.css': 'text/css', '.py': 'text/x-python', '.java': 'text/x-java',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf',
    '.zip': 'application/zip', '.exe': 'application/x-msdownload'
  }
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}

export async function getFileProperties(filePath: string): Promise<FileProperties> {
  try {
    const resolvedPath = resolveSystemPath(filePath)

    try {
      await fs.access(resolvedPath)
    } catch {
      return { success: false, error: `File not found: '${filePath}'`, errorCode: 'ENOENT' }
    }

    const stats = await fs.stat(resolvedPath)
    const ext = path.extname(resolvedPath)
    const baseName = path.basename(resolvedPath)

    let isReadOnly = false
    try {
      await fs.access(resolvedPath, fs.constants.W_OK)
    } catch {
      isReadOnly = true
    }

    let readable = false, writable = false, executable = false
    try { await fs.access(resolvedPath, fs.constants.R_OK); readable = true } catch {}
    try { await fs.access(resolvedPath, fs.constants.W_OK); writable = true } catch {}
    try { await fs.access(resolvedPath, fs.constants.X_OK); executable = true } catch {}

    return {
      success: true,
      properties: {
        name: baseName,
        path: resolvedPath,
        extension: ext,
        type: getFileMimeType(ext),
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        created: formatDate(stats.birthtime),
        modified: formatDate(stats.mtime),
        accessed: formatDate(stats.atime),
        isReadOnly,
        isHidden: baseName.startsWith('.'),
        isSymlink: stats.isSymbolicLink(),
        permissions: { readable, writable, executable }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message, errorCode: err.code }
  }
}

// ==================== FOLDER INFO ====================
interface FolderInfo {
  success: boolean
  info?: {
    name: string
    path: string
    totalSize: number
    totalSizeFormatted: string
    fileCount: number
    folderCount: number
    totalItems: number
    created: string
    modified: string
    largestFile: { name: string; size: number } | null
    fileTypes: Record<string, number>
  }
  error?: string
  errorCode?: string
}

async function walkFolderForInfo(
  dirPath: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<{ files: { name: string; size: number; ext: string }[]; folders: number }> {
  if (currentDepth >= maxDepth) return { files: [], folders: 0 }

  const files: { name: string; size: number; ext: string }[] = []
  let folders = 0

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          folders++
          const sub = await walkFolderForInfo(fullPath, maxDepth, currentDepth + 1)
          files.push(...sub.files)
          folders += sub.folders
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          files.push({ name: entry.name, size: stats.size, ext: path.extname(entry.name).toLowerCase() })
        }
      } catch { continue }
    }
  } catch {}

  return { files, folders }
}

export async function getFolderInfo(folderPath: string): Promise<FolderInfo> {
  try {
    const resolvedPath = resolveSystemPath(folderPath)

    try {
      const stats = await fs.stat(resolvedPath)
      if (!stats.isDirectory()) {
        return { success: false, error: `'${folderPath}' is a file, not a folder.`, errorCode: 'ENOTDIR' }
      }
    } catch (e: any) {
      return { success: false, error: e.code === 'EACCES' ? `Permission denied: '${folderPath}'` : `Folder not found: '${folderPath}'`, errorCode: e.code }
    }

    const { files, folders } = await walkFolderForInfo(resolvedPath)
    const totalSize = files.reduce((acc, f) => acc + f.size, 0)
    const largestFile = files.length > 0 ? files.reduce((max, f) => f.size > max.size ? f : max, files[0]) : null

    const fileTypes: Record<string, number> = {}
    files.forEach(f => { fileTypes[f.ext || '(no ext)'] = (fileTypes[f.ext || '(no ext)'] || 0) + 1 })

    const stats = await fs.stat(resolvedPath)

    return {
      success: true,
      info: {
        name: path.basename(resolvedPath),
        path: resolvedPath,
        totalSize,
        totalSizeFormatted: formatSize(totalSize),
        fileCount: files.length,
        folderCount: folders,
        totalItems: files.length + folders,
        created: formatDate(stats.birthtime),
        modified: formatDate(stats.mtime),
        largestFile: largestFile ? { name: largestFile.name, size: largestFile.size } : null,
        fileTypes
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message, errorCode: err.code }
  }
}

// ==================== FILE EXISTS ====================
export async function fileExists(filePath: string): Promise<{ exists: boolean; isFile: boolean; isDirectory: boolean; path: string }> {
  const resolvedPath = resolveSystemPath(filePath)
  try {
    const stats = await fs.stat(resolvedPath)
    return { exists: true, isFile: stats.isFile(), isDirectory: stats.isDirectory(), path: resolvedPath }
  } catch {
    return { exists: false, isFile: false, isDirectory: false, path: resolvedPath }
  }
}

// ==================== FILE RENAME ====================
export async function renameFile(oldPath: string, newName: string): Promise<{ success: boolean; newPath?: string; error?: string; errorCode?: string }> {
  try {
    const resolvedOld = resolveSystemPath(oldPath)
    try { await fs.access(resolvedOld) } catch {
      return { success: false, error: `File not found: '${oldPath}'`, errorCode: 'ENOENT' }
    }

    const dir = path.dirname(resolvedOld)
    const resolvedNew = path.join(dir, newName)

    if (resolvedOld === resolvedNew) {
      return { success: false, error: 'New name is the same as old name.', errorCode: 'ESAME' }
    }

    try { await fs.access(resolvedNew) } catch {}
    if (await fs.access(resolvedNew).then(() => true).catch(() => false)) {
      return { success: false, error: `A file with name '${newName}' already exists.`, errorCode: 'EEXIST' }
    }

    await fs.rename(resolvedOld, resolvedNew)
    return { success: true, newPath: resolvedNew }
  } catch (err: any) {
    const code = err.code || 'UNKNOWN'
    let message = ''
    switch (code) {
      case 'EACCES': message = `Permission denied: Cannot rename '${oldPath}'.`; break
      case 'EPERM': message = `Operation not permitted: '${oldPath}'.`; break
      case 'EBUSY': message = `File is busy: '${oldPath}'. Close it and try again.`; break
      default: message = err.message || 'Rename failed'
    }
    return { success: false, error: message, errorCode: code }
  }
}

// ==================== RECENT FILES ====================
export async function getRecentFiles(dirPath: string, count: number = 20): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const resolvedPath = dirPath ? resolveSystemPath(dirPath) : os.homedir()

    try { await fs.access(resolvedPath) } catch {
      return { success: false, error: `Directory not found: '${resolvedPath}'` }
    }

    const allFiles: { name: string; path: string; modified: number; size: number; type: string }[] = []

    async function walk(dir: string, depth: number) {
      if (depth > 3 || allFiles.length > 200) return
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (allFiles.length >= 200) break
          if (entry.name.startsWith('.') || entry.name.startsWith('$')) continue
          const fullPath = path.join(dir, entry.name)
          try {
            if (entry.isDirectory()) {
              await walk(fullPath, depth + 1)
            } else {
              const stats = await fs.stat(fullPath)
              allFiles.push({
                name: entry.name,
                path: fullPath,
                modified: stats.mtimeMs,
                size: stats.size,
                type: path.extname(entry.name).toLowerCase()
              })
            }
          } catch { continue }
        }
      } catch {}
    }

    await walk(resolvedPath, 0)

    allFiles.sort((a, b) => b.modified - a.modified)
    const recent = allFiles.slice(0, count).map(f => ({
      ...f,
      modifiedFormatted: formatDate(new Date(f.modified)),
      sizeFormatted: formatSize(f.size)
    }))

    return { success: true, files: recent }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==================== FILE TYPE DETECTION ====================
export async function getFileTypeInfo(filePath: string): Promise<{ success: boolean; info?: any; error?: string }> {
  try {
    const resolvedPath = resolveSystemPath(filePath)
    try { await fs.access(resolvedPath) } catch {
      return { success: false, error: `File not found: '${filePath}'` }
    }

    const stats = await fs.stat(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const mime = getFileMimeType(ext)

    const categories: Record<string, string[]> = {
      'text': ['.txt', '.md', '.csv', '.log', '.ini', '.cfg', '.conf'],
      'code': ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.swift', '.rb', '.php', '.html', '.css'],
      'data': ['.json', '.xml', '.yaml', '.yml', '.sql', '.db'],
      'image': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'],
      'video': ['.mp4', '.mkv', '.avi', '.mov', '.webm'],
      'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
      'document': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      'archive': ['.zip', '.rar', '.7z', '.tar', '.gz'],
      'executable': ['.exe', '.msi', '.bat', '.sh', '.app']
    }

    let category = 'other'
    for (const [cat, exts] of Object.entries(categories)) {
      if (exts.includes(ext)) { category = cat; break }
    }

    return {
      success: true,
      info: {
        name: path.basename(resolvedPath),
        extension: ext,
        mimeType: mime,
        category,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        isText: stats.size < 1024 * 100,
        canOpenInIRIS: category === 'text' || category === 'code' || category === 'data'
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==================== DUPLICATE FILE DETECTION ====================
async function calculateFileHash(filePath: string): Promise<string> {
  const crypto = require('crypto')
  const content = await fs.readFile(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

export async function findDuplicateFiles(folderPath: string): Promise<{ success: boolean; duplicates?: any[]; error?: string }> {
  try {
    const resolvedPath = resolveSystemPath(folderPath)
    try { await fs.access(resolvedPath) } catch {
      return { success: false, error: `Folder not found: '${folderPath}'` }
    }

    const filesBySize: Map<number, string[]> = new Map()

    async function walk(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const fullPath = path.join(dir, entry.name)
          try {
            if (entry.isDirectory()) await walk(fullPath)
            else {
              const stats = await fs.stat(fullPath)
              if (stats.size > 0) {
                const existing = filesBySize.get(stats.size) || []
                existing.push(fullPath)
                filesBySize.set(stats.size, existing)
              }
            }
          } catch { continue }
        }
      } catch {}
    }

    await walk(resolvedPath)

    const duplicates: any[] = []
    for (const [size, files] of filesBySize) {
      if (files.length > 1) {
        const hashes = new Map<string, string[]>()
        for (const file of files) {
          try {
            const hash = await calculateFileHash(file)
            const existing = hashes.get(hash) || []
            existing.push(file)
            hashes.set(hash, existing)
          } catch {}
        }
        for (const [hash, hashFiles] of hashes) {
          if (hashFiles.length > 1) {
            duplicates.push({
              hash,
              size: formatSize(size),
              count: hashFiles.length,
              files: hashFiles
            })
          }
        }
      }
    }

    return { success: true, duplicates }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==================== OPEN IN IRIS VIEWER ====================
export async function openInIRISViewer(filePath: string): Promise<{ success: boolean; windowId?: number; error?: string }> {
  try {
    const resolvedPath = resolveSystemPath(filePath)
    try { await fs.access(resolvedPath) } catch {
      return { success: false, error: `File not found: '${filePath}'` }
    }

    const ext = path.extname(resolvedPath).toLowerCase()
    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.html', '.css', '.xml', '.yml', '.yaml', '.sh', '.bat', '.log', '.csv', '.env', '.gitignore']
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico']

    const content = await fs.readFile(resolvedPath, 'utf-8').catch(() => '')
    const isImage = imageExtensions.includes(ext)
    const isText = textExtensions.includes(ext) || content.length > 0

    if (!isText && !isImage) {
      shell.openPath(resolvedPath)
      return { success: true }
    }

    const viewer = new BrowserWindow({
      width: 900,
      height: 700,
      title: `${path.basename(resolvedPath)} - IRIS Viewer`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      backgroundColor: '#0a0a0a'
    })

    let html = ''

    if (isImage) {
      const dataUri = `data:${getFileMimeType(ext)};base64,${await fs.readFile(resolvedPath).then(b => b.toString('base64')).catch(() => '')}`
      html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif}img{max-width:95%;max-height:95vh;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5)}.info{position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.8);color:#34d399;padding:8px 16px;border-radius:8px;font-size:12px}</style></head><body><div class="info">${path.basename(resolvedPath)}</div><img src="${dataUri}" /></body></html>`
    } else {
      const prismLang = getPrismLanguage(ext)
      const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html = `<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet"/><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#e4e4e7;font-family:'Consolas',monospace;font-size:13px;padding:20px}.header{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #27272a;margin-bottom:15px}.header h3{color:#34d399;font-size:14px}.header span{color:#71717a;font-size:12px}pre{background:#18181b;border-radius:8px;padding:16px;overflow-x:auto;border:1px solid #27272a}code{font-family:'Consolas',monospace}</style></head><body><div class="header"><h3>${path.basename(resolvedPath)}</h3><span>${content.split('\\n').length} lines | ${formatSize(content.length)}</span></div><pre><code class="language-${prismLang}">${escapedContent}</code></div></body></html>`
    }

    viewer.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return { success: true, windowId: viewer.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

function getPrismLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    '.js': 'javascript', '.ts': 'typescript', '.jsx': 'jsx', '.tsx': 'tsx',
    '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c',
    '.html': 'html', '.css': 'css', '.json': 'json', '.xml': 'xml',
    '.sh': 'bash', '.bat': 'batch', '.md': 'markdown', '.yml': 'yaml',
    '.yaml': 'yaml', '.sql': 'sql', '.rb': 'ruby', '.go': 'go', '.rs': 'rust'
  }
  return langMap[ext.toLowerCase()] || 'plaintext'
}
