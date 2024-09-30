'use client'; // Ensures client-side rendering

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, SoftShadows } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing'; // Added post-processing effects
import { BlendFunction } from 'postprocessing'; // Required for custom bloom settings
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

const GenericModel = ({
  modelPath,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  modelPath: string;
  scale: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
}) => {
  const { scene } = useGLTF(modelPath) as any;

  // Enable shadows for all meshes in the model
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;    // Model casts shadows
      child.receiveShadow = true; // Model can receive shadows if needed
    }
  });

  return (
    <primitive
      object={scene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  );
};

export const Generic3DModel: React.FC<Generic3DModelProps> = ({
  modelPath,
  onClick,
  size = 160,
  color = 'white',
  scale = [18, 18, 18],
  position = [0, -8, 0], // Adjusted to place the model on the plane
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
      gl={{ alpha: true }}
    >
      <SoftShadows size={10} samples={16} focus={0.5} />

      <ambientLight intensity={0.2} />
      <directionalLight
        position={[-10, 30, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -8.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.4} />
      </mesh>

      <Suspense fallback={null}>
        <motion.group
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          position={position}
        >
          <GenericModel
            modelPath={modelPath}
            scale={scale}
            position={[0, 0, 0]}
            rotation={rotation}
          />
        </motion.group>
      </Suspense>

      {/* Added post-processing effects for enhanced photorealism */}
      <EffectComposer>
        <SSAO
          samples={31}
          radius={20}
          intensity={30}
          luminanceInfluence={0.5}
          color={new Color(0, 0, 0)} worldDistanceThreshold={0} worldDistanceFalloff={0} worldProximityThreshold={0} worldProximityFalloff={0}        />
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={0.3} // Adjust bloom intensity
          width={300}
          height={300}
          kernelSize={3}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.2}
        />
      </EffectComposer>

    </Canvas>
  );
};

useGLTF.preload('/models-3d/placeholder.glb'); // Preload a placeholder or default model if needed