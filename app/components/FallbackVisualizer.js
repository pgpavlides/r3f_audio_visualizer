'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// A visualizer that represents frequency data as bars
const FrequencyBars = ({ audioData }) => {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  
  // Initialize refs for all bars
  const numBars = 32; // Number of frequency bars to display
  
  // Default values for when audio isn't playing yet
  const intensity = audioData?.average ?? 0;
  const frequencyData = audioData?.frequencyData ?? Array(64).fill(0);
  
  // Create material with color based on audio intensity
  const material = useMemo(() => {
    const color = new THREE.Color(0x2244ff);
    const emissive = new THREE.Color(0xff5500);
    
    return new THREE.MeshPhongMaterial({
      color,
      emissive,
      shininess: 80,
      specular: new THREE.Color(0xffffff)
    });
  }, []);
  
  // Update bar heights based on frequency data
  useFrame(() => {
    if (groupRef.current) {
      // Rotate the entire group slowly
      groupRef.current.rotation.y += 0.003;
      
      // Update each bar's height based on its frequency value
      for (let i = 0; i < numBars; i++) {
        if (meshRefs.current[i]) {
          // Get frequency data for this bar
          const freqIndex = Math.floor(i * (frequencyData.length / numBars));
          const value = frequencyData[freqIndex] || 0;
          
          // Update bar height
          meshRefs.current[i].scale.y = 0.1 + value * 3; // Scale height based on frequency
          
          // Update material emissive intensity based on frequency
          meshRefs.current[i].material.emissive.setRGB(
            value * 1.5, // Red
            value * 0.5, // Green
            value * 0.8  // Blue
          );
          
          // Add subtle movement
          meshRefs.current[i].position.y = value * 0.5; // Move up a bit with higher values
        }
      }
    }
  });

  // Create the bar geometries
  const bars = useMemo(() => {
    const barItems = [];
    const radius = 1.5; // Circle radius
    
    for (let i = 0; i < numBars; i++) {
      // Calculate position on a circle
      const angle = (i / numBars) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      barItems.push(
        <mesh
          key={i}
          position={[x, 0, z]}
          rotation={[0, -angle, 0]} // Rotate to face center
          ref={(el) => { meshRefs.current[i] = el; }}
        >
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshPhongMaterial 
            color={material.color} 
            emissive={material.emissive}
            shininess={material.shininess}
            specular={material.specular}
          />
        </mesh>
      );
    }
    
    return barItems;
  }, [material]);

  return (
    <group ref={groupRef}>
      {bars}
      
      {/* Add a central object that pulses with the overall intensity */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3 + intensity * 0.2, 32, 32]} />
        <meshPhongMaterial 
          color="#6600ff" 
          emissive="#ff3300"
          emissiveIntensity={intensity * 2}
          shininess={100}
        />
      </mesh>
      
      {/* Add a circular platform */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius + 0.3, 32]} />
        <meshPhongMaterial 
          color="#111122" 
          emissive="#112244"
          emissiveIntensity={0.5}
          shininess={30}
        />
      </mesh>
    </group>
  );
};

export default function FallbackVisualizer({ audioData }) {
  return (
    <div className="visualizer-container">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 4]} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <FrequencyBars audioData={audioData} />
      </Canvas>
      <div className="fallback-notice">
        Using simplified visualizer (shader fallback mode)
      </div>
    </div>
  );
}
