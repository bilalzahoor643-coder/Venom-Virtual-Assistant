import { BrowserWindow } from 'electron'
import { startTunnel } from 'untun'

let activeTunnel: any = null

export async function openWormhole(port: number) {
  try {
    if (activeTunnel) {
      await activeTunnel.close()
      activeTunnel = null
    }

    activeTunnel = await startTunnel({
      port,
      acceptCloudflareNotice: true
    })

    const tunnelUrl = await activeTunnel.getURL()

    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wormhole-opened', { url: tunnelUrl })
    }

    return `✅ Wormhole established successfully! Local port ${port} is now live globally at ${tunnelUrl}.`
  } catch (err: any) {
    console.error('[Wormhole Error]:', err)
    return `❌ Failed to open wormhole: ${err.message}`
  }
}

export async function closeWormhole() {
  try {
    if (activeTunnel) {
      await activeTunnel.close()
      activeTunnel = null
    }

    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wormhole-closed')
    }

    return `✅ Wormhole closed successfully. Localhost is no longer exposed to the internet.`
  } catch (err: any) {
    return `❌ Failed to close wormhole: ${err.message}`
  }
}
