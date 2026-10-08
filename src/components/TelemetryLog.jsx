import { useMission } from '../store/missionStore'

export default function TelemetryLog() {
  const log = useMission((s) => s.log)
  return (
    <section className="log">
      <header>
        <p>Diário da sonda</p>
        <strong>decisões autónomas</strong>
      </header>
      <ol>
        {log.map((entry) => (
          <li key={entry.id} data-tone={entry.tone}>
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  )
}
