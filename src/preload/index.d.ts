import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
      }
    }
    api: unknown
    iris: {
      startSession: () => void
      stopSession: () => void
      toggleMic: (isMuted: boolean) => void
      onSystemStatus: (
        callback: (status: 'STANDBY' | 'CONNECTING' | 'ACTIVE' | 'ERROR') => void
      ) => void
      onSpeakingState: (callback: (isSpeaking: boolean) => void) => void
      onTranscript: (callback: (data: { role: 'user' | 'model'; text: string }) => void) => void
      removeAllListeners: () => void
    }
  }
}
