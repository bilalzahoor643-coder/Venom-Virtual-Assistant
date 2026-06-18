import { exec } from 'child_process'
import os from 'os'

const runPowerShell = (cmd: string): Promise<string> => {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${cmd}"`, (error, stdout) => {
      if (error) return resolve('')
      resolve(stdout ? stdout.trim() : '')
    })
  })
}

export async function getLiveLocation() {
  try {
    if (os.platform() === 'win32') {
      const psCommand = `Add-Type -AssemblyName System.Device; $w = New-Object System.Device.Location.GeoCoordinateWatcher(1); $w.Start(); $t = 0; while($w.Position.Location.IsUnknown -and $t -lt 35) { Start-Sleep -Milliseconds 200; $t++ }; if ($w.Permission -eq 'Denied') { Write-Output 'DENIED' } elseif ($w.Position.Location.IsUnknown) { Write-Output 'UNKNOWN' } else { Write-Output "$($w.Position.Location.Latitude),$($w.Position.Location.Longitude)" }`

      const osLocation = await runPowerShell(psCommand)

      if (osLocation === 'DENIED') {
        console.warn('⚠️ IRIS: Windows Location Services are DISABLED in Windows Privacy Settings.')
      } else if (osLocation === 'UNKNOWN') {
        console.warn(
          '⚠️ IRIS: Windows could not lock onto a GPS/Wi-Fi signal (Hardware limitation or Timeout).'
        )
      } else if (osLocation && osLocation.includes(',')) {
        const [lat, lon] = osLocation.split(',')

        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        )
        const geoData = await geoRes.json()

        return {
          city: geoData.city || geoData.locality,
          region: geoData.principalSubdivision,
          country: geoData.countryName,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          accuracy: 'Exact (Hardware/Wi-Fi)',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          fullString: `${geoData.city || geoData.locality}, ${geoData.principalSubdivision}, ${geoData.countryName}`
        }
      }
    }

    console.log('📡 IRIS: Falling back to IP-based location mapping...')

    const ipRes = await fetch('https://ipwho.is/')
    const ipData = await ipRes.json()

    if (ipData && ipData.success) {
      return {
        city: ipData.city,
        region: ipData.region,
        country: ipData.country,
        lat: parseFloat(ipData.latitude),
        lon: parseFloat(ipData.longitude),
        accuracy: 'Approximate (ISP Data Center)',
        timezone: ipData.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone,
        fullString: `${ipData.city}, ${ipData.region}, ${ipData.country}`
      }
    }

    return null
  } catch (error: any) {
    console.error('❌ IRIS Location Manager Error:', error)
    return null
  }
}
