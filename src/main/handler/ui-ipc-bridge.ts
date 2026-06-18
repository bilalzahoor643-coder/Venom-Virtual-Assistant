import { ipcMain } from 'electron'

import { getNotes, saveNote, deleteNote } from '../manager/notes-manager'
import {
  getGallery,
  saveImageToGallery,
  deleteImage,
  openImageLocation,
  saveImageExternal
} from '../logic/gallery-manager'

export default function registerFrontendIPC() {
  ipcMain.handle('get-notes', async () => {
    return await getNotes()
  })

  ipcMain.handle('save-note', async (_event, args) => {
    return await saveNote(args)
  })

  ipcMain.handle('delete-note', async (_event, filename) => {
    return await deleteNote(filename)
  })

  ipcMain.handle('get-gallery', async () => {
    return await getGallery()
  })

  ipcMain.handle('save-image-to-gallery', async (_event, args) => {
    return await saveImageToGallery(args)
  })

  ipcMain.handle('delete-image', async (_event, filename) => {
    return await deleteImage(filename)
  })

  ipcMain.handle('open-image-location', async (_event, filePath) => {
    await openImageLocation(filePath)
    return { success: true }
  })

  ipcMain.handle('save-image-external', async (_event, sourcePath) => {
    return await saveImageExternal(sourcePath)
  })
}
