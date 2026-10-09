import { useMissionLoop } from '../hooks/useMissionLoop'
import { PHASES } from '../data/catalog'
import { useMission } from '../store/missionStore'
import { lazy, Suspense } from 'react'

const SpaceScene = lazy(() => import('../components/SpaceScene'))
import ProbeConsole from '../components/ProbeConsole'
import SystemsGrid from '../components/SystemsGrid'
import EnergyChart from '../components/EnergyChart'
import TelemetryLog from '../components/TelemetryLog'
import Alerts from '../components/Alerts'
import Exploration from '../components/Exploration'
import Briefing from '../components/Briefing'

export default function Mission() {
  useMissionLoop()
  const phase = useMission((s) => s.phase)
  const progress = useMission((s) => s.progress)
  const energy = useMission((s) => s.energy)
  const speed = useMission((s) => s.speed)
  const paused = useMission((s) => s.paused)
  const startMission = useMission((s) => s.startMission)
  const setSpeed = useMission((s) => s.setSpeed)
  const togglePause = useMission((s) => s.togglePause)

  if (phase === 'briefing') {
    return (
      <Briefing
        onLaunch={() => {
          window.scrollTo(0, 0)
          startMission()
        }}
      />
    )
  }

  return (
    <main className="mission">
      <header className="topbar">
        <div>
          <p>Missão Origem</p>
          <strong>demonstração de trânsito e autonomia</strong>
        </div>
        <div className="readouts">
          <span>
            Distância
            <b>{progress.toFixed(0)}%</b>
          </span>
          <span>
            Energia
            <b>{energy.toFixed(0)}%</b>
          </span>
          <span>
            Fase
            <b>{PHASES.find((p) => p.id === phase)?.label}</b>
          </span>
        </div>
        <div className="clock">
          <button type="button" onClick={togglePause}>
            {paused ? 'Retomar' : 'Pausar'}
          </button>
          {[1, 2, 4].map((n) => (
            <button key={n} type="button" className={speed === n ? 'on' : ''} onClick={() => setSpeed(n)}>
              ×{n}
            </button>
          ))}
          <button type="button" onClick={startMission}>
            Reiniciar
          </button>
        </div>
      </header>

      <ol className="timeline">
        {PHASES.filter((p) => p.id !== 'briefing').map((p) => (
          <li key={p.id} data-active={p.id === phase}>
            {p.label}
          </li>
        ))}
      </ol>

      <div className="grid">
        <Suspense fallback={<div className="viewport" />}>
          <SpaceScene />
        </Suspense>
        <ProbeConsole />
        <SystemsGrid />
        <EnergyChart />
        <TelemetryLog />
        <Exploration />
      </div>
      <Alerts />
    </main>
  )
}
