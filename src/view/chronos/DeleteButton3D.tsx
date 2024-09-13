// components/DeleteButton3D.tsx
'use client'; // Ensures client-side rendering

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, SoftShadows } from '@react-three/drei';
import { motion } from 'framer-motion-3d';

type DeleteButton3DProps = {
  onClick: () => void;
  size?: number;
  color?: string;
};

const Model = () => {
  const { scene } = useGLTF('/models-3d/garbage-bin.glb') as any;

  // Enable shadows for all meshes in the model
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;    // Model casts shadows
      child.receiveShadow = true; // Model can receive shadows if needed
    }
  });

  // Convert 10 degrees to radians
  const rotationX = (-10 * Math.PI) / 180;

  return (
    <primitive 
      object={scene} 
      scale={[4.5, 4.5, 4.5]} 
      position={[0, 0, 0]} // Adjusted y-position
      rotation={[rotationX, 0, 0]} // Apply rotation: [x, y, z]
    />
  );
};

export const DeleteButton3D: React.FC<DeleteButton3DProps> = ({ onClick, size = 1, color = 'white' }) => {
  const [fov, _] = useState(34); // Initial FOV value

  return (
    <Canvas
      shadows // Enables shadow mapping in the renderer
      style={{ width: '40px', height: '40px', cursor: 'pointer' }} // Adjust size as needed
      camera={{ position: [0, 3.5, 10], fov: fov }} // Existing camera settings
      onClick={onClick}
      tabIndex={0} // Makes the canvas focusable for accessibility
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label="Delete All Pomodoros"
      role="button"
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

      {/* Backing Plane Positioned Behind the Star */}
      <mesh
        rotation={[0, 0, 0]} // No rotation; vertical plane
        position={[0, 0, -0.1]}  // Positioned behind the model along the Z-axis
        receiveShadow            // Enable the plane to receive shadows
      >
        <planeGeometry args={[10, 10]} /> {/* Large enough to catch shadows */}
        <shadowMaterial transparent opacity={0.5} /> {/* Transparent cream-colored plane that only shows shadows */}
      </mesh>

      {/* 3D Model */}
      <Suspense fallback={null}>
        <motion.group
          whileHover={{ scale: 1.2 }} // Scales up on hover
          whileTap={{ scale: 0.9 }}   // Scales down on tap/click
          position={[0, -2, 0]}         // Adjust position if needed
        >
          <Model />
        </motion.group>
      </Suspense>
    </Canvas>
  );
};

useGLTF.preload('/models-3d/garbage-bin.glb'); // Preloads the GLB model for faster loading
