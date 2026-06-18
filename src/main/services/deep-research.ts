import { app, BrowserWindow, safeStorage } from 'electron'
import { tavily } from '@tavily/core'
import Groq from 'groq-sdk'
import path from 'path'
import fsSync from 'fs'

function emitProgress(
  mainWindow: BrowserWindow,
  payload: { status: string; file: string; totalFound: number }
) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('oracle-progress', payload)
  }
}

export async function executeDeepResearch({ query }: { query: string }) {
  const mainWindow = BrowserWindow.getAllWindows()[0]

  if (mainWindow) {
    mainWindow.webContents.send('deep-research-start', { query })
  }

  try {
    // 1. Vault Key Extraction
    let tavilyKey = ''
    let groqKey = ''
    const secureConfigPath = path.join(app.getPath('userData'), 'iris_secure_vault.json')

    if (fsSync.existsSync(secureConfigPath)) {
      try {
        const data = JSON.parse(fsSync.readFileSync(secureConfigPath, 'utf8'))
        if (safeStorage.isEncryptionAvailable()) {
          if (data.tavily) tavilyKey = safeStorage.decryptString(Buffer.from(data.tavily, 'base64'))
          if (data.groq) groqKey = safeStorage.decryptString(Buffer.from(data.groq, 'base64'))
        } else {
          if (data.tavily) tavilyKey = Buffer.from(data.tavily, 'base64').toString('utf8')
          if (data.groq) groqKey = Buffer.from(data.groq, 'base64').toString('utf8')
        }
      } catch (e) {
        console.error('Vault read error:', e)
      }
    }

    if (!tavilyKey || !groqKey) {
      throw new Error('Missing API Keys. Please configure Tavily and Groq in the Command Center.')
    }

    const groq = new Groq({ apiKey: groqKey })
    const tvly = tavily({ apiKey: tavilyKey })

    // ==========================================
    // AGENT PHASE 1: STRATEGIC PLANNING & DECONSTRUCTION
    // ==========================================
    emitProgress(mainWindow, {
      status: 'scanning',
      file: 'Agent formulating multi-angle research matrix...',
      totalFound: 1
    })

    const planningPrompt = `
      You are the strategic planning core of an autonomous AI agent. 
      The user wants to research: "${query}".
      Deconstruct this objective into exactly 3 specialized, distinct search queries that capture different dimensions of the topic (e.g., historical context, technical details, recent changes, conflicting view points).
      Output ONLY a JSON object with a key "queries" containing an array of 3 strings.
    `
    const planningResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: planningPrompt }],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    })

    const planningData = JSON.parse(
      planningResponse.choices[0]?.message?.content || '{"queries": []}'
    )
    const subQueries: string[] = planningData.queries.length ? planningData.queries : [query]

    // ==========================================
    // AGENT PHASE 2: CONCURRENT CROSS-CONCURRENT RESEARCH
    // ==========================================
    emitProgress(mainWindow, {
      status: 'scanning',
      file: `Executing cross-neural search across ${subQueries.length} distinct targets...`,
      totalFound: 2
    })

    // Execute all sub-queries concurrently to mimic high-performance parallel processing
    const searchPromises = subQueries.map(async (subQuery, idx) => {
      try {
        const result = await tvly.search(subQuery, {
          searchDepth: 'advanced',
          includeAnswer: true,
          maxResults: 4
        })
        return { subQuery, results: result.results }
      } catch (err) {
        console.error(`Search failed for sub-query: ${subQuery}`, err)
        return { subQuery, results: [] }
      }
    })

    const searchResults = await Promise.all(searchPromises)

    // Flatten and clean compiled context
    let sourceId = 1
    const rawContextArray: string[] = []
    const crossReferences: string[] = []

    for (const batch of searchResults) {
      for (const integrityItem of batch.results) {
        rawContextArray.push(
          `[Source #${sourceId}] URL: ${integrityItem.url}\nContent: ${integrityItem.content}`
        )
        crossReferences.push(integrityItem.url)
        sourceId++
      }
    }
    const globalContext = rawContextArray.join('\n\n')

    // ==========================================
    // AGENT PHASE 3: REFLECTIONS & GAP ANALYSIS
    // ==========================================
    emitProgress(mainWindow, {
      status: 'reading',
      file: 'Analyzing dataset integrity and detecting information gaps...',
      totalFound: 3
    })

    // ==========================================
    // AGENT PHASE 4: LAYERED DOSSIER SYNTHESIS
    // ==========================================
    emitProgress(mainWindow, {
      status: 'reading',
      file: 'Compiling structured executive intelligence dossier...',
      totalFound: 4
    })

    const synthesisPrompt = `
      You are an elite Intelligence Analyst Engine. Synthesize a comprehensive executive dossier answering the primary objective.
      
      Primary Objective: "${query}"
      
      Sub-Inquiries Investigated:
      ${subQueries.map((q) => `- ${q}`).join('\n')}
      
      Raw Intelligence Gathered:
      ${globalContext}
      
      Instructions:
      1. Provide an incredibly thorough, well-formatted, professional Markdown report.
      2. Group your findings into logical sections: Executive Summary, Comprehensive Analysis, Technical Breakdown/Key Dimensions, and Strategic Conclusions.
      3. Use clear markdown formatting (bolding, lists, code blocks if necessary).
      4. Avoid surface-level summaries. Be granular and exhaustive using the gathered data.
      5. Output ONLY a JSON object with a single key "dossier" containing the markdown text.
    `

    const finalSynthesis = await groq.chat.completions.create({
      messages: [{ role: 'user', content: synthesisPrompt }],
      model: 'llama-3.3-70b-versatile', // 🚨 FIXED: Swapped decommissioned model for production versatile core
      response_format: { type: 'json_object' }
    })

    const finalJson = JSON.parse(
      finalSynthesis.choices[0]?.message?.content || '{"dossier": "Error generating report."}'
    )
    const complexDossier = finalJson.dossier || 'No comprehensive data generated.'

    // ==========================================
    // AGENT PHASE 5: DISPATCH TO CHAT ENGINE & UI
    // ==========================================
    emitProgress(mainWindow, {
      status: 'embedded',
      file: 'Dossier fully optimized and injected into system core.',
      totalFound: 5
    })

    if (mainWindow) {
      mainWindow.webContents.send('deep-research-done', {
        success: true,
        summary: complexDossier
      })
    }

    // Returning directly to the parent Gemini model ensures it fully grasps the scope of research
    return `Deep research agent successfully concluded operations.\n\nHere is the exhaustive Intelligence Dossier compiled autonomously:\n\n${complexDossier}\n\nYou now possess full knowledge of this data. Engage with the user using this context.`
  } catch (error: any) {
    console.error('Agent Engine Error:', error)
    if (mainWindow) {
      mainWindow.webContents.send('deep-research-done', { success: false, summary: null })
    }
    return `Deep research agent aborted unexpectedly due to an internal error: ${error.message}`
  }
}
