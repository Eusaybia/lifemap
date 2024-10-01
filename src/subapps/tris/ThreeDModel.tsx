'use client'; // Ensures client-side rendering

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, AccumulativeShadows, RandomizedLight, BakeShadows, SoftShadows } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { EffectComposer, SSAO, Bloom, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Color } from 'three';

type Generic3DModelProps = {
  modelPath: string;
  onClick: () => void;
  size?: number;
  color?: string;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  cameraPosition?: [number, number, number];
  fov?: number;
};

const GenericModel = ({ modelPath, scale, position, rotation }) => {
  const { scene } = useGLTF(modelPath);

  // Ensure no part of the model casts shadows below its base
  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true; // Allow meshes to both cast and receive shadows
    }
  });

  return (
    <primitive object={scene} scale={scale} position={position} rotation={rotation} />
  );
};

export const Generic3DModel: React.FC<Generic3DModelProps> = ({
  modelPath,
  onClick,
  size = 160,
  color = 'white',
  scale = [2, 2, 2],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  cameraPosition = [0, 50, 5],
  fov = 34,
}) => {
  return (
    <Canvas
      shadows
      style={{ width: `${size}px`, height: `${size}px`, cursor: 'pointer' }}
      camera={{ position: cameraPosition, fov: fov, up: [0, 0, -1] }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label="3D Model"
      role="button"
      gl={{ alpha: true, antialias: true }}
    >
      {/* Enable soft shadows */}
      <SoftShadows size={20} samples={16} focus={0.7} />

      {/* Increase ambient light intensity for softer overall illumination */}
      <ambientLight intensity={0.1} />

      {/* Main directional light for shadows */}
      <directionalLight
        position={[-5, 10, -5]}
        intensity={2.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-radius={18}  // Increased shadow radius for softer edges
        shadow-bias={-0.0001}
      />


      {/* Environment for realistic reflections */}
      <Environment preset="apartment" />

      <Suspense fallback={null}>
        <motion.group position={position}>
          <GenericModel
            modelPath={modelPath}
            scale={scale}
            position={[0, 2, 0]}
            rotation={rotation}
          />
        </motion.group>
      </Suspense>

      {/* Ground plane to receive shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.5} /> {/* Reduced opacity for softer shadows */}
      </mesh>

      {/* Post-processing effects */}
      <EffectComposer>
        <SSAO radius={0.1} intensity={2} luminanceInfluence={0.6} color={new Color("black")} worldDistanceThreshold={0} worldDistanceFalloff={0} worldProximityThreshold={0} worldProximityFalloff={0} />
        <Bloom intensity={0.05} luminanceThreshold={0.9} luminanceSmoothing={0.025} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
};

useGLTF.preload('/models-3d/placeholder.glb'); // Preload a placeholder or default model if needed