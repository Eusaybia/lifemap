'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, AccumulativeShadows, RandomizedLight, BakeShadows, SoftShadows } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { EffectComposer, SSAO, Bloom, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Color } from 'three';

type LandscapeModelProps = {
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

const LandscapeModelRenderer = ({ modelPath, scale, position, rotation }) => {
  const { scene } = useGLTF(modelPath);

  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive object={scene} scale={scale} position={position} rotation={rotation} />
  );
};

export const LandscapeModel: React.FC<LandscapeModelProps> = ({
  modelPath,
  onClick,
  size = 400, // Increased default size for landscapes
  color = 'white',
  scale = [1, 1, 1], // Adjusted default scale for landscapes
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  cameraPosition = [0, 10, 20], // Adjusted camera position for landscapes
  fov = 60, // Wider field of view for landscapes
}) => {
  return (
    <Canvas
      shadows
      style={{ width: `${size}px`, height: `${size}px`, cursor: 'pointer' }}
      camera={{ position: cameraPosition, fov: fov, up: [0, 1, 0] }} // Changed up vector for landscape orientation
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label="Landscape 3D Model"
      role="button"
      gl={{ alpha: true, antialias: true }}
    >
      <SoftShadows size={25} samples={20} focus={0.8} /> // Adjusted for larger landscape scenes

      <ambientLight intensity={0.2} /> // Increased ambient light for outdoor scenes

      <directionalLight
        position={[-10, 20, -10]}
        intensity={3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-radius={20}
        shadow-bias={-0.0001}
      />

      <Environment preset="sunset" /> // Changed to sunset for a more dramatic landscape lighting

      <Suspense fallback={null}>
        <motion.group position={position}>
          <LandscapeModelRenderer
            modelPath={modelPath}
            scale={scale}
            position={[0, 0, 0]} // Adjusted to sit on the ground
            rotation={rotation}
          />
        </motion.group>
      </Suspense>

      {/* Ground plane removed as the landscape model should include its own ground */}

      <EffectComposer>
        <SSAO radius={0.2} intensity={3} luminanceInfluence={0.6} color={new Color("black")} />
        <Bloom intensity={0.1} luminanceThreshold={0.8} luminanceSmoothing={0.05} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
};

useGLTF.preload('/models-3d/chinese-mountains.glb'); // Preload the landscape model