'use client';

import React, { useRef } from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';

// Create the shader material exactly as shown in the screenshot
const RenderMaterial = shaderMaterial(
  {
    time: 0,
  },
  // Vertex shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 3.0;
  }
  `,
  // Fragment shader
  `
  varying vec2 vUv;
  void main() {
    gl_FragColor.rgba = vec4(vUv, 0., 1.0);
  }
  `
);

// Extend our custom material to make it available as a JSX element
extend({ RenderMaterial });

export function Particles() {
  const materialRef = useRef();
  
  // Update the time uniform on each frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime;
    }
  });

  return (
    <points>
      <sphereGeometry attach="geometry" args={[0.5, 32, 32]} />
      <renderMaterial ref={materialRef} />
    </points>
  );
}
