import { useState, useEffect, useRef } from 'react'
import {
  RiMicLine,
  RiMicOffLine,
  RiComputerLine,
  RiCameraLine,
  RiFullscreenLine,
  RiDragMove2Fill
} from 'react-icons/ri'
import { GiPowerButton } from 'react-icons/gi'

interface OverlayProps {
  isConnected: boolean
  toggleConnection: () => void
  isSpeaking: boolean
  isMuted: boolean
  handleMicToggle: () => void
}

const MiniOverlay = ({
  isConnected,
  toggleConnection,
  isSpeaking,
  isMuted,
  handleMicToggle
}: OverlayProps) => {
  const expand = () => {
    window.electron.ipcRenderer.send('toggle-overlay')
  }

  return (
    <div className="w-full h-full flex items-center justify-between px-3 bg-zinc-950/90 backdrop-blur-xl rounded-full border border-emerald-500/30 drag-region overflow-hidden">
      <div className="flex items-center gap-3 no-drag">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${isConnected ? (isSpeaking ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_#10b981]' : 'border-emerald-500/50 bg-emerald-900/20') : 'border-zinc-700 bg-zinc-900'}`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isConnected ? (isSpeaking ? 'bg-emerald-400' : 'bg-emerald-600') : 'bg-red-900'}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 no-drag">
        <button
          onClick={handleMicToggle}
          disabled={!isConnected}
          className={`p-2.5 rounded-full transition-all ml-1 ${!isConnected ? 'opacity-30' : isMuted ? 'text-red-500 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}
        >
          {isMuted ? <RiMicOffLine size={18} /> : <RiMicLine size={18} />}
        </button>

        <button
          onClick={toggleConnection}
          className={`p-3 rounded-full border transition-all duration-500 shadow-lg mx-1 ${isConnected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-600 text-zinc-500 hover:text-red-400'}`}
        >
          <GiPowerButton size={20} className={isConnected ? 'animate-pulse' : ''} />
        </button>
      </div>

      <div className="pl-4 border-l border-emerald-500/20 no-drag flex items-center gap-2">
        <button
          onClick={expand}
          className="p-2 rounded-full text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
        >
          <RiFullscreenLine size={16} />
        </button>
        <div className="drag-region cursor-move text-emerald-500/30">
          <RiDragMove2Fill size={14} />
        </div>
      </div>
    </div>
  )
}

export default MiniOverlay
