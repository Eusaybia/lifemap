import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export const ThreeDModel = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const { scene } = useGLTF('/models-3d/garbage-bin.glb'); // Replace with the actual path to your 3D model

  return (
    <div
      style={{
        height: '500px',
        width: '100%',
      }}
    >
      <Canvas shadows>
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 1.5, 3]} fov={50} />

        {/* Ambient Light */}
        <ambientLight intensity={0.5} />

        {/* Point Light acting as the lamp */}
        <pointLight
          ref={lightRef}
          position={[-2, 5, 2]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {/* Floor to receive shadows */}
        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1, 0]}
        >
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>

        {/* Person Model */}
        <React.Suspense fallback={null}>
          <primitive object={scene} castShadow />
        </React.Suspense>

        {/* Controls */}
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
};