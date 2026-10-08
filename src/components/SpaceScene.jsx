import { Canvas } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import { useMemo } from 'react'
import { useMission } from '../store/missionStore'

function orbitPoint(t) {
  const a = 6.2
  const b = 3.6
  const x = Math.cos(t) * a
  const z = Math.sin(t) * b
  return [x, Math.sin(t * 2) * 0.12, z]
}

function Ship({ progress }) {
  const t = -Math.PI + (progress / 100) * Math.PI
  const [x, y, z] = orbitPoint(t)
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[0, t, 0.4]}>
        <coneGeometry args={[0.12, 0.42, 6]} />
        <meshStandardMaterial color="#f3ede3" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#c9e4dc" />
      </mesh>
    </group>
  )
}

function Worlds() {
  return (
    <>
      <mesh position={orbitPoint(-Math.PI)}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#3d6b8a" roughness={0.8} />
      </mesh>
      <mesh position={orbitPoint(0)}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#c45a2a" roughness={0.9} />
      </mesh>
    </>
  )
}

export default function SpaceScene() {
  const progress = useMission((s) => s.progress)
  const phase = useMission((s) => s.phase)
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 64; i += 1) {
      pts.push(orbitPoint(-Math.PI + (i / 64) * Math.PI))
    }
    return pts
  }, [])

  return (
    <div className="viewport">
      <Canvas camera={{ position: [0, 5.4, 9.2], fov: 42 }}>
        <color attach="background" args={['#140e16']} />
        <ambientLight intensity={0.35} />
        <pointLight position={[4, 6, 2]} intensity={40} color="#f2c14e" />
        <pointLight position={[-6, 1, -2]} intensity={12} color="#c9e4dc" />
        <Stars radius={40} depth={30} count={1200} factor={3} fade speed={0.4} />
        <Line points={points} color="#d9a066" lineWidth={1} transparent opacity={0.55} />
        <Worlds />
        {phase !== 'briefing' && <Ship progress={progress} />}
      </Canvas>
      <div className="viewport-legend">
        <span>Terra</span>
        <i />
        <span>arco de transferência</span>
        <i />
        <span>Marte</span>
      </div>
    </div>
  )
}
