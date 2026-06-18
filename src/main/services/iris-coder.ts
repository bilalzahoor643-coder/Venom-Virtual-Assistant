import { app, BrowserWindow, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { exec } from 'child_process'
import { GoogleGenAI } from '@google/genai'

function getProjectsDir(): string {
  const projectsDir = path.resolve(app.getPath('userData'), 'Projects')
  if (!fsSync.existsSync(projectsDir)) {
    fsSync.mkdirSync(projectsDir, { recursive: true })
  }
  return projectsDir
}

export async function startLiveCoding({ prompt, filename }: { prompt: string; filename: string }) {
  const mainWindow = BrowserWindow.getAllWindows()[0]

  if (mainWindow) {
    mainWindow.webContents.send('open-coding-widget', { filename })
  }

  try {
    const projectsDir = getProjectsDir()
    const filePath = path.join(projectsDir, filename)

    await fs.writeFile(filePath, '// Boss, connection established. Waiting for AI stream...\n')

    let geminiKey = ''
    const secureConfigPath = path.join(app.getPath('userData'), 'iris_secure_vault.json')

    if (fsSync.existsSync(secureConfigPath)) {
      try {
        const data = JSON.parse(fsSync.readFileSync(secureConfigPath, 'utf8'))
        if (data.gemini) {
          if (safeStorage.isEncryptionAvailable()) {
            geminiKey = safeStorage.decryptString(Buffer.from(data.gemini, 'base64'))
          } else {
            geminiKey = Buffer.from(data.gemini, 'base64').toString('utf8')
          }
        }
      } catch (e) {
        console.error('Vault read error:', e)
      }
    }

    if (!geminiKey || geminiKey.trim() === '') {
      throw new Error('Missing Gemini API Key. Please configure it in the Command Center Vault.')
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `You are an elite developer. Write the code for: "${prompt}". Output ONLY the raw code for the file ${filename}. Do NOT wrap it in markdown blockquotes (\`\`\` language formatting). Just raw code.`
    })

    let fullCode = ''

    for await (const chunk of response) {
      if (chunk.text) {
        fullCode += chunk.text
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('live-code-chunk', chunk.text)
        }
      }
    }

    let cleanCode = fullCode.replace(/^```[a-z]*\n?/, '').replace(/```$/, '')
    await fs.writeFile(filePath, cleanCode.trim(), 'utf-8')

    if (mainWindow) {
      mainWindow.webContents.send('coding-complete', { filePath })
    }

    return `Successfully coded ${filename}. File saved to ${filePath}.`
  } catch (err: any) {
    if (mainWindow) {
      mainWindow.webContents.send('live-code-chunk', `\n\n❌ [SYSTEM FAILURE]: ${err.message}`)
      mainWindow.webContents.send('coding-complete', { filePath: null })
    }
    return `Error during live coding: ${err.message}`
  }
}

export async function openInVsCode(filePath: string) {
  try {
    exec(`code "${filePath}"`)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
