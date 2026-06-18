import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  ShieldCheck,
  TerminalSquare,
  Network,
  Database,
  Lock,
  CheckCircle2,
  Loader2,
  Activity
} from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'

export default function LoginPage() {
  const [bootLogs, setBootLogs] = useState<string[]>([])
  const [isReady, setIsReady] = useState(false)

  const handleGoogleLogin = () => {
    window.open(`${import.meta.env.VITE_BACKEND_KEY}/users/google`, '_blank')
  }

  useEffect(() => {
    const sequence = [
      'Mounting secure enclave...',
      'Verifying local file system...',
      'Loading neural routing protocols...',
      'Securing internal network bridge...',
      'System environment nominal.'
    ]

    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep < sequence.length) {
        setBootLogs((prev) => [...prev, sequence[currentStep]])
        currentStep++
      } else {
        setIsReady(true)
        clearInterval(interval)
      }
    }, 400) // Sped up the animation for a snappier feel

    return () => clearInterval(interval)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  }

  const cardVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  }

  const sidePanelVariants: any = {
    hidden: { opacity: 0, filter: 'blur(4px)' },
    show: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: 'easeOut' } }
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans flex items-center justify-center p-4 lg:p-8 relative overflow-hidden select-none">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-zinc-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[32px_32px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
      >
        <motion.div
          variants={sidePanelVariants}
          className="hidden lg:flex col-span-3 flex-col bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 shadow-xl relative"
        >
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <TerminalSquare className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">
              Boot Sequence
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-end font-mono text-[11px] leading-relaxed gap-3">
            <AnimatePresence>
              {bootLogs.map((log, index) => {
                const isLast = index === bootLogs.length - 1
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-3 ${isLast && isReady ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}
                  >
                    <span className="mt-0.5">
                      {isLast && isReady ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Loader2 size={12} className="animate-spin opacity-50" />
                      )}
                    </span>
                    <span>{log}</span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center"
        >
          <div className="w-full bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-10 shadow-2xl relative">
            <div className="flex flex-col items-center text-center mb-10">
              <img src="/Logo.png" className="w-24 h-24 object-cover" />
              <h1 className="text-3xl font-bold tracking-tight text-green-600 mb-2">IRIS AI</h1>
              <p className="text-zinc-400 text-sm font-medium">Desktop Voice Assistant</p>
            </div>

            <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed">
                Authentication is handled securely via OAuth. Your AI models, API keys, and
                workspace data remain fully encrypted on this local machine.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="relative flex w-full items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-white hover:bg-zinc-100 text-black border border-transparent font-bold text-sm transition-shadow duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer"
            >
              <FcGoogle className="w-5 h-5" />
              Continue with Google
            </motion.button>

            <div className="mt-6 flex items-center justify-center gap-2 text-zinc-500 text-xs font-medium">
              <Lock size={12} />
              End-to-End Encrypted Access
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={sidePanelVariants}
          className="hidden lg:flex col-span-3 flex-col bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">
              Environment
            </h3>
          </div>

          <div className="flex flex-col gap-8 flex-1">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  <Network size={14} /> Network Bridge
                </span>
                <span className={isReady ? 'text-emerald-400' : 'text-zinc-500'}>
                  {isReady ? 'Connected' : 'Scanning...'}
                </span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-500 ease-out ${isReady ? 'w-full bg-emerald-500' : 'w-1/3 bg-zinc-600'}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  <Database size={14} /> Local Storage
                </span>
                <span className="text-zinc-500">Secured</span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-white/5">
                <div className="w-full h-full bg-zinc-600" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  <Lock size={14} /> Security Vault
                </span>
                <span className="text-zinc-500">Standby</span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-white/5">
                <div className="w-[15%] h-full bg-zinc-600" />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
              IRIS operates strictly within a local ecosystem. Private data is not exposed to
              external servers.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
