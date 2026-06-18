import { openApp } from '../logic/app-launcher'
import { copyFileToClipboard, executeGhostSequence } from '../logic/ghost-control'

export async function sendWhatsAppMessage({
  name,
  message,
  filePath
}: {
  name: string
  message: string
  filePath?: string
}): Promise<string> {
  try {
    if (filePath) {
      await copyFileToClipboard(filePath)
    }

    await openApp('whatsapp')

    const navActions = [
      { type: 'wait', ms: 1500 },
      { type: 'click' },
      { type: 'press', key: 'n', modifiers: ['control'] },
      { type: 'wait', ms: 500 },
      { type: 'press', key: 'a', modifiers: ['control'] },
      { type: 'press', key: 'backspace' },
      { type: 'type', text: name },
      { type: 'wait', ms: 500 },
      { type: 'press', key: 'down' },
      { type: 'press', key: 'enter' },
      { type: 'wait', ms: 500 },
      { type: 'click' }
    ]
    await executeGhostSequence(navActions)

    if (filePath) {
      await executeGhostSequence([
        { type: 'press', key: 'v', modifiers: ['control'] },
        { type: 'wait', ms: 2500 },
        { type: 'type', text: message },
        { type: 'press', key: 'enter' }
      ])
    } else {
      await executeGhostSequence([
        { type: 'paste', text: message },
        { type: 'wait', ms: 500 },
        { type: 'press', key: 'enter' }
      ])
    }

    return `✅ Message sent to ${name}.`
  } catch (error) {
    return '❌ Failed to send.'
  }
}

export async function scheduleWhatsAppMessage({
  name,
  message,
  delayMinutes,
  filePath
}: {
  name: string
  message: string
  delayMinutes: number
  filePath?: string
}): Promise<string> {
  if (!delayMinutes || delayMinutes <= 0) {
    return await sendWhatsAppMessage({ name, message, filePath })
  }

  setTimeout(
    () => {
      executeGhostSequence([{ type: 'type', text: '' }])
      sendWhatsAppMessage({ name, message, filePath })
    },
    delayMinutes * 60 * 1000
  )

  return `✅ Scheduled! I will send the message to ${name} in ${delayMinutes} minutes.`
}
