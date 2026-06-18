import { useState, useEffect, useRef } from 'react'
import {
  RiShieldCheckLine,
  RiFingerprintLine,
  RiLockPasswordLine,
  RiCameraLensLine,
  RiAlertLine,
  RiDatabase2Line,
  RiCpuLine,
  RiWifiLine,
  RiLoader4Line,
  RiCheckLine
} from 'react-icons/ri'
import * as faceapi from 'face-api.js'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'

interface LockScreenProps {
  onUnlock: () => void
}

type AuthMode = 'face' | 'pin'

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('face')
  const [pin, setPin] = useState('')

  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [needsFaceSetup, setNeedsFaceSetup] = useState(false)

  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [aiStatus, setAiStatus] = useState('Initializing Optics...')
  const [isScanning, setIsScanning] = useState(false)

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [decryptProgress, setDecryptProgress] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const laserRef = useRef<HTMLDivElement>(null)

  const [time, setTime] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer
        .invoke('check-vault-status')
        .then((status: { hasPin: boolean; hasFace: boolean }) => {
          setNeedsPinSetup(!status.hasPin)
          setNeedsFaceSetup(!status.hasFace)
          setIsLoading(false)
          if (authMode === 'face') loadNeuralNets(!status.hasFace)
        })
        .catch(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (authMode === 'face' && !isLoading && !isAuthorized) {
      startHardware()
      if (laserRef.current) {
        gsap.fromTo(
          laserRef.current,
          { top: '0%', opacity: 0 },
          { top: '100%', opacity: 0.6, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' }
        )
      }
    } else if (!isAuthorized) {
      stopCamera()
      inputRef.current?.focus()
    }
  }, [authMode, isLoading, isAuthorized])

  const startHardware = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch((e) => console.warn('Autoplay prevented:', e))
      }
    } catch (err) {
      console.error('Camera Hardware Error:', err)
      setAiStatus('Optics Offline. Please use PIN.')
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const loadNeuralNets = async (isFaceSetup: boolean) => {
    try {
      setAiStatus('Loading Biometric Models...')
      const MODEL_URL = './models'

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ])
      startScanning(isFaceSetup)
    } catch (err) {
      setAiStatus('Biometrics Offline. Please use PIN.')
    }
  }

  const triggerAccessGranted = () => {
    setIsAuthorized(true)
    setError(false)
    stopCamera()
    setAiStatus('Identity Verified. Unlocking...')

    let progress = 0
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10
      if (progress >= 100) {
        progress = 100
        clearInterval(progressInterval)
      }
      setDecryptProgress(progress)
    }, 150)

    setTimeout(() => setAiStatus('System Ready.'), 1500)
    setTimeout(() => {
      onUnlock()
    }, 2500)
  }

  const startScanning = (isFaceSetup: boolean) => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    setIsScanning(true)

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4 || error || isAuthorized) return

      try {
        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
        const detection = await faceapi
          .detectSingleFace(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (detection) {
          const descriptorArray = Array.from(detection.descriptor)

          if (isFaceSetup) {
            clearInterval(scanIntervalRef.current!)
            setAiStatus('Face acquired. Enrolling...')
            await window.electron.ipcRenderer.invoke('setup-vault-face', descriptorArray)
            setNeedsFaceSetup(false)
            triggerAccessGranted()
          } else {
            setAiStatus('Analyzing Biometrics...')
            const isMatch = await window.electron.ipcRenderer.invoke(
              'verify-vault-face',
              descriptorArray
            )

            if (isMatch) {
              clearInterval(scanIntervalRef.current!)
              triggerAccessGranted()
            } else {
              setError(true)
              setAiStatus('Unrecognized User')
              setTimeout(() => {
                setError(false)
                setAiStatus('Scanning...')
              }, 2500)
            }
          }
        } else {
          if (!error) setAiStatus('Position face in frame')
        }
      } catch (scanErr) {
        console.error('Scan error:', scanErr)
      }
    }, 800)
  }

  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error || authMode !== 'pin' || isAuthorized) return
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setPin(value)
      if (value.length === 4) processPin(value)
    }
  }

  const processPin = async (currentPin: string) => {
    if (needsPinSetup) {
      await window.electron.ipcRenderer.invoke('setup-vault-pin', currentPin)
      triggerAccessGranted()
    } else {
      const isValid = await window.electron.ipcRenderer.invoke('verify-vault-pin', currentPin)
      if (isValid) {
        triggerAccessGranted()
      } else {
        setError(true)
        setTimeout(() => {
          setPin('')
          setError(false)
          inputRef.current?.focus()
        }, 800)
      }
    }
  }

  if (isLoading) return <div className="w-screen h-screen bg-black"></div>

  const headerText = error
    ? 'Access Denied'
    : isAuthorized
      ? 'Access Granted'
      : needsPinSetup || needsFaceSetup
        ? 'Setup Vault Security'
        : 'System Locked'

  return (
    <div
      className="flex flex-col items-center justify-center w-screen h-screen bg-black relative overflow-hidden select-none font-sans"
      onClick={() => authMode === 'pin' && !isAuthorized && inputRef.current?.focus()}
    >
      <div
        className={`absolute inset-0 transition-colors duration-1000 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] ${
          error
            ? 'from-red-900/10 via-black to-black'
            : isAuthorized
              ? 'from-emerald-900/20 via-black to-black'
              : 'from-zinc-900/20 via-black to-black'
        }`}
      />

      <div className="absolute top-0 w-full h-14 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-8 z-50 text-xs font-mono tracking-widest text-zinc-400 uppercase">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <RiCpuLine size={16} className={isAuthorized ? 'text-emerald-400' : 'text-zinc-500'} />
            System Core
          </span>
          <span className="flex items-center gap-2">
            <RiDatabase2Line
              size={16}
              className={isAuthorized ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}
            />
            {isAuthorized ? 'Decrypting Vault' : 'Vault Locked'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-zinc-500">
            <RiWifiLine size={16} /> Localhost
          </span>
          <span className="text-white font-bold">{time}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`z-10 flex flex-col items-center gap-8 p-12 w-137.5 rounded-3xl backdrop-blur-2xl border transition-all duration-500 ${
          error
            ? 'border-red-500/50 bg-red-950/10 shadow-[0_0_80px_rgba(239,68,68,0.15)]'
            : isAuthorized
              ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_80px_rgba(16,185,129,0.15)]'
              : 'border-white/10 bg-zinc-950/60 shadow-2xl'
        }`}
      >
        <div className="text-center w-full">
          <h1
            className={`text-2xl font-bold tracking-wider flex items-center justify-center gap-3 uppercase transition-colors ${
              error ? 'text-red-500' : isAuthorized ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {error && <RiAlertLine size={28} />}
            {isAuthorized && <RiCheckLine size={28} />}
            {headerText}
          </h1>

          <div className="flex items-center justify-center w-full mt-4">
            <div
              className={`px-4 py-2 rounded-lg border backdrop-blur-md flex items-center gap-2 transition-all ${
                error
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : isAuthorized
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-black/40 border-white/10 text-zinc-400'
              }`}
            >
              {!error && !isAuthorized && (
                <RiFingerprintLine
                  size={16}
                  className={isScanning ? 'animate-pulse text-emerald-500' : ''}
                />
              )}
              {isAuthorized && (
                <RiLoader4Line size={16} className="animate-spin text-emerald-400" />
              )}
              <p className="text-xs font-medium tracking-wide uppercase">{aiStatus}</p>
            </div>
          </div>
        </div>

        <div className="h-70 flex items-center justify-center w-full relative">
          <AnimatePresence mode="wait">
            {isAuthorized && (
              <motion.div
                key="authorized-view"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center justify-center gap-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="bg-emerald-500/10 p-8 rounded-full border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  <RiShieldCheckLine size={64} className="text-emerald-400" />
                </motion.div>

                <div className="w-full flex flex-col gap-3 px-8">
                  <div className="flex justify-between text-xs font-mono text-emerald-400 uppercase font-semibold">
                    <span>Unlocking</span>
                    <span>{decryptProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-emerald-500/20">
                    <motion.div
                      className="h-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
                      style={{ width: `${decryptProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {!isAuthorized && authMode === 'face' && (
              <motion.div
                key="face-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative flex items-center justify-center w-70 h-70 rounded-2xl border-2 overflow-hidden bg-black transition-colors ${
                  error
                    ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                    : 'border-white/10'
                }`}
              >
                <video
                  ref={videoRef}
                  className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity ${error ? 'opacity-40 grayscale' : 'opacity-80'}`}
                  autoPlay
                  muted
                  playsInline
                />

                {isScanning && !error && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      ref={laserRef}
                      className="absolute left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_15px_#34d399]"
                    />
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500/70 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500/70 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500/70 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500/70 rounded-br-lg" />
                  </div>
                )}
              </motion.div>
            )}

            {!isAuthorized && authMode === 'pin' && (
              <motion.div
                key="pin-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center w-full"
              >
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = pin.length > index
                    const isActive = pin.length === index && !error
                    return (
                      <div
                        key={index}
                        className={`w-16 h-20 flex items-center justify-center text-3xl rounded-xl border-2 transition-all duration-300 ${
                          isFilled
                            ? error
                              ? 'border-red-500 bg-red-500/10 text-red-500'
                              : 'border-white bg-white text-black'
                            : isActive
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105'
                              : 'border-white/10 bg-black/40 text-zinc-700'
                        }`}
                      >
                        {isFilled ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            ●
                          </motion.span>
                        ) : isActive ? (
                          <span className="animate-pulse text-emerald-500/50 font-light">|</span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isAuthorized && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (authMode === 'face') {
                setAuthMode('pin')
                setTimeout(() => inputRef.current?.focus(), 400)
              } else {
                setAuthMode('face')
                setPin('')
              }
            }}
            className="mt-4 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all flex items-center gap-3"
          >
            {authMode === 'face' ? (
              <RiLockPasswordLine size={18} />
            ) : (
              <RiCameraLensLine size={18} />
            )}
            {authMode === 'face' ? 'Use PIN Unlock' : 'Use Face Unlock'}
          </motion.button>
        )}

        <input
          ref={inputRef}
          type="text"
          pattern="\d*"
          value={pin}
          onChange={handlePinChange}
          className="opacity-0 absolute left-[-9999px]"
          maxLength={4}
          autoComplete="off"
          disabled={isAuthorized}
        />
      </motion.div>

      <div className="absolute bottom-8 flex flex-col items-center gap-1 z-50">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          IRIS Core OS
        </span>
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Encrypted Local Environment
        </span>
      </div>
    </div>
  )
}
