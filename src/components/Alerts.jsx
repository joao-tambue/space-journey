import { useMission } from '../store/missionStore'

export default function Alerts() {
  const alerts = useMission((s) => s.alerts)
  const dismiss = useMission((s) => s.dismissAlert)
  if (!alerts.length) return null
  return (
    <aside className="alerts">
      {alerts.map((a) => (
        <article key={a.id} data-to={a.to}>
          <p>{a.title}</p>
          <strong>{a.body}</strong>
          <button type="button" onClick={() => dismiss(a.id)}>
            Registar
          </button>
        </article>
      ))}
    </aside>
  )
}
