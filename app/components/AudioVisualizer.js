'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import Navbar from './ui/Navbar';
import { Particles } from './particles/Particles';

// Main visualizer component
export default function AudioVisualizer() {
  return (
    <div className="visualizer-container">
      <Navbar />
      
      <Canvas>
        {/* <color attach="background" args={['#000']} /> */}
        <PerspectiveCamera makeDefault position={[0, 0, 3]} />
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          rotateSpeed={0.5}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        
        {/* Add our particle system */}
        <Particles />
      </Canvas>
    </div>
  );
}