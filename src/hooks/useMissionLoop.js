import { useEffect } from 'react'
import { useMission } from '../store/missionStore'

export function useMissionLoop() {
  const tick = useMission((s) => s.tick)
  const phase = useMission((s) => s.phase)
  const paused = useMission((s) => s.paused)

  useEffect(() => {
    if (phase === 'briefing' || paused) return undefined
    const id = setInterval(() => tick(), 280)
    return () => clearInterval(id)
  }, [tick, phase, paused])
}
