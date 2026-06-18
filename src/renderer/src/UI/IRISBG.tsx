import Dashboard from '../views/Dashboard'

interface IRISBGProps {
  isConnected: boolean
  toggleConnection: () => void
  systemStatus: any
  isSpeaking: boolean
  isMuted: boolean
  handleMicToggle: () => void
}

const IRISBG = ({
  isConnected,
  toggleConnection,
  systemStatus,
  isSpeaking,
  isMuted,
  handleMicToggle
}: IRISBGProps) => {
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

export default IRISBG
