import { motion } from 'framer-motion'
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
      <main className="briefing">
        <p className="eyebrow">CAF · Missão Origem</p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Chegar a Marte.
          <br />
          Se a energia falhar, a sonda decide.
        </motion.h1>
        <p className="lede">
          Esta demonstração mostra o arco Terra–Marte, a gestão energética da nave e a sonda Origem: ela
          analisa falhas, entra em modo económico ou de sobrevivência, corrige o que é software e, se o
          problema ultrapassar a sua autoridade, avisa a tripulação e a Terra.
        </p>
        <ol className="rules">
          <li>Objectivo: inserção segura e exploração da superfície.</li>
          <li>Queda de energia activa a sonda. Ela desliga o que não é essencial.</li>
          <li>Falhas de software são resolvidas a bordo pela sonda.</li>
          <li>Falhas além da sonda geram notificação à tripulação e à Terra.</li>
        </ol>
        <button type="button" className="go" onClick={startMission}>
          Autorizar lançamento
        </button>
      </main>
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
