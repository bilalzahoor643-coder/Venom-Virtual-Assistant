import { google, gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { app, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
]

const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gmail_credentials.json')
const TOKEN_PATH = path.join(app.getPath('userData'), 'gmail_token.json')

let gmailClient: gmail_v1.Gmail | null = null

async function loadCredentials(): Promise<any> {
  try {
    const data = await fs.readFile(CREDENTIALS_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function loadToken(): Promise<any> {
  try {
    const data = await fs.readFile(TOKEN_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function saveToken(tokens: any): Promise<void> {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2))
}

export async function saveGmailCredentials(credentials: any): Promise<{ success: boolean }> {
  try {
    await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2))
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function getGmailAuthUrl(): Promise<{ url: string } | null> {
  const credentials = await loadCredentials()
  if (!credentials?.installed?.client_id) return null

  const oauth2Client = new OAuth2Client(
    credentials.installed.client_id,
    credentials.installed.client_secret,
    'http://localhost:3000/callback'
  )

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })

  return { url }
}

export async function handleGmailCallback(code: string): Promise<{ success: boolean }> {
  const credentials = await loadCredentials()
  if (!credentials?.installed?.client_id) return { success: false }

  const oauth2Client = new OAuth2Client(
    credentials.installed.client_id,
    credentials.installed.client_secret,
    'http://localhost:3000/callback'
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    await saveToken(tokens)
    await initGmailClient()
    return { success: true }
  } catch {
    return { success: false }
  }
}

async function initGmailClient(): Promise<boolean> {
  const credentials = await loadCredentials()
  const token = await loadToken()

  if (!credentials?.installed?.client_id || !token) return false

  const oauth2Client = new OAuth2Client(
    credentials.installed.client_id,
    credentials.installed.client_secret,
    'http://localhost:3000/callback'
  )

  oauth2Client.setCredentials(token)

  oauth2Client.on('tokens', async (tokens) => {
    const existingToken = await loadToken()
    const merged = { ...existingToken, ...tokens }
    await saveToken(merged)
  })

  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client as any })
  return true
}

export async function isGmailConnected(): Promise<boolean> {
  if (gmailClient) return true
  return await initGmailClient()
}

export async function readGmails(maxResults: number = 5): Promise<{ success: boolean; data?: any[]; speechText?: string; error?: string }> {
  if (!(await isGmailConnected())) {
    return { success: false, error: 'Gmail not connected. Please add your Google OAuth credentials.' }
  }

  try {
    const res = await gmailClient!.users.messages.list({
      userId: 'me',
      maxResults
    })

    const messages = res.data.messages || []
    const emails: any[] = []

    for (const msg of messages) {
      const full = await gmailClient!.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      })

      const headers = full.data.payload?.headers || []
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
      const date = headers.find(h => h.name === 'Date')?.value || ''
      const snippet = full.data.snippet || ''

      emails.push({ from, subject, date, snippet, id: msg.id })
    }

    const speechText = emails.map(e => `From ${e.from}: ${e.subject}`).join('. ')

    return { success: true, data: emails, speechText }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function sendGmail({ to, subject, body }: { to: string; subject: string; body: string }): Promise<{ success: boolean; error?: string }> {
  if (!(await isGmailConnected())) {
    return { success: false, error: 'Gmail not connected.' }
  }

  try {
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ]
    const rawEmail = Buffer.from(emailParts.join('\r\n')).toString('base64url')

    await gmailClient!.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawEmail }
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function draftGmail({ to, subject, body }: { to: string; subject: string; body: string }): Promise<{ success: boolean; error?: string }> {
  if (!(await isGmailConnected())) {
    return { success: false, error: 'Gmail not connected.' }
  }

  try {
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ]
    const rawEmail = Buffer.from(emailParts.join('\r\n')).toString('base64url')

    await gmailClient!.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw: rawEmail }
      }
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
