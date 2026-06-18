import { openApp } from '../logic/app-launcher'
import { executeGhostSequence } from '../logic/ghost-control'

export async function playSpotifyMusic(songName: string): Promise<string> {
  try {
    await openApp('spotify')

    const navActions = [
      { type: 'wait', ms: 5000 },
      { type: 'click' },
      { type: 'press', key: 'k', modifiers: ['control'] },
      { type: 'wait', ms: 800 },
      { type: 'press', key: 'a', modifiers: ['control'] },
      { type: 'press', key: 'backspace' },
      { type: 'type', text: songName },
      { type: 'wait', ms: 800 },
      { type: 'press', key: 'enter' },
      { type: 'wait', ms: 1500 },
      { type: 'press', key: 'tab' },
      { type: 'wait', ms: 200 },
      { type: 'press', key: 'tab' },
      { type: 'wait', ms: 200 },
      { type: 'press', key: 'enter' },
      { type: 'wait', ms: 200 },
      { type: 'press', key: 'enter' }
    ]

    await executeGhostSequence(navActions)

    return `✅ Now playing ${songName} on Spotify.`
  } catch (error) {
    return `❌ Failed to play ${songName}.`
  }
}
