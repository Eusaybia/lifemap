'use client'; // Ensures client-side rendering

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, SoftShadows } from '@react-three/drei';
import { motion } from 'framer-motion-3d';

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
  size = 40,
  color = 'white',
  scale = [4.5, 4.5, 4.5],
  position = [0, 0, 0],
  rotation = [(-10 * Math.PI) / 180, 0, 0],
  cameraPosition = [0, 3.5, 10],
  fov = 34,
}) => {
  return (
    <Canvas
      shadows // Enables shadow mapping in the renderer
      style={{ width: `${size}px`, height: `${size}px`, cursor: 'pointer' }}
      camera={{ position: cameraPosition, fov: fov }} // Configurable camera settings
      onClick={onClick}
      tabIndex={0} // Makes the canvas focusable for accessibility
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label="3D Model"
      role="button"
      gl={{ alpha: true }} // Enables transparent background
      // Optional: background: 'transparent', // Alternatively, set background to transparent
    >
      <SoftShadows />

      {/* Lighting Setup */}
      <ambientLight intensity={0.2} /> {/* Soft ambient light */}

      {/* Directional Light for Model Illumination and Shadow Casting */}
      <directionalLight
        position={[-10, 5, 5]}
        intensity={20}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Backing Plane Positioned Behind the Model */}
      <mesh
        rotation={[0, 0, 0]} // No rotation; vertical plane
        position={[0, 0, -0.1]}  // Positioned behind the model along the Z-axis
        receiveShadow            // Enable the plane to receive shadows
      >
        <planeGeometry args={[10, 10]} /> {/* Large enough to catch shadows */}
        <shadowMaterial transparent opacity={0.5} /> {/* Transparent plane that only shows shadows */}
      </mesh>

      {/* 3D Model */}
      <Suspense fallback={null}>
        <motion.group
          whileHover={{ scale: 1.2 }} // Scales up on hover
          whileTap={{ scale: 0.9 }}   // Scales down on tap/click
          position={[-2, position[1], position[2]]} // Adjust position if needed
        >
          <GenericModel
            modelPath={modelPath}
            scale={scale}
            position={position}
            rotation={rotation}
          />
        </motion.group>
      </Suspense>
    </Canvas>
  );
};

useGLTF.preload('/models-3d/placeholder.glb'); // Preload a placeholder or default model if needed