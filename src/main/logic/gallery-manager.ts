import { app, shell, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'

const GALLERY_DIR = path.join(app.getPath('userData'), 'Gallery')

async function ensureGalleryDir(): Promise<void> {
  try {
    await fs.access(GALLERY_DIR)
  } catch {
    await fs.mkdir(GALLERY_DIR, { recursive: true })
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 200)
}

export async function getGallery() {
  try {
    await ensureGalleryDir()
    const files = await fs.readdir(GALLERY_DIR)
    const imageFiles = files.filter((file) => /\.(png|jpg|jpeg|webp|gif|mp4)$/i.test(file))

    const images = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const filePath = path.join(GALLERY_DIR, file)
          const stats = await fs.stat(filePath)
          const fileUrl = pathToFileURL(filePath).href
          return {
            filename: file,
            displayName: file.replace(/_\d+_Generated_by_IRIS\.png$/, '').replace(/_/g, ' '),
            path: filePath,
            url: fileUrl,
            createdAt: stats.birthtime,
            size: stats.size
          }
        } catch {
          return null
        }
      })
    )

    return images
      .filter(Boolean)
      .sort((a, b) => b!.createdAt.getTime() - a!.createdAt.getTime())
  } catch (error) {
    return []
  }
}

export async function saveImageToGallery({
  title,
  base64Data
}: {
  title: string
  base64Data: string
}) {
  try {
    await ensureGalleryDir()
    const safeTitle = sanitizeFilename(title || 'visual')
    const timestamp = Date.now()
    const fileName = `${safeTitle}_${timestamp}_Generated_by_IRIS.png`
    const filePath = path.join(GALLERY_DIR, fileName)
    const data = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(data, 'base64')
    await fs.writeFile(filePath, buffer)
    return { success: true, path: filePath }
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code }
  }
}

export async function deleteImage(filename: string): Promise<boolean> {
  try {
    await ensureGalleryDir()

    const safeName = sanitizeFilename(path.basename(filename))
    if (safeName !== path.basename(filename)) {
      return false
    }

    const filePath = path.join(GALLERY_DIR, safeName)

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

export async function openImageLocation(filePath: string): Promise<void> {
  try {
    await fs.access(filePath)
    shell.showItemInFolder(filePath)
  } catch {
    shell.showItemInFolder(GALLERY_DIR)
  }
}

export async function saveImageExternal(sourcePath: string) {
  try {
    await fs.access(sourcePath)

    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Image Copy',
      defaultPath: path.basename(sourcePath),
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (filePath) {
      await fs.copyFile(sourcePath, filePath)
      return { success: true, path: filePath }
    }
    return { canceled: true }
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code }
  }
}
