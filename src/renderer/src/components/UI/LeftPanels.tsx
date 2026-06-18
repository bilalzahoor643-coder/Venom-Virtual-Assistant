import { useState, useEffect, useRef } from 'react'
import {
  Camera,
  Cpu,
  MemoryStick,
  Thermometer,
  Monitor,
  ArrowUp,
  ArrowDown,
  Radio
} from 'lucide-react'
import { getSystemStatus, SystemStats } from '@renderer/services/system-info'
import { LeftPanelsProps } from '@renderer/types/panel'

function getHealthColor(value: number, type: 'cpu' | 'ram' | 'temp') {
  let ratio = Math.min(1, Math.max(0, value / 100))
  if (type === 'temp') {
    ratio = Math.min(1, Math.max(0, (value - 20) / 50))
  }
  const hue = 120 * (1 - ratio)
  const saturation = 90
  const lightness = 50
  const mainColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  const darkColor = `hsl(${hue}, ${saturation}%, 15%)`
  const linear = `linear-gradient(90deg, ${darkColor}, ${mainColor})`
  const glow = mainColor
  return { linear, glow }
}

function PulseIndicator({ active, color = '#00ff88' }: { active: boolean; color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span
          className="absolute inline-flex h-full w-full animate-pulse rounded-full"
          style={{ background: color, opacity: 0.5 }}
        />
      )}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full shadow-lg"
        style={{
          background: active ? color : '#374151',
          boxShadow: active ? `0 0 12px ${color}` : 'none'
        }}
      />
    </span>
  )
}

function PremiumGlassPanel({
  children,
  className = '',
  accent = 'green',
  glow = false
}: {
  children: React.ReactNode
  className?: string
  accent?: 'green' | 'cyan' | 'orange' | 'blue' | 'purple' | 'none'
  glow?: boolean
}) {
  const accentMap: Record<string, { bg: string; border: string; glow: string }> = {
    green: {
      bg: 'from-[#00ff88]/[0.03] to-[#00ff88]/[0.01]',
      border: 'border-[#00ff88]/15 hover:border-[#00ff88]/25',
      glow: '#00ff88'
    },
    cyan: {
      bg: 'from-[#22d3ee]/[0.03] to-[#22d3ee]/[0.01]',
      border: 'border-[#22d3ee]/15 hover:border-[#22d3ee]/25',
      glow: '#22d3ee'
    },
    orange: {
      bg: 'from-[#f97316]/[0.03] to-[#f97316]/[0.01]',
      border: 'border-[#f97316]/15 hover:border-[#f97316]/25',
      glow: '#f97316'
    },
    blue: {
      bg: 'from-[#3b82f6]/[0.03] to-[#3b82f6]/[0.01]',
      border: 'border-[#3b82f6]/15 hover:border-[#3b82f6]/25',
      glow: '#3b82f6'
    },
    purple: {
      bg: 'from-[#a855f7]/[0.03] to-[#a855f7]/[0.01]',
      border: 'border-[#a855f7]/15 hover:border-[#a855f7]/25',
      glow: '#a855f7'
    },
    none: {
      bg: 'from-white/[0.02] to-white/[0.01]',
      border: 'border-white/8 hover:border-white/12',
      glow: '#ffffff'
    }
  }

  const config = accentMap[accent]

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-linear-to-br ${config.bg} backdrop-blur-xl border ${config.border} shadow-xl transition-all duration-300 ${
        glow ? 'hover:shadow-2xl' : ''
      } ${className}`}
      style={
        glow
          ? {
              boxShadow: `0 0 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 40px ${config.glow}15`
            }
          : {}
      }
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent z-0" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.02] mix-blend-screen z-0" />

      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  )
}

function NeonProgressBar({
  value,
  color,
  glow,
  showValue = false
}: {
  value: number
  color: string
  glow: string
  showValue?: boolean
}) {
  const safeValue = Math.min(100, Math.max(0, value || 0))
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-md transition-all duration-500"
          style={{
            width: `${safeValue}%`,
            background: color,
            filter: `blur(4px)`
          }}
        />

        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${safeValue}%`,
            background: color,
            boxShadow: `0 0 12px ${glow}, 0 0 24px ${glow}66, inset 0 1px 0 rgba(255,255,255,0.2)`
          }}
        />

        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`
          }}
        />
      </div>
      {showValue && (
        <span className="font-mono text-xs font-semibold text-white/70 min-w-10 text-right">
          {Math.round(safeValue)}%
        </span>
      )}
    </div>
  )
}

function MetricValue({
  value,
  unit,
  status,
  prefix = ''
}: {
  value: string | number
  unit?: string
  status?: 'good' | 'warning' | 'critical' | 'idle'
  prefix?: string
}) {
  const statusColors = {
    good: 'text-[#00ff88]',
    warning: 'text-[#f97316]',
    critical: 'text-[#ef4444]',
    idle: 'text-slate-400'
  }

  return (
    <div className="flex items-baseline gap-1">
      {prefix && <span className="font-mono text-xs text-white/40 font-light">{prefix}</span>}
      <span
        className={`font-mono font-bold text-2xl tracking-tight ${statusColors[status || 'idle']} drop-shadow-lg`}
      >
        {value}
      </span>
      {unit && (
        <span className="font-mono text-xs text-white/40 font-light tracking-wide">{unit}</span>
      )}
    </div>
  )
}

function IconBadge({
  icon,
  color,
  label,
  active = true
}: {
  icon: React.ReactNode
  color: string
  label?: string
  active?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-110"
        style={{
          borderColor: active ? `${color}44` : 'rgba(255,255,255,0.1)',
          background: active ? `${color}11` : 'rgba(0,0,0,0.2)',
          boxShadow: active ? `0 0 16px ${color}33` : 'none'
        }}
      >
        <div style={{ color: active ? color : 'rgba(255,255,255,0.3)' }}>{icon}</div>
      </div>
      {label && (
        <span className="font-mono text-[7px] tracking-widest text-white/50 uppercase text-center">
          {label}
        </span>
      )}
    </div>
  )
}

export default function LeftPanelsPremium({
  status,
  visionMode
}: LeftPanelsProps & { visionMode?: 'off' | 'camera' | 'screen' }) {
  const isActive = status !== 'STANDBY'
  const [bootPhase, setBootPhase] = useState(true)
  const [bootLogs, setBootLogs] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stats, setStats] = useState<SystemStats>({
    cpu: '0.0',
    memory: { total: '0.0', free: '0.0', usedPercentage: '0.0' },
    temperature: 0,
    os: { type: 'UNKNOWN', uptime: '0h' },
    network: { tx: 0, rx: 0, latency: 0 }
  })

  useEffect(() => {
    if (visionMode === 'off' || !visionMode || !isActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      return
    }

    let intervalId: NodeJS.Timeout

    const startVision = async () => {
      try {
        let stream: MediaStream
        if (visionMode === 'camera') {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        intervalId = setInterval(() => {
          if (videoRef.current && canvasRef.current && (window as any).iris?.sendVisionFrame) {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
            ctx?.drawImage(videoRef.current, 0, 0, 640, 480)

            const base64Full = canvasRef.current.toDataURL('image/jpeg', 0.8)
            const cleanBase64 = base64Full.replace(/^data:image\/jpeg;base64,/, '')

            ;(window as any).iris.sendVisionFrame(cleanBase64)
          }
        }, 1000)
      } catch (err) {
        console.error('Vision access denied:', err)
      }
    }

    startVision()

    return () => {
      clearInterval(intervalId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [visionMode, isActive])

  useEffect(() => {
    if (!isActive) {
      setBootPhase(true)
      setBootLogs([])
      return
    }

    if (bootPhase) {
      const logs = [
        '› KERNEL_INIT ........... OK',
        '› MOUNT_VFS ............. OK',
        '› HW_TELEM_LINK ..... SYNC',
        '› OPTICS_DRIVER ... READY',
        '› SYSTEM_READY ........ ✓'
      ]
      let i = 0
      const bootInterval = setInterval(() => {
        if (i < logs.length) {
          setBootLogs((p) => [...p, logs[i]])
          i++
        } else {
          clearInterval(bootInterval)
          setTimeout(() => setBootPhase(false), 900)
        }
      }, 120)
      return () => clearInterval(bootInterval)
    }

    let pollInterval: NodeJS.Timeout
    const fetchStats = async () => {
      const liveStats = await getSystemStatus()
      if (liveStats) {
        setStats(liveStats)
      }
    }

    fetchStats()
    pollInterval = setInterval(fetchStats, 3000)
    return () => clearInterval(pollInterval)
  }, [isActive, bootPhase])

  const cpuValue = parseFloat(stats.cpu) || 0
  const ramValue = parseFloat(stats.memory.usedPercentage) || 0
  const tempValue = stats.temperature || 0

  const cpuColors = getHealthColor(cpuValue, 'cpu')
  const ramColors = getHealthColor(ramValue, 'ram')
  const tempColors = getHealthColor(tempValue, 'temp')

  const getCPUStatus = () => {
    if (!isActive) return 'idle'
    if (cpuValue > 80) return 'critical'
    if (cpuValue > 60) return 'warning'
    return 'good'
  }

  const getRAMStatus = () => {
    if (!isActive) return 'idle'
    if (ramValue > 85) return 'critical'
    if (ramValue > 70) return 'warning'
    return 'good'
  }

  const getTempStatus = () => {
    if (!isActive) return 'idle'
    if (tempValue > 85) return 'critical'
    if (tempValue > 70) return 'warning'
    return 'good'
  }

  return (
    <div className="flex h-full flex-col gap-4 p-0">
      <PremiumGlassPanel accent="green" glow>
        <div className="p-4 flex flex-col h-full gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PulseIndicator active={isActive && visionMode !== 'off'} />
              <div className="flex flex-col">
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/60 uppercase font-light">
                  Vision Feed
                </span>
                <span className="font-mono text-[9px] tracking-tight text-white/40">
                  Optics @ 60Hz
                </span>
              </div>
            </div>
            <div
              className="px-2.5 py-1 rounded-lg border backdrop-blur-sm text-[8px] font-mono tracking-widest uppercase font-semibold transition-all duration-500"
              style={
                visionMode && visionMode !== 'off'
                  ? {
                      borderColor: 'rgba(0, 255, 136, 0.3)',
                      background: 'rgba(0, 255, 136, 0.08)',
                      color: '#00ff88',
                      boxShadow: '0 0 12px rgba(0, 255, 136, 0.15)'
                    }
                  : {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }
              }
            >
              {visionMode && visionMode !== 'off' ? 'Tracking' : isActive ? 'Ready' : 'Offline'}
            </div>
          </div>

          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-linear-to-br from-black/60 to-black/40 flex-1">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 z-10 w-full h-full object-cover transition-opacity duration-500 ${
                visionMode && visionMode !== 'off' ? 'opacity-85' : 'opacity-0'
              }`}
            />

            <canvas ref={canvasRef} width="640" height="480" className="hidden" />

            <div
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 transition-opacity duration-500 ${
                !visionMode || visionMode === 'off'
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <div
                className="rounded-xl border p-3 transition-all duration-500"
                style={
                  isActive
                    ? {
                        borderColor: 'rgba(0, 255, 136, 0.2)',
                        background: 'rgba(0, 255, 136, 0.08)'
                      }
                    : {
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        background: 'rgba(0, 0, 0, 0.2)'
                      }
                }
              >
                <Camera
                  size={24}
                  style={{ color: isActive ? '#00ff88' : 'rgba(255, 255, 255, 0.3)' }}
                  strokeWidth={1.5}
                />
              </div>
              <span className="font-mono text-[8px] tracking-[0.3em] text-white/40 uppercase">
                No Input
              </span>
            </div>

            {visionMode && visionMode !== 'off' && (
              <>
                {[
                  'top-3 left-3 border-t border-l',
                  'top-3 right-3 border-t border-r',
                  'bottom-3 left-3 border-b border-l',
                  'bottom-3 right-3 border-b border-r'
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute h-4 w-4 z-30 ${pos} rounded-sm transition-colors duration-500`}
                    style={{ borderColor: 'rgba(0, 255, 136, 0.6)' }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </PremiumGlassPanel>

      <PremiumGlassPanel accent="cyan" glow>
        <div className="p-4 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBadge icon={<Radio size={16} />} color="#22d3ee" active={isActive} />
              <div className="flex flex-col">
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/60 uppercase font-light">
                  Network
                </span>
                <span className="font-mono text-[9px] tracking-tight text-white/40">
                  Telemetry Link
                </span>
              </div>
            </div>
            <div
              className="px-2.5 py-1 rounded-lg border backdrop-blur-sm text-[8px] font-mono tracking-widest uppercase font-semibold transition-all duration-500"
              style={
                isActive
                  ? {
                      borderColor: 'rgba(34, 211, 238, 0.3)',
                      background: 'rgba(34, 211, 238, 0.08)',
                      color: '#22d3ee',
                      boxShadow: '0 0 12px rgba(34, 211, 238, 0.15)'
                    }
                  : {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }
              }
            >
              {isActive ? 'Connected' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PremiumGlassPanel accent="none" className="p-3">
              <span className="font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase mb-2 block">
                Latency
              </span>
              <MetricValue
                value={isActive ? stats.network?.latency : '—'}
                unit="ms"
                status={isActive ? 'good' : 'idle'}
              />
            </PremiumGlassPanel>

            <PremiumGlassPanel accent="none" className="p-3">
              <span className="font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase mb-2 block">
                Uptime
              </span>
              <MetricValue
                value={isActive ? stats.os?.uptime : '—'}
                status={isActive ? 'good' : 'idle'}
              />
            </PremiumGlassPanel>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#ec4899]/20 bg-[#ec4899]/8">
                <ArrowUp size={14} style={{ color: '#ec4899' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <NeonProgressBar
                  value={isActive ? stats.network?.tx : 0}
                  color="#ec4899"
                  glow="#ec4899"
                  showValue
                />
              </div>
              <span className="font-mono text-[8px] text-[#ec4899]/70 uppercase tracking-wider min-w-6">
                TX
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/8">
                <ArrowDown size={14} style={{ color: '#3b82f6' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <NeonProgressBar
                  value={isActive ? stats.network?.rx : 0}
                  color="#3b82f6"
                  glow="#3b82f6"
                  showValue
                />
              </div>
              <span className="font-mono text-[8px] text-[#3b82f6]/70 uppercase tracking-wider min-w-6">
                RX
              </span>
            </div>
          </div>
        </div>
      </PremiumGlassPanel>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <PremiumGlassPanel accent="green" className="p-4 flex flex-col justify-between" glow>
          <div>
            <IconBadge icon={<Cpu size={14} />} color="#00ff88" active={isActive} />
            <div className="mt-3 space-y-1">
              <span className="block font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase">
                CPU Load
              </span>
              <MetricValue value={isActive ? stats.cpu : '—'} unit="%" status={getCPUStatus()} />
            </div>
          </div>
          <div className="mt-4">
            <NeonProgressBar
              value={isActive ? cpuValue : 0}
              color={cpuColors.linear}
              glow={cpuColors.glow}
            />
          </div>
        </PremiumGlassPanel>

        <PremiumGlassPanel accent="orange" className="p-4 flex flex-col justify-between" glow>
          <div>
            <IconBadge icon={<MemoryStick size={14} />} color="#f97316" active={isActive} />
            <div className="mt-3 space-y-1">
              <span className="block font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase">
                RAM Usage
              </span>
              <MetricValue
                value={isActive ? stats.memory.usedPercentage : '—'}
                unit="%"
                status={getRAMStatus()}
              />
            </div>
          </div>
          <div className="mt-4">
            <NeonProgressBar
              value={isActive ? ramValue : 0}
              color={ramColors.linear}
              glow={ramColors.glow}
            />
          </div>
        </PremiumGlassPanel>

        <PremiumGlassPanel accent="blue" className="p-4 flex flex-col justify-between" glow>
          <div>
            <IconBadge icon={<Thermometer size={14} />} color="#3b82f6" active={isActive} />
            <div className="mt-3 space-y-1">
              <span className="block font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase">
                Temperature
              </span>
              <MetricValue
                value={isActive ? tempValue.toFixed(1) : '—'}
                unit="°C"
                status={getTempStatus()}
              />
            </div>
          </div>
          <div className="mt-4">
            <NeonProgressBar
              value={isActive ? tempValue : 0}
              color={tempColors.linear}
              glow={tempColors.glow}
            />
          </div>
        </PremiumGlassPanel>

        <PremiumGlassPanel accent="purple" className="p-4 flex flex-col justify-between" glow>
          <div>
            <IconBadge icon={<Monitor size={14} />} color="#a855f7" active={isActive} />
            <div className="mt-3 space-y-1">
              <span className="block font-mono text-[7px] tracking-[0.2em] text-white/50 uppercase">
                System Status
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            {bootPhase && isActive ? (
              <div className="space-y-1">
                {bootLogs.map((log, i) => (
                  <span
                    key={i}
                    className="block font-mono text-[7px] leading-relaxed tracking-wide text-[#a855f7]/60"
                  >
                    {log}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <div className="font-mono text-lg font-bold tracking-tight text-white">
                  {isActive ? stats.os?.type : '—'}
                </div>
                {isActive && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20">
                    <PulseIndicator active={true} color="#a855f7" />
                    <span className="font-mono text-[7px] text-[#a855f7] uppercase tracking-widest">
                      Active
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </PremiumGlassPanel>
      </div>
    </div>
  )
}
