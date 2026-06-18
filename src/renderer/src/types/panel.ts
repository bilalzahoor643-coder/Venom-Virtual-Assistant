export type Status = 'STANDBY' | 'CONNECTING' | 'ACTIVE' | 'ERROR'

export interface LeftPanelsProps {
  status: Status
  visionMode: 'off' | 'camera' | 'screen'
}
