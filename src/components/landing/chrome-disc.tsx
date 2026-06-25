'use client'

import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion'

function Disc({ progressRef }: { progressRef: React.RefObject<number | null> }) {
  const ref = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  useFrame((_, delta) => {
    if (!ref.current) return
    const p = progressRef.current ?? 0
    ref.current.rotation.y += delta * 0.3
    ref.current.rotation.x += delta * 0.08
    ref.current.position.y = -0.4 + p * 0.6
    ref.current.position.x = -viewport.width * 0.2 + p * 0.3
  })

  return (
    <mesh ref={ref} position={[0, -0.4, 0]} rotation={[0.3, 0, 0]}>
      <cylinderGeometry args={[1.2, 1.2, 0.25, 64]} />
      <MeshTransmissionMaterial
        backside
        thickness={0.5}
        roughness={0.05}
        metalness={0.95}
        ior={2.5}
        chromaticAberration={0.4}
        anisotropy={1}
        envMapIntensity={2}
        clearcoat={1}
        clearcoatRoughness={0.1}
        color="#E8804A"
        toneMapped={false}
      />
    </mesh>
  )
}

function Scene({ progressRef }: { progressRef: React.RefObject<number | null> }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <Disc progressRef={progressRef} />
      <Environment preset="sunset" />
    </>
  )
}

export function ChromeDiscScene({ visible }: { visible: boolean }) {
  const { scrollY } = useScroll()
  const scrollProgress = useTransform(scrollY, [0, 3000], [0, 1])
  const progressRef = useRef<number | null>(0)

  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    progressRef.current = latest
  })

  if (typeof window === 'undefined' || !visible) return null

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 0.8 : 0 }}
      transition={{ duration: 0.8 }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: 'none' }}
      >
        <Scene progressRef={progressRef} />
      </Canvas>
    </motion.div>
  )
}
