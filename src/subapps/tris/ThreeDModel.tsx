'use client'; // Ensures client-side rendering

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, AccumulativeShadows, RandomizedLight, BakeShadows } from '@react-three/drei';
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
      child.receiveShadow = false; // Prevent the model from receiving its own shadow
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
  scale = [18, 18, 18],
  position = [0, 0, 0], // Adjusted to remove intersection with shadow plane
  rotation = [0, 0, 0],
  cameraPosition = [0, 0, 40],
  fov = 50,
}) => {
  return (
    <Canvas
      shadows
      style={{ width: `${size}px`, height: `${size}px`, cursor: 'pointer' }}
      camera={{ position: cameraPosition, fov: fov }}
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
      
      <Environment preset="apartment" />
      
      <AccumulativeShadows temporal frames={100} color="#316d39" colorBlend={0.5} opacity={0.7} scale={10} position={[0, -0.1, 0]}>
        <RandomizedLight amount={8} radius={5} ambient={0.5} position={[5, 3, 2]} bias={0.001} />
      </AccumulativeShadows>

      {/* Removed ContactShadows */}

      <Suspense fallback={null}>
        <motion.group position={position}>
          <GenericModel
            modelPath={modelPath}
            scale={scale}
            position={[0, 0, 0]}
            rotation={rotation}
          />
        </motion.group>
      </Suspense>

      <BakeShadows />

      <EffectComposer>
        <SSAO radius={0.1} intensity={150} luminanceInfluence={0.5} color="black" />
        <Bloom intensity={0.5} luminanceThreshold={0.9} luminanceSmoothing={0.025} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
};

useGLTF.preload('/models-3d/placeholder.glb'); // Preload a placeholder or default model if needed