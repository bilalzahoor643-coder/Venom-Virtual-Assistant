import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { app } from 'electron'

const memoryDir = path.join(app.getPath('userData'), 'data')
const memoryFile = path.join(memoryDir, 'memory.json')

export interface MemoryEntry {
  role: 'user' | 'model'
  text: string
  timestamp: string
}

export async function getMemory(): Promise<MemoryEntry[]> {
  try {
    if (!fsSync.existsSync(memoryFile)) return []
    const data = await fs.readFile(memoryFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function addMemory(role: 'user' | 'model', text: string) {
  try {
    if (!fsSync.existsSync(memoryDir)) {
      await fs.mkdir(memoryDir, { recursive: true })
    }

    let mem = await getMemory()
    mem.push({ role, text, timestamp: new Date().toLocaleString() })

    if (mem.length > 15) mem = mem.slice(mem.length - 15)

    await fs.writeFile(memoryFile, JSON.stringify(mem, null, 2))
  } catch (error) {
    console.error('Failed to save memory:', error)
  }
}

export async function getMemoryContextString(): Promise<string> {
  const mem = await getMemory()
  if (mem.length === 0) return 'No previous conversation history.'

  return mem.map((m) => `[${m.role}] (${m.timestamp}): ${m.text}`).join('\n')
}
