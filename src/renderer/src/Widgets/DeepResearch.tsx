import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  Globe,
  Cpu,
  CheckCircle2,
  ShieldAlert,
  Compass,
  Layers,
  Terminal,
  X
} from 'lucide-react'

gsap.registerPlugin(useGSAP)

interface AgentLog {
  id: string
  phase: number
  message: string
  timestamp: string
}

export default function ResearchWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusText, setStatusText] = useState('Initializing Multi-Agent Node...')
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: containerRef })

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleStart = (_event: any, data: { query: string }) => {
      setQuery(data.query)
      setIsSuccess(null)
      setSummary('')
      setLogs([])
      setCurrentPhase(1)
      setIsOpen(true)
      setStatusText('Booting IRIS-X Autonomous Agent Strategy Core...')
      if (progressRef.current) gsap.to(progressRef.current, { width: '5%', duration: 0.4 })
    }

    const handleProgress = contextSafe(
      (_event: any, data: { status: string; file: string; totalFound: number }) => {
        const phaseNumber = data.totalFound
        setCurrentPhase(phaseNumber)

        const time = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        setLogs((prev) => [
          { id: Math.random().toString(), phase: phaseNumber, message: data.file, timestamp: time },
          ...prev
        ])

        if (textRef.current) {
          gsap.to(textRef.current, {
            y: -8,
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
              setStatusText(data.file)
              gsap.to(textRef.current, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
            }
          })
        }

        if (progressRef.current) {
          const percentages = ['20%', '40%', '65%', '85%', '95%']
          const targetWidth = percentages[phaseNumber - 1] || '90%'
          gsap.to(progressRef.current, { width: targetWidth, duration: 0.8, ease: 'power3.out' })
        }
      }
    )

    const handleDone = contextSafe((_event: any, data: { success: boolean; summary?: string }) => {
      const success = data.success
      setIsSuccess(success)
      setCurrentPhase(5)

      if (success && data.summary) {
        setSummary(data.summary)
      }

      if (textRef.current) {
        gsap.to(textRef.current, {
          opacity: 0,
          y: -8,
          duration: 0.15,
          onComplete: () => {
            setStatusText(
              success
                ? 'Intelligence Core: Operation Concluded Successfully.'
                : 'Strategy Core: Pipeline Aborted.'
            )
            gsap.to(textRef.current, { opacity: 1, y: 0, duration: 0.25 })
          }
        })
      }

      if (progressRef.current) {
        gsap.to(progressRef.current, {
          width: '100%',
          backgroundColor: success ? '#00E676' : '#FF5252',
          duration: 0.5,
          ease: 'power4.out'
        })
      }

    })

    window.electron.ipcRenderer.on('deep-research-start', handleStart)
    window.electron.ipcRenderer.on('deep-research-done', handleDone)
    window.electron.ipcRenderer.on('oracle-progress', handleProgress)

    return () => {
      window.electron.ipcRenderer.removeListener('deep-research-start', handleStart)
      window.electron.ipcRenderer.removeListener('deep-research-done', handleDone)
      window.electron.ipcRenderer.removeListener('oracle-progress', handleProgress)
    }
  }, [contextSafe])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-9999 flex items-center justify-center p-4 selection:bg-cyan-500/30">
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.96, y: 15, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, y: 10, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-4xl h-[85vh] bg-neutral-950/75 backdrop-blur-3xl border border-neutral-800/60 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] text-white font-sans overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Compass
                    className="w-5 h-5 text-cyan-400 animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                  <div className="absolute inset-0 bg-cyan-400/20 blur-sm rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-[0.25em] text-neutral-400 uppercase flex items-center gap-2">
                    IRIS-X Core Engine{' '}
                    <span className="text-cyan-400 font-mono tracking-normal bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30 text-[10px]">
                      v2.4.0
                    </span>
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono tracking-wider mt-0.5">
                    AUTONOMOUS MULTI-AGENT SWARM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isSuccess !== null && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-neutral-800/60 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
              <div className="lg:col-span-2 border-r border-neutral-800/50 bg-neutral-950/40 p-5 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70 block mb-1.5">
                      Target Objective
                    </span>
                    <div className="text-sm font-medium text-neutral-200 leading-relaxed bg-neutral-900/40 border border-neutral-800/40 p-3.5 rounded-xl border-l-2 border-l-cyan-500 shadow-inner">
                      "{query}"
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2 flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-neutral-500" /> Strategic Event Stream
                    </span>
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar text-[11px] font-mono">
                      <AnimatePresence>
                        {logs.map((log) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-2 rounded bg-neutral-900/30 border border-neutral-900 flex items-start gap-2.5 text-neutral-400"
                          >
                            <span className="text-cyan-500/70 text-[10px]">{log.timestamp}</span>
                            <span className="text-neutral-600 font-bold">[P{log.phase}]</span>
                            <span className="flex-1 text-neutral-300 leading-normal">
                              {log.message}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {logs.length === 0 && (
                        <p className="text-neutral-600 italic px-1">
                          Awaiting strategy initialization signals...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-900 flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${isSuccess === false ? 'bg-red-500 shadow-[0_0_10px_#EF4444]' : 'bg-emerald-400 shadow-[0_0_10px_#10B981]'} animate-pulse`}
                  />
                  <div className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                    Status:{' '}
                    {isSuccess === null
                      ? `Executing Swarm Phase ${currentPhase}/5`
                      : isSuccess
                        ? 'Dossier Loaded'
                        : 'Agent Fault'}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-neutral-950/20 flex flex-col overflow-hidden">
                <div className="p-4 bg-neutral-900/30 border-b border-neutral-900 flex items-center gap-3.5 px-6">
                  <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    {currentPhase <= 2 ? (
                      <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
                    ) : currentPhase <= 4 ? (
                      <Cpu className="w-4 h-4 text-purple-400" />
                    ) : isSuccess === false ? (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    ) : (
                      <Layers className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div
                    ref={textRef}
                    className="text-xs font-mono tracking-wide text-neutral-300 flex-1 truncate"
                  >
                    {statusText}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-linear-to-b from-neutral-950/50 to-transparent">
                  <AnimatePresence mode="wait">
                    {summary ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="prose prose-invert max-w-none font-mono text-xs text-neutral-300 leading-relaxed space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> SECURE EXECUTIVE INTEL DOSSIER
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap select-text bg-neutral-900/10 rounded-xl border border-neutral-800/30 p-1">
                          {summary}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-12 h-12 rounded-xl border border-neutral-800 flex items-center justify-center bg-neutral-900/40 relative">
                          <Cpu className="w-5 h-5 text-neutral-600 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                            Assembling High-Fidelity Dataset
                          </h4>
                          <p className="text-[11px] text-neutral-500 font-mono max-w-xs mt-1.5 mx-auto leading-normal">
                            Cross-referencing multiple live API lookup vectors to map contextual
                            intelligence matrices.
                          </p>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="w-full bg-neutral-900/20 border-t border-neutral-800/40 p-4 px-6 flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden relative">
                <div
                  ref={progressRef}
                  className="h-full bg-linear-to-r from-cyan-500 to-indigo-500 rounded-full w-0 shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                {currentPhase === 5 ? '100%' : `${currentPhase * 20}%`}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
