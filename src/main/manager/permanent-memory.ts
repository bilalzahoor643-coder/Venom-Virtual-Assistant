import { app } from 'electron'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

export interface MemoryEntry {
  fact: string
  timestamp: string
}

function getMemoryFilePath(): string {
  const memoryDir = path.resolve(app.getPath('userData'), 'Memory')

  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true })
  }

  return path.join(memoryDir, 'saved-user-memory.json')
}

export async function saveCoreMemory(fact: string): Promise<boolean> {
  try {
    const filePath = getMemoryFilePath()
    let memoryBank: MemoryEntry[] = []

    try {
      const data = await fs.readFile(filePath, 'utf-8')
      memoryBank = data ? JSON.parse(data) : []
    } catch (readErr: any) {
      if (readErr.code !== 'ENOENT') {
        console.error('Error reading memory file:', readErr)
      }
    }

    memoryBank.push({
      fact: fact,
      timestamp: new Date().toISOString()
    })

    await fs.writeFile(filePath, JSON.stringify(memoryBank, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to save core memory:', err)
    return false
  }
}

export async function searchCoreMemory(): Promise<MemoryEntry[]> {
  try {
    const filePath = getMemoryFilePath()

    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return data ? JSON.parse(data) : []
    } catch (readErr: any) {
      if (readErr.code === 'ENOENT') {
        return []
      }
      throw readErr
    }
  } catch (err) {
    console.error('Failed to search core memory:', err)
    return []
  }
}
