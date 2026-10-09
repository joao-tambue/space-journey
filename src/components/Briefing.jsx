import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, BatteryLow, Cpu, Orbit, RadioTower, Rocket, Target } from 'lucide-react'
import { useMemo } from 'react'
import { FAULTS, SYSTEMS } from '../data/catalog'
import './Briefing.css'

// Gerador determinístico: o céu fica igual entre renders.
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function useStars(count) {
  return useMemo(() => {
    const rand = seeded(7)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${rand() * 100}%`,
      top: `${rand() * 100}%`,
      size: rand() < 0.85 ? 1 : 2,
      opacity: 0.25 + rand() * 0.6,
      delay: `${rand() * 6}s`,
      duration: `${3 + rand() * 5}s`,
    }))
  }, [count])
}

const STEPS = [
  {
    icon: Target,
    title: 'Objectivo',
    body: 'Inserção segura em órbita marciana e exploração da superfície, numa transferência de Hohmann de 259 dias.',
  },
  {
    icon: BatteryLow,
    title: 'A energia cai',
    body: 'Abaixo de 55% a sonda assume o diagnóstico. Desliga o que não é essencial e protege propulsão, vida e navegação.',
  },
  {
    icon: Cpu,
    title: 'Software, resolvido a bordo',
    body: 'Painéis desalinhados ou buffers saturados são corrigidos pela própria sonda, sem esperar pela Terra.',
  },
  {
    icon: RadioTower,
    title: 'Além da sonda',
    body: 'Falhas de hardware ultrapassam a sua autoridade: a sonda contém o problema e avisa a tripulação e a Terra.',
  },
]

const STATS = [
  { value: '259', label: 'dias de trânsito' },
  { value: '225', label: 'milhões de km' },
  { value: SYSTEMS.length, label: 'sistemas a bordo' },
  { value: Object.keys(FAULTS).length, label: 'anomalias possíveis' },
]

function BlurWords({ text, delay = 0, className }) {
  const reduce = useReducedMotion()
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="landing-word"
          initial={reduce ? false : { opacity: 0, filter: 'blur(14px)', y: 14 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.9, delay: delay + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

const rise = (delay) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
})

export default function Briefing({ onLaunch }) {
  const stars = useStars(160)

  return (
    <main className="landing">
      <div className="landing-sky" aria-hidden="true">
        {stars.map((s) => (
          <i
            key={s.id}
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="landing-haze" aria-hidden="true" />
      <motion.div
        className="landing-planet"
        aria-hidden="true"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="landing-dawn" />
      </motion.div>

      <motion.nav className="landing-nav" {...rise(0)}>
        <a href="#topo" className="landing-brand">
          <Orbit size={20} />
          Origem
        </a>
        <div className="landing-links">
          <a href="#como">Como funciona</a>
          <a href="#numeros">Números</a>
          <button type="button" onClick={onLaunch}>
            Lançar
          </button>
        </div>
      </motion.nav>

      <section className="landing-hero" id="topo">
        <motion.p className="landing-chip" {...rise(0.1)}>
          <span /> CAF · Missão Origem · Terra → Marte
        </motion.p>
        <h1>
          <BlurWords text="Se a energia falhar," delay={0.2} />
          <BlurWords text="a sonda decide." delay={0.65} className="landing-accent" />
        </h1>
        <motion.p className="landing-sub" {...rise(1.2)}>
          Acompanhe a nave no arco Terra–Marte. Quando a energia cai, a sonda Origem analisa, corta carga,
          corrige o software e avisa a tripulação e a Terra quando o problema a ultrapassa.
        </motion.p>
        <motion.div className="landing-cta" {...rise(1.4)}>
          <button type="button" className="landing-go" onClick={onLaunch}>
            <Rocket size={18} />
            Autorizar lançamento
          </button>
          <a href="#como" className="landing-ghost">
            Como funciona
            <ArrowDown size={16} />
          </a>
        </motion.div>
      </section>

      <section className="landing-steps" id="como">
        <header>
          <p className="eyebrow">Como funciona</p>
          <h2>Uma sonda com autoridade, e limites.</h2>
        </header>
        <ol>
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <span className="landing-step-icon">
                <step.icon size={20} />
              </span>
              <small>0{i + 1}</small>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </motion.li>
          ))}
        </ol>

        <dl className="landing-stats" id="numeros">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="landing-final">
          <button type="button" className="landing-go" onClick={onLaunch}>
            <Rocket size={18} />
            Autorizar lançamento
          </button>
        </div>
      </section>
    </main>
  )
}
