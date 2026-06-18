import { app, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { pipeline } from '@xenova/transformers'

const DB_PATH = path.join(app.getPath('userData'), 'rag_oracle_db.json')
const CHUNK_SIZE = 500

let embeddingPipeline: any = null
let isCancelled = false

async function getEmbeddingPipeline(): Promise<any> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return embeddingPipeline
}

interface VectorEntry {
  id: string
  text: string
  embedding: number[]
  metadata: { source: string; chunkIndex: number }
}

async function loadDb(): Promise<VectorEntry[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveDb(entries: VectorEntry[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(entries), 'utf-8')
}

function chunkText(text: string, fileName: string): { text: string; metadata: { source: string; chunkIndex: number } }[] {
  const chunks: { text: string; metadata: { source: string; chunkIndex: number } }[] = []
  const lines = text.split('\n')
  let currentChunk = ''
  let chunkIndex = 0

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > CHUNK_SIZE) {
      if (currentChunk.trim()) {
        chunks.push({ text: currentChunk.trim(), metadata: { source: fileName, chunkIndex } })
        chunkIndex++
      }
      currentChunk = line
    } else {
      currentChunk += '\n' + line
    }
  }
  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), metadata: { source: fileName, chunkIndex } })
  }
  return chunks
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function walkDirectory(dirPath: string, ignorePatterns: string[]): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (!ignorePatterns.some(p => entry.name.includes(p))) {
        const subFiles = await walkDirectory(fullPath, ignorePatterns)
        files.push(...subFiles)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html'].includes(ext)) {
        if (!ignorePatterns.some(p => entry.name.includes(p))) {
          files.push(fullPath)
        }
      }
    }
  }
  return files
}

export async function ingestCodebase({
  dirPath,
  geminiKey,
  win
}: {
  dirPath: string
  geminiKey: string
  win?: BrowserWindow
}): Promise<{ success: boolean; totalChunks?: number; error?: string }> {
  isCancelled = false

  try {
    const emb = await getEmbeddingPipeline()
    const db = await loadDb()
    const ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache']
    const files = await walkDirectory(dirPath, ignorePatterns)
    let totalChunks = 0
    const totalFiles = files.length

    for (let i = 0; i < files.length; i++) {
      if (isCancelled) return { success: false, error: 'Ingestion cancelled' }

      const file = files[i]
      const content = await fs.readFile(file, 'utf-8').catch(() => '')
      if (!content.trim()) continue

      const chunks = chunkText(content, file)
      for (const chunk of chunks) {
        if (isCancelled) return { success: false, error: 'Ingestion cancelled' }

        const output = await emb(chunk.text, { pooling: 'mean', normalize: true })
        const embedding = Array.from(output.data) as number[]

        const existingIdx = db.findIndex(e => e.id === `${chunk.metadata.source}_${chunk.metadata.chunkIndex}`)
        const entry: VectorEntry = {
          id: `${chunk.metadata.source}_${chunk.metadata.chunkIndex}`,
          text: chunk.text,
          embedding,
          metadata: chunk.metadata
        }

        if (existingIdx >= 0) db[existingIdx] = entry
        else db.push(entry)

        totalChunks++
      }

      if (win && !win.isDestroyed()) {
        win.webContents.send('oracle-progress', {
          current: i + 1,
          total: totalFiles,
          chunks: totalChunks,
          file: path.basename(file)
        })
      }
    }

    await saveDb(db)
    return { success: true, totalChunks }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function consultOracle({
  query,
  geminiKey,
  groqKey
}: {
  query: string
  geminiKey: string
  groqKey: string
}): Promise<{ success: boolean; answer?: string; error?: string }> {
  try {
    const emb = await getEmbeddingPipeline()
    const db = await loadDb()

    if (db.length === 0) return { success: false, error: 'No code ingested yet. Run ingest first.' }

    const queryOutput = await emb(query, { pooling: 'mean', normalize: true })
    const queryEmbedding = Array.from(queryOutput.data) as number[]

    const scored = db.map(e => ({ ...e, score: cosineSimilarity(queryEmbedding, e.embedding) }))
    scored.sort((a, b) => b.score - a.score)
    const top5 = scored.slice(0, 5)

    const context = top5.map(r => `File: ${r.metadata.source}\n${r.text}`).join('\n\n---\n\n')

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `You are an expert code analyst. Based on the following code context, answer the user's question.\n\nContext:\n${context}\n\nQuestion: ${query}\n\nProvide a detailed answer based on the code context above.`
        }],
        temperature: 0.3,
        max_tokens: 2048
      })
    })

    if (!groqRes.ok) return { success: false, error: `Groq API error: ${groqRes.status}` }

    const data = await groqRes.json()
    const answer = data.choices?.[0]?.message?.content
    if (!answer) return { success: false, error: 'No answer generated.' }

    return { success: true, answer }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function cancelIngestion(): void {
  isCancelled = true
}
