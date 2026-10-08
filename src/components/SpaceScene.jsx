import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls, Stars } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useMission } from '../store/missionStore'

// Raios orbitais em escala de cena (Terra 1 UA, Marte 1.52 UA).
const R_EARTH = 4
const R_MARS = 6.08
// Elipse de transferência de Hohmann com o Sol no foco.
const A = (R_EARTH + R_MARS) / 2
const E = (R_MARS - R_EARTH) / (R_MARS + R_EARTH)
const TRANSFER_DAYS = 259
// Durante a transferência a Terra percorre ~255° e Marte ~136°;
// Marte parte ~44° à frente para estar no afélio à chegada.
const EARTH_SWEEP = (255 * Math.PI) / 180
const MARS_SWEEP = (136 * Math.PI) / 180
const MARS_START = Math.PI - MARS_SWEEP

// Equação de Kepler: tempo (0–1) → anomalia verdadeira (0–π).
function trueAnomaly(p) {
  const M = Math.PI * p
  let Ea = M
  for (let i = 0; i < 8; i += 1) Ea -= (Ea - E * Math.sin(Ea) - M) / (1 - E * Math.cos(Ea))
  return 2 * Math.atan2(Math.sqrt(1 + E) * Math.sin(Ea / 2), Math.sqrt(1 - E) * Math.cos(Ea / 2))
}

function transferPoint(p) {
  const theta = trueAnomaly(THREE.MathUtils.clamp(p, 0, 1))
  const r = (A * (1 - E * E)) / (1 + E * Math.cos(theta))
  return new THREE.Vector3(Math.cos(theta) * r, 0, -Math.sin(theta) * r)
}

function circlePoint(radius, angle) {
  return new THREE.Vector3(Math.cos(angle) * radius, 0, -Math.sin(angle) * radius)
}

const earthAt = (p) => circlePoint(R_EARTH, EARTH_SWEEP * p)
const marsAt = (p) => circlePoint(R_MARS, MARS_START + MARS_SWEEP * p)

function ringPoints(radius, n = 128) {
  return Array.from({ length: n + 1 }, (_, i) => circlePoint(radius, (i / n) * Math.PI * 2))
}

function arcPoints(from, to, n = 96) {
  return Array.from({ length: n + 1 }, (_, i) => transferPoint(from + ((to - from) * i) / n))
}

// Progresso suavizado entre ticks do motor (280 ms) para a nave deslizar em vez de saltar.
function useSmoothProgress() {
  const smooth = useRef(useMission.getState().progress / 100)
  useFrame((_, delta) => {
    const target = useMission.getState().progress / 100
    if (target < smooth.current - 0.05) smooth.current = target
    else smooth.current += (target - smooth.current) * (1 - Math.exp(-delta * 3.5))
  })
  return smooth
}

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshBasicMaterial color="#f6c453" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.25, 32, 32]} />
        <meshBasicMaterial color="#f2a33a" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <pointLight intensity={160} distance={60} decay={1.6} color="#ffe2a8" />
    </group>
  )
}

function Planet({ smooth, at, radius, color, label, spin }) {
  const group = useRef()
  const body = useRef()
  useFrame((_, delta) => {
    group.current.position.copy(at(smooth.current))
    body.current.rotation.y += delta * spin
  })
  return (
    <group ref={group}>
      <mesh ref={body}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <Html center position={[0, radius + 0.35, 0]} className="scene-tag">
        {label}
      </Html>
    </group>
  )
}

function Ship({ smooth }) {
  const group = useRef()
  const flame = useRef()
  const ahead = useMemo(() => new THREE.Vector3(), [])
  const parked = useRef(0)

  useFrame((state, delta) => {
    const { phase, systems } = useMission.getState()
    const p = smooth.current
    const g = group.current

    if (phase === 'surface') {
      // Órbita de estacionamento em torno de Marte após a chegada.
      parked.current += delta * 0.8
      const mars = marsAt(1)
      const pos = mars.clone().add(new THREE.Vector3(Math.cos(parked.current) * 0.85, 0.15, Math.sin(parked.current) * 0.85))
      ahead.copy(mars).add(new THREE.Vector3(Math.cos(parked.current + 0.2) * 0.85, 0.15, Math.sin(parked.current + 0.2) * 0.85))
      g.position.copy(pos)
    } else {
      g.position.copy(transferPoint(p)).add(new THREE.Vector3(0, 0.12, 0))
      ahead.copy(transferPoint(Math.min(p + 0.01, 1))).add(new THREE.Vector3(0, 0.12, 0))
      if (p >= 0.999) ahead.add(new THREE.Vector3(0, 0, -0.1))
    }
    g.lookAt(ahead)

    const burning = phase !== 'surface' && systems.find((s) => s.id === 'propulsion')?.on
    const flicker = 0.75 + Math.sin(state.clock.elapsedTime * 38) * 0.15 + Math.random() * 0.1
    flame.current.visible = burning
    flame.current.scale.set(1, 1, flicker)
  })

  // A nave aponta para +Z (lookAt), por isso o corpo é rodado para o eixo Z.
  return (
    <group ref={group} scale={0.55}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.2, 0.7, 16]} />
          <meshStandardMaterial color="#f3ede3" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.16, 0.32, 16]} />
          <meshStandardMaterial color="#c45a2a" metalness={0.3} roughness={0.4} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, -0.28, 0]}>
            <boxGeometry args={[0.02, 0.22, 0.55]} />
            <meshStandardMaterial color="#d9a066" metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.03, 1.3, 0.24]} />
          <meshStandardMaterial color="#2c4a6e" metalness={0.6} roughness={0.25} emissive="#16304d" />
        </mesh>
      </group>
      <group ref={flame} position={[0, 0, -0.42]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.22]}>
          <coneGeometry args={[0.13, 0.5, 16, 1, true]} />
          <meshBasicMaterial color="#f6a13a" transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.14]}>
          <coneGeometry args={[0.07, 0.3, 12, 1, true]} />
          <meshBasicMaterial color="#fff4d6" transparent opacity={0.95} depthWrite={false} />
        </mesh>
        <pointLight color="#f6a13a" intensity={3} distance={2.5} />
      </group>
      <Html center position={[0, 0.6, 0]} className="scene-tag scene-tag--ship">
        Origem
      </Html>
    </group>
  )
}

// Rasto percorrido: actualiza a ~4 Hz (ritmo do motor), não a cada frame.
function Trail() {
  const progress = useMission((s) => s.progress)
  const points = useMemo(() => arcPoints(0, Math.max(progress / 100, 0.002), 64), [progress])
  return <Line points={points} color="#f6c453" lineWidth={2.2} />
}

// Câmara: vista geral ou perseguição suave da nave.
function CameraRig({ smooth, follow, controls }) {
  const target = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, delta) => {
    if (!follow) return
    const { phase } = useMission.getState()
    const ship = phase === 'surface' ? marsAt(1) : transferPoint(smooth.current)
    target.lerp(ship, 1 - Math.exp(-delta * 3))
    desired.copy(ship).multiplyScalar(1.35).add(new THREE.Vector3(0, 3.2, 0))
    state.camera.position.lerp(desired, 1 - Math.exp(-delta * 2))
    if (controls.current) {
      controls.current.target.copy(target)
      controls.current.update()
    } else {
      state.camera.lookAt(target)
    }
  })
  return null
}

function Scene({ follow }) {
  const smooth = useSmoothProgress()
  const controls = useRef()
  const phase = useMission((s) => s.phase)
  const earthOrbit = useMemo(() => ringPoints(R_EARTH), [])
  const marsOrbit = useMemo(() => ringPoints(R_MARS), [])
  const plannedArc = useMemo(() => arcPoints(0, 1), [])

  return (
    <>
      <color attach="background" args={['#0c0910']} />
      <ambientLight intensity={0.22} />
      <Stars radius={60} depth={40} count={2400} factor={3.5} fade speed={0.4} />
      <Sun />
      <Line points={earthOrbit} color="#3d6b8a" lineWidth={1} transparent opacity={0.45} />
      <Line points={marsOrbit} color="#c45a2a" lineWidth={1} transparent opacity={0.45} />
      <Line points={plannedArc} color="#d9a066" lineWidth={1} dashed dashSize={0.18} gapSize={0.14} transparent opacity={0.6} />
      <Planet smooth={smooth} at={earthAt} radius={0.42} color="#3d6b8a" label="Terra" spin={0.6} />
      <Planet smooth={smooth} at={marsAt} radius={0.32} color="#c45a2a" label="Marte" spin={0.5} />
      {phase !== 'briefing' && (
        <>
          <Trail />
          <Ship smooth={smooth} />
        </>
      )}
      <OrbitControls ref={controls} enablePan={false} minDistance={3} maxDistance={28} enabled={!follow} />
      <CameraRig smooth={smooth} follow={follow} controls={controls} />
    </>
  )
}

export default function SpaceScene() {
  const progress = useMission((s) => s.progress)
  const [follow, setFollow] = useState(false)
  const day = Math.round((progress / 100) * TRANSFER_DAYS)
  const distanceMkm = ((progress / 100) * 225).toFixed(0)

  return (
    <div className="viewport">
      <Canvas camera={{ position: [0, 11, 11], fov: 45 }}>
        <Scene follow={follow} />
      </Canvas>
      <div className="viewport-hud">
        <span>
          Dia <b>{day}</b> / {TRANSFER_DAYS}
        </span>
        <span>
          <b>{distanceMkm}</b> M km
        </span>
        <button type="button" className={follow ? 'on' : ''} onClick={() => setFollow((f) => !f)}>
          {follow ? 'Vista geral' : 'Seguir nave'}
        </button>
      </div>
      <div className="viewport-legend">
        <span>Terra</span>
        <i />
        <span>transferência de Hohmann</span>
        <i />
        <span>Marte</span>
      </div>
    </div>
  )
}
