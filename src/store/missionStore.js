import { create } from 'zustand'
import { FAULTS, SYSTEMS } from '../data/catalog'

const cloneSystems = () =>
  SYSTEMS.map((s) => ({
    ...s,
    on: true,
    isolated: false,
  }))

function pushLog(log, text, tone = 'info') {
  return [{ id: crypto.randomUUID(), t: Date.now(), text, tone }, ...log].slice(0, 80)
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

export const useMission = create((set, get) => ({
  phase: 'briefing',
  progress: 0,
  energy: 100,
  solarEfficiency: 1,
  leak: 0,
  speed: 1,
  paused: false,
  systems: cloneSystems(),
  probe: {
    active: false,
    mode: 'standby',
    load: 0,
    capacity: 100,
    lastAction: 'Em espera até haver anomalia energética.',
  },
  faults: [],
  log: [
    {
      id: 'boot',
      t: Date.now(),
      text: 'Sonda Origem em espera. Missão ainda não iniciada.',
      tone: 'info',
    },
  ],
  alerts: [],
  energyHistory: [{ t: 0, energy: 100, solar: 22 }],
  simTime: 0,
  surface: {
    landed: false,
    rover: false,
    site: null,
    samples: [],
  },
  scripted: {
    solar: false,
    overdraw: false,
    comms: false,
    coolant: false,
  },

  startMission: () => {
    set({
      phase: 'launch',
      progress: 0,
      energy: 100,
      solarEfficiency: 1,
      leak: 0,
      paused: false,
      systems: cloneSystems(),
      probe: {
        active: false,
        mode: 'standby',
        load: 0,
        capacity: 100,
        lastAction: 'À escuta do barramento energético.',
      },
      faults: [],
      alerts: [],
      energyHistory: [{ t: 0, energy: 100, solar: 22 }],
      simTime: 0,
      surface: { landed: false, rover: false, site: null, samples: [] },
      scripted: { solar: false, overdraw: false, comms: false, coolant: false },
      log: [
        {
          id: crypto.randomUUID(),
          t: Date.now(),
          text: 'Lançamento autorizado. Vector Terra–Marte bloqueado.',
          tone: 'ok',
        },
      ],
    })
  },

  setSpeed: (speed) => set({ speed }),
  togglePause: () => set((s) => ({ paused: !s.paused })),

  injectFault: (faultId) => {
    const spec = FAULTS[faultId]
    if (!spec) return
    const state = get()
    if (state.faults.some((f) => f.id === faultId && !f.resolved)) return
    applyFault(set, get, spec, 'manual')
  },

  resolveSoftware: (faultId) => {
    const spec = FAULTS[faultId]
    const state = get()
    const fault = state.faults.find((f) => f.id === faultId && !f.resolved)
    if (!fault || spec.domain !== 'software') return
    patchFault(set, get, spec)
  },

  deployRover: () => {
    const { phase, surface, log } = get()
    if (phase !== 'surface' || surface.rover) return
    set({
      surface: { ...surface, rover: true },
      log: pushLog(log, 'Rover Origem-1 libertado. Varredura de rególito iniciada.', 'ok'),
    })
  },

  exploreSite: (site) => {
    const { phase, surface, log } = get()
    if (phase !== 'surface') return
    const already = surface.samples.includes(site.id)
    set({
      surface: {
        ...surface,
        site: site.id,
        samples: already ? surface.samples : [...surface.samples, site.id],
      },
      log: pushLog(
        log,
        already
          ? `Revisita a ${site.name}. ${site.find}`
          : `Primeira amostragem em ${site.name}. ${site.find}`,
        'ok',
      ),
    })
  },

  dismissAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  tick: () => {
    const s = get()
    if (s.paused || s.phase === 'briefing') return

    let {
      phase,
      progress,
      energy,
      solarEfficiency,
      leak,
      systems,
      probe,
      faults,
      log,
      alerts,
      energyHistory,
      simTime,
      surface,
      scripted,
      speed,
    } = s

    const dt = 0.35 * speed
    simTime += dt

    if (phase === 'launch' && progress > 6) {
      phase = 'transit'
      log = pushLog(log, 'Inserção em trânsito heliocêntrico. Sonda em vigilância passiva.', 'info')
    }

    if (progress >= 88 && phase !== 'surface' && phase !== 'approach') {
      phase = 'approach'
      log = pushLog(log, 'Captura marciana iminente. Correcção de periapse.', 'ok')
    }

    if (progress >= 100 && phase !== 'surface') {
      phase = 'surface'
      progress = 100
      surface = { ...surface, landed: true }
      leak = 0
      solarEfficiency = 1
      systems = systems.map((sys) => {
        if (sys.id === 'propulsion' || sys.id === 'galley' || sys.id === 'comfort') {
          return { ...sys, on: false, isolated: true }
        }
        return { ...sys, on: true, isolated: false }
      })
      probe = {
        ...probe,
        mode: 'explore',
        lastAction: 'Missão cumprida. A sonda conduz a exploração de superfície.',
      }
      log = pushLog(log, 'Toque em Marte. Missão Origem: superfície autorizada.', 'ok')
    }

    if (progress > 28 && !scripted.solar && phase !== 'surface') {
      scripted = { ...scripted, solar: true }
      const applied = applyFaultInline(s, FAULTS.solar_misalign)
      systems = applied.systems
      probe = applied.probe
      faults = applied.faults
      log = applied.log
      alerts = applied.alerts
      leak = applied.leak
      solarEfficiency = applied.solarEfficiency
      phase = applied.phase
    } else if (progress > 44 && !scripted.overdraw && phase !== 'surface') {
      scripted = { ...scripted, overdraw: true }
      const applied = applyFaultInline({ ...s, systems, probe, faults, log, alerts, leak, solarEfficiency, phase }, FAULTS.bus_overdraw)
      systems = applied.systems
      probe = applied.probe
      faults = applied.faults
      log = applied.log
      alerts = applied.alerts
      leak = applied.leak
      solarEfficiency = applied.solarEfficiency
      phase = applied.phase
    } else if (progress > 62 && !scripted.comms && phase !== 'surface') {
      scripted = { ...scripted, comms: true }
      const applied = applyFaultInline({ ...s, systems, probe, faults, log, alerts, leak, solarEfficiency, phase }, FAULTS.comms_overflow)
      systems = applied.systems
      probe = applied.probe
      faults = applied.faults
      log = applied.log
      alerts = applied.alerts
      leak = applied.leak
      solarEfficiency = applied.solarEfficiency
      phase = applied.phase
    } else if (progress > 76 && !scripted.coolant && phase !== 'surface') {
      scripted = { ...scripted, coolant: true }
      const applied = applyFaultInline({ ...s, systems, probe, faults, log, alerts, leak, solarEfficiency, phase }, FAULTS.coolant_critical)
      systems = applied.systems
      probe = applied.probe
      faults = applied.faults
      log = applied.log
      alerts = applied.alerts
      leak = applied.leak
      solarEfficiency = applied.solarEfficiency
      phase = applied.phase
    }

    const draw = systems.filter((x) => x.on).reduce((a, x) => a + x.draw, 0)
    const solar = (phase === 'surface' ? 38 : 24) * solarEfficiency
    energy = clamp(energy + (solar - draw) * 0.045 * dt - leak * dt, 0, 100)

    const propulsionOn = systems.find((x) => x.id === 'propulsion')?.on
    if (phase !== 'surface' && propulsionOn && energy > 8) {
      progress = clamp(progress + 0.42 * dt * (energy / 100) * (probe.mode === 'survival' ? 0.72 : 1), 0, 100)
    }

    if (energy < 55 && !probe.active && phase !== 'briefing' && phase !== 'surface') {
      probe = {
        ...probe,
        active: true,
        mode: 'analyze',
        lastAction: 'Queda de energia detectada. A sonda assume o diagnóstico.',
      }
      if (phase === 'transit' || phase === 'launch') phase = 'crisis'
      log = pushLog(log, 'Sonda Origem activada: perda de energia acima do limiar.', 'warn')
    }

    if (probe.active && energy < 40 && phase !== 'surface') {
      const next = shedLoad(systems, 'eco')
      if (next.changed) {
        systems = next.systems
        probe = {
          ...probe,
          mode: 'eco',
          lastAction: 'Modo económico: dispositivos não essenciais desligados.',
        }
        if (phase !== 'surface' && phase !== 'approach') phase = 'recovery'
        log = pushLog(log, 'Modo económico. Restam propulsão, vida, navegação e a sonda.', 'warn')
      }
    }

    if (probe.active && energy < 22 && phase !== 'surface') {
      const next = shedLoad(systems, 'survival')
      if (next.changed) {
        systems = next.systems
        probe = {
          ...probe,
          mode: 'survival',
          lastAction: 'Modo sobrevivência. Só o essencial para chegar a Marte.',
        }
        log = pushLog(log, 'Modo sobrevivência. Comunicações Terra em pulso mínimo.', 'alert')
      }
    }

    const openSoftware = faults.find((f) => !f.resolved && f.domain === 'software' && simTime - f.at > 6)
    if (openSoftware) {
      const spec = FAULTS[openSoftware.id]
      const patched = patchFaultInline({ systems, probe, faults, log, leak, solarEfficiency }, spec)
      systems = patched.systems
      probe = patched.probe
      faults = patched.faults
      log = patched.log
      leak = patched.leak
      solarEfficiency = patched.solarEfficiency
      if (phase === 'crisis') phase = 'recovery'
    }

    const load = faults.filter((f) => !f.resolved).reduce((a, f) => a + f.load, 0)
    probe = { ...probe, load: clamp(load, 0, 100) }

    if (Math.floor(simTime) % 2 === 0) {
      energyHistory = [...energyHistory, { t: simTime, energy, solar }].slice(-48)
    }

    set({
      phase,
      progress,
      energy,
      solarEfficiency,
      leak,
      systems,
      probe,
      faults,
      log,
      alerts,
      energyHistory,
      simTime,
      surface,
      scripted,
    })
  },
}))

function shedLoad(systems, mode) {
  let changed = false
  const next = systems.map((sys) => {
    if (mode === 'eco' && !sys.essential && sys.on && sys.id !== 'comms') {
      changed = true
      return { ...sys, on: false, isolated: true }
    }
    if (mode === 'survival' && !sys.essential && sys.on) {
      changed = true
      return { ...sys, on: false, isolated: true }
    }
    return sys
  })
  return { systems: next, changed }
}

function applyFault(set, get, spec) {
  const s = get()
  const applied = applyFaultInline(s, spec)
  set(applied)
}

function applyFaultInline(s, spec) {
  const already = s.faults.some((f) => f.id === spec.id && !f.resolved)
  if (already) return s

  let { systems, probe, faults, log, alerts, leak, solarEfficiency, phase } = s
  leak = leak + spec.leak
  solarEfficiency = clamp(solarEfficiency - spec.solarDrop, 0.15, 1)
  faults = [...faults, { ...spec, at: s.simTime ?? 0, resolved: false }]
  probe = {
    ...probe,
    active: true,
    mode: spec.beyond ? 'limit' : 'analyze',
    lastAction: spec.analysis,
  }
  if (phase === 'transit' || phase === 'launch') phase = 'crisis'
  log = pushLog(log, `Anomalia: ${spec.title}. ${spec.analysis}`, spec.beyond ? 'alert' : 'warn')

  if (spec.beyond) {
    alerts = [
      {
        id: crypto.randomUUID(),
        to: 'crew',
        title: 'Tripulação',
        body: `${spec.title} ultrapassa a autoridade da sonda. Intervenção a bordo necessária.`,
      },
      {
        id: crypto.randomUUID(),
        to: 'earth',
        title: 'Terra · DSN',
        body: `Origem reporta ${spec.title}. Pacote de diagnóstico enviado. Hardware fora do alcance do software da sonda.`,
      },
      ...alerts,
    ]
    log = pushLog(log, 'Notificação à tripulação e à Terra. A sonda contém o lado de software.', 'alert')
  }

  return { systems, probe, faults, log, alerts, leak, solarEfficiency, phase }
}

function patchFault(set, get, spec) {
  const s = get()
  set(patchFaultInline(s, spec))
}

function patchFaultInline(s, spec) {
  const { faults, log } = s
  let { leak, solarEfficiency, probe, systems } = s
  const target = faults.find((f) => f.id === spec.id && !f.resolved)
  if (!target) return s

  leak = Math.max(0, leak - spec.leak)
  solarEfficiency = clamp(solarEfficiency + spec.solarDrop, 0.15, 1)
  probe = {
    ...probe,
    mode: probe.mode === 'survival' ? 'survival' : 'eco',
    lastAction: spec.patch,
  }
  return {
    leak,
    solarEfficiency,
    probe,
    systems,
    faults: faults.map((f) => (f.id === spec.id && !f.resolved ? { ...f, resolved: true } : f)),
    log: pushLog(log, `Sonda resolveu (software): ${spec.title}. ${spec.patch}`, 'ok'),
  }
}
