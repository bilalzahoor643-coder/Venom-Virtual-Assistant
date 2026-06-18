import { useState, useEffect } from 'react'
import {
  RiDashboardLine,
  RiSettings3Line,
  RiImage2Line,
  RiStickyNoteLine,
  RiSmartphoneLine,
  RiFlowChart,
  RiAppsLine,
  RiMicLine,
  RiMicOffLine,
  RiPhoneLine
} from 'react-icons/ri'
import { irisService } from './services/IRIS_AI'
import Dashboard from './views/Dashboard'
import SettingsView from './views/Settings'
import GalleryView from './views/Gallery'
import NotesView from './views/Notes'
import PhoneView from './views/Phone'
import WorkFlowEditorView from './views/WorkFlowEditor'
import AppsView from './views/APP'
import MiniOverlay from './components/MiniOverlay'
import TerminalOverlay from './components/TerminalOverlay'
import LeafletMapWidget from './Widgets/MapView'
import ImageWidget from './Widgets/ImageWidget'
import EmailWidget from './Widgets/EmailWidget'
import WeatherWidget from './Widgets/WeatherWidget'
import StockWidget from './Widgets/StockWidget'
import LiveCodingWidget from './Widgets/LiveCodingWidget'
import WormholeWidget from './Widgets/WormholeWidget'
import OracleWidget from './Widgets/RagOrcaleWidget'
import ResearchWidget from './Widgets/DeepResearch'
import SemanticWidget from './Widgets/SematicSearch'
import SmartDropZonesWidget from './Widgets/SmartZoneWidget'
import TitleBar from './components/Titlebar'
import { Status } from './types/panel'

type ViewType = 'dashboard' | 'settings' | 'gallery' | 'notes' | 'phone' | 'workflow' | 'apps'

const navItems: { id: ViewType; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard', icon: <RiDashboardLine size={20} />, label: 'Dashboard' },
  { id: 'settings', icon: <RiSettings3Line size={20} />, label: 'Settings' },
  { id: 'gallery', icon: <RiImage2Line size={20} />, label: 'Gallery' },
  { id: 'notes', icon: <RiStickyNoteLine size={20} />, label: 'Notes' },
  { id: 'phone', icon: <RiSmartphoneLine size={20} />, label: 'Phone' },
  { id: 'workflow', icon: <RiFlowChart size={20} />, label: 'Workflows' },
  { id: 'apps', icon: <RiAppsLine size={20} />, label: 'Apps' }
]

const IndexRoot = () => {
  const [isOverlay, setIsOverlay] = useState(false)
  const [activeView, setActiveView] = useState<ViewType>('dashboard')

  const [isConnected, setIsConnected] = useState(false)
  const [systemStatus, setSystemStatus] = useState<Status>('STANDBY')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const toggleConnection = async () => {
    if (isConnected) {
      irisService.disconnect()
      setIsConnected(false)
      setSystemStatus('STANDBY')
      setIsMuted(false)
    } else {
      try {
        setSystemStatus('CONNECTING')
        await irisService.connect()
        setIsConnected(true)
        setSystemStatus('ACTIVE')
      } catch (err: any) {
        console.error('[IRIS] Connection failed:', err)
        setSystemStatus('ERROR')
        setIsConnected(false)
        if (err.message === 'NO_API_KEY') {
          alert('Gemini API Key nahi mili! Settings mein jaake API key add karo.')
        }
      }
    }
  }

  const handleMicToggle = () => {
    const nextMutedState = !isMuted
    setIsMuted(nextMutedState)
    irisService.setMute(nextMutedState)
  }

  if (isOverlay) {
    return (
      <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-transparent">
        <MiniOverlay
          isConnected={isConnected}
          toggleConnection={toggleConnection}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          handleMicToggle={handleMicToggle}
        />
      </div>
    )
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            isConnected={isConnected}
            toggleConnection={toggleConnection}
            systemStatus={systemStatus}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            handleMicToggle={handleMicToggle}
          />
        )
      case 'settings':
        return <SettingsView isSystemActive={isConnected} />
      case 'gallery':
        return <GalleryView />
      case 'notes':
        return <NotesView />
      case 'phone':
        return <PhoneView />
      case 'workflow':
        return <WorkFlowEditorView />
      case 'apps':
        return <AppsView />
      default:
        return (
          <Dashboard
            isConnected={isConnected}
            toggleConnection={toggleConnection}
            systemStatus={systemStatus}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            handleMicToggle={handleMicToggle}
          />
        )
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative border border-emerald-500/20 rounded-xl">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        {/* Sidebar Navigation */}
        <div className="w-14 flex flex-col items-center py-3 gap-1 bg-[#08080a] border-r border-white/5 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={item.label}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                activeView === item.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(0,255,65,0.15)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              {item.icon}
            </button>
          ))}

          <div className="flex-1" />

          {/* Connection Quick Toggle */}
          <button
            onClick={toggleConnection}
            title={isConnected ? 'Disconnect' : 'Connect'}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 border ${
              isConnected
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <RiPhoneLine size={18} />
          </button>

          <button
            onClick={handleMicToggle}
            disabled={!isConnected}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 border mb-2 ${
              !isConnected
                ? 'opacity-30 text-zinc-600 border-transparent'
                : isMuted
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'text-zinc-400 hover:text-emerald-400 border-white/10 hover:border-emerald-500/30'
            }`}
          >
            {isMuted ? <RiMicOffLine size={18} /> : <RiMicLine size={18} />}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {renderView()}
        </div>
      </div>

      {/* Global Widgets */}
      <SmartDropZonesWidget />
      <SemanticWidget />
      <OracleWidget />
      <WormholeWidget />
      <LeafletMapWidget />
      <StockWidget />
      <WeatherWidget />
      <ImageWidget />
      <EmailWidget />
      <TerminalOverlay />
      <LiveCodingWidget />
      <ResearchWidget />
    </div>
  )
}

export default IndexRoot
