import { useMission } from '../store/missionStore'

export default function SystemsGrid() {
  const systems = useMission((s) => s.systems)
  return (
    <section className="systems">
      <header>
        <p>Carga da nave</p>
        <strong>o que a sonda mantém ligado</strong>
      </header>
      <ul>
        {systems.map((sys) => (
          <li key={sys.id} className={sys.on ? 'on' : 'off'} data-essential={sys.essential}>
            <span className="dot" />
            <div>
              <strong>{sys.name}</strong>
              <em>{sys.role}</em>
            </div>
            <b>{sys.draw} kW</b>
          </li>
        ))}
      </ul>
    </section>
  )
}
