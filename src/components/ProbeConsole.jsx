import { useMission } from '../store/missionStore'
import { FAULTS } from '../data/catalog'

const MODE_COPY = {
  standby: 'Espera',
  analyze: 'Análise',
  eco: 'Económico',
  survival: 'Sobrevivência',
  limit: 'Limite da sonda',
  explore: 'Exploração',
}

export default function ProbeConsole() {
  const probe = useMission((s) => s.probe)
  const faults = useMission((s) => s.faults)
  const injectFault = useMission((s) => s.injectFault)
  const energy = useMission((s) => s.energy)
  const leak = useMission((s) => s.leak)

  return (
    <section className="probe">
      <header className="probe-head">
        <p>Sonda Origem</p>
        <strong>{MODE_COPY[probe.mode] ?? probe.mode}</strong>
        <span className={probe.active ? 'live' : ''}>{probe.active ? 'no comando' : 'passiva'}</span>
      </header>
      <p className="probe-voice">{probe.lastAction}</p>
      <div className="meters">
        <label>
          Energia da nave
          <progress max={100} value={energy} />
          <b>{energy.toFixed(0)}%</b>
        </label>
        <label>
          Carga da sonda
          <progress max={100} value={probe.load} />
          <b>{probe.load.toFixed(0)} / 100</b>
        </label>
        <label>
          Fuga residual
          <progress max={4} value={leak} />
          <b>{leak.toFixed(2)}</b>
        </label>
      </div>
      <div className="fault-list">
        {faults.length === 0 && <p className="muted">Sem anomalias. O trânsito está limpo.</p>}
        {faults.map((f) => (
          <article key={`${f.id}-${f.at}`} className={f.resolved ? 'resolved' : f.beyond ? 'beyond' : ''}>
            <p>
              {f.beyond ? 'além da sonda' : f.domain}
              {f.resolved ? ' · resolvido' : ' · activo'}
            </p>
            <strong>{f.title}</strong>
          </article>
        ))}
      </div>
      <div className="inject">
        <p>Injetar anomalia</p>
        {Object.values(FAULTS).map((f) => (
          <button key={f.id} type="button" onClick={() => injectFault(f.id)}>
            {f.title}
          </button>
        ))}
      </div>
    </section>
  )
}
