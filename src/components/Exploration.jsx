import { SITES } from '../data/catalog'
import { useMission } from '../store/missionStore'

export default function Exploration() {
  const phase = useMission((s) => s.phase)
  const surface = useMission((s) => s.surface)
  const exploreSite = useMission((s) => s.exploreSite)
  const deployRover = useMission((s) => s.deployRover)
  const active = SITES.find((s) => s.id === surface.site)

  if (phase !== 'surface') {
    return (
      <section className="explore locked">
        <p>Superfície</p>
        <strong>A exploração abre depois do toque em Marte.</strong>
      </section>
    )
  }

  return (
    <section className="explore">
      <header>
        <p>Marte · superfície</p>
        <strong>{surface.rover ? 'Rover Origem-1 em campo' : 'Descer o rover para amostrar'}</strong>
        {!surface.rover && (
          <button type="button" onClick={deployRover}>
            Libertar rover
          </button>
        )}
      </header>
      <div className="mars-map">
        <svg viewBox="0 0 100 70" role="img" aria-label="Mapa de sítios em Marte">
          <defs>
            <radialGradient id="dust" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#c45a2a" />
              <stop offset="100%" stopColor="#5c2414" />
            </radialGradient>
          </defs>
          <rect width="100" height="70" fill="url(#dust)" rx="2" />
          <ellipse cx="50" cy="8" rx="28" ry="7" fill="#c9e4dc" opacity="0.35" />
          {SITES.map((site) => (
            <g key={site.id}>
              <circle
                cx={site.x}
                cy={site.y}
                r={surface.site === site.id ? 3.2 : 2.2}
                fill={surface.samples.includes(site.id) ? '#f2c14e' : '#f6ede3'}
                stroke="#140e16"
                strokeWidth="0.4"
              />
            </g>
          ))}
        </svg>
        <ul>
          {SITES.map((site) => (
            <li key={site.id}>
              <button
                type="button"
                disabled={!surface.rover}
                className={surface.site === site.id ? 'current' : ''}
                onClick={() => exploreSite(site)}
              >
                {site.name}
                {surface.samples.includes(site.id) ? ' · amostrado' : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {active && (
        <blockquote>
          <p>{active.blurb}</p>
          <strong>{active.find}</strong>
        </blockquote>
      )}
    </section>
  )
}
