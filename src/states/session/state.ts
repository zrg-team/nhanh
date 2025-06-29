import type { Session } from 'src/services/database/types'

export interface SessionState {
  currentSession?: Session
  sessions: Session[]
  applications: Session[]
  ready: boolean
  error?: string
  loadingCurrentSession: boolean
}

export const defaultSessionState: SessionState = {
  currentSession: undefined,
  ready: true,
  error: undefined,
  sessions: [],
  applications: [],
  loadingCurrentSession: false,
}
