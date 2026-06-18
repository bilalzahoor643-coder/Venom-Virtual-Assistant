import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const NOTES_DIR = path.join(app.getPath('userData'), 'Notes')

async function ensureNotesDir(): Promise<void> {
  try {
    await fs.access(NOTES_DIR)
  } catch {
    await fs.mkdir(NOTES_DIR, { recursive: true })
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 200)
}

export async function saveNote({ title, content }: { title: string; content: string }) {
  try {
    await ensureNotesDir()
    const safeTitle = sanitizeFilename(title)
    const fileName = `${safeTitle}.md`
    const filePath = path.join(NOTES_DIR, fileName)
    const fileContent = `# ${title}\n\n${content}`
    await fs.writeFile(filePath, fileContent, 'utf-8')
    return { success: true, path: filePath }
  } catch (error: any) {
    const code = error.code || 'UNKNOWN'
    let message = ''
    switch (code) {
      case 'EACCES': message = 'Permission denied: Cannot save note.'; break
      case 'ENOSPC': message = 'Disk full: Cannot save note.'; break
      default: message = error.message || 'Unknown error'
    }
    return { success: false, error: message, errorCode: code }
  }
}

export async function getNotes() {
  try {
    await ensureNotesDir()
    const files = await fs.readdir(NOTES_DIR)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const notes = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const filePath = path.join(NOTES_DIR, file)
          const stats = await fs.stat(filePath)
          const content = await fs.readFile(filePath, 'utf-8')
          return {
            filename: file,
            title: file.replace('.md', '').replace(/_/g, ' '),
            content: content,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            size: stats.size,
            path: filePath
          }
        } catch {
          return null
        }
      })
    )

    return notes
      .filter(Boolean)
      .sort((a, b) => b!.createdAt.getTime() - a!.createdAt.getTime())
  } catch (error) {
    return []
  }
}

export async function deleteNote(filename: string): Promise<boolean> {
  try {
    await ensureNotesDir()

    const safeName = sanitizeFilename(path.basename(filename))
    if (safeName !== path.basename(filename)) {
      return false
    }

    const filePath = path.join(NOTES_DIR, safeName)

    try {
      await fs.access(filePath)
    } catch {
      return false
    }

    await fs.unlink(filePath)
    return true
  } catch (e) {
    return false
  }
}
