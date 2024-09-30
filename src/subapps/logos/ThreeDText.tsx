import React from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import {
  Text3D,
  Environment,
  Lightformer,
  OrbitControls,
  RandomizedLight,
  AccumulativeShadows,
  MeshTransmissionMaterial
} from '@react-three/drei'
import { RGBELoader } from 'three-stdlib'

interface ThreeDTextProps {
  text: string
}

export const ThreeDText: React.FC<ThreeDTextProps> = ({ text }) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 500], fov: 1 }}
      gl={{ preserveDrawingBuffer: true, alpha: true }}
    >
      <Text
        text={text}
        config={{
          transmission: 0.98,
          thickness: 0.3,
          roughness: 0.01,
          clearcoat: 0.1,
          clearcoatRoughness: 0.1,
          ior: 1.2,
          // @ts-ignore
          envMapIntensity: 0.1,
          distortion: 0.05,
          distortionScale: 0.2,
          temporalDistortion: 0.05,
          attenuationDistance: 1,
          attenuationColor: '#ffffff',
          color: '#ffffff',
          shadow: '#000000'
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]} // Keep text at origin
      />
      {/* Controls */}
      <OrbitControls
        target={[0, 0, 0]}
        autoRotate={false}
        autoRotateSpeed={-0.1}
        enableZoom={false}
        enablePan={false}
        dampingFactor={0.05}
        minPolarAngle={0}
        maxPolarAngle={0}
      />
      {/* Environment */}
      <Environment resolution={32}>
        <group rotation={[-Math.PI / 4, -0.3, 0]}>
          <Lightformer intensity={20} rotation-x={Math.PI / 4} position={[-15, 10, 10]} scale={[10, 10, 1]} />
        </group>
      </Environment>
      {/* Soft shadows */}
      <AccumulativeShadows
        frames={50}
        color="#94cbff"
        colorBlend={10}
        toneMapped
        alphaTest={1}
        opacity={1}
        scale={60} // Increased from 30 to 50
        position={[0, 0, 0]}
      >
        <RandomizedLight
          amount={1}
          radius={1}
          ambient={0.6}
          intensity={3}
          position={[-10, 20, -10]}
          size={15}
          mapSize={2048}
          bias={0}
        />
      </AccumulativeShadows>
    </Canvas>
  )
}

interface TextProps {
  text: string
  config: {
    transmission: number
    clearcoat: number
    clearcoatRoughness: number
    thickness: number
    anisotropy: number
    roughness: number
    distortion: number
    distortionScale: number
    temporalDistortion: number
    ior: number
    color: string
    shadow: string
  }
  font?: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const Text: React.FC<TextProps> = ({ text, config, font = '/fonts/Inter-Medium-Regular.json', ...props }) => {
  const texture = useLoader(RGBELoader, '/textures/aerodynamics_workshop_1k.hdr')

  return (
    <Text3D
      castShadow
      bevelEnabled
      font={font}
      scale={3}
      letterSpacing={-0.03}
      height={0.25}
      bevelSize={0.01}
      bevelSegments={10}
      curveSegments={128}
      bevelThickness={0.01}
      {...props} // Spread props to include position and rotation
    >
      {text}
      <MeshTransmissionMaterial {...config} background={texture} />
    </Text3D>
  )
}

export default ThreeDText
