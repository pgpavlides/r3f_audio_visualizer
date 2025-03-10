'use client';

import { useEffect } from 'react';
import * as THREE from 'three';

// Function to check and fix shader uniforms
export function checkShaderCompilation(shaderMaterial) {
  // This logs any shader compilation errors to help debug
  if (!shaderMaterial) return;
  
  try {
    const gl = shaderMaterial.__webglShader?.program?.getExtension('WEBGL_debug_shaders');
    if (gl) {
      console.log('Vertex shader source:', gl.getTranslatedShaderSource(shaderMaterial.__webglShader.vertexShader));
      console.log('Fragment shader source:', gl.getTranslatedShaderSource(shaderMaterial.__webglShader.fragmentShader));
    }
  } catch (error) {
    console.warn('Could not access shader compilation info:', error);
  }
}

// Hook for debugging shader issues
export function useShaderDebug(materialRef) {
  useEffect(() => {
    if (!materialRef.current) return;
    
    // For debugging and validation
    console.log('Shader material created:', materialRef.current);
    
    return () => {
      // Cleanup
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, [materialRef]);
}

// Function to preflight check for uniform precision issues
export function verifyShaderUniforms(vertexShader, fragmentShader) {
  // Simple check for precision declarations
  if (!vertexShader.includes('precision') && fragmentShader.includes('precision')) {
    console.warn('Vertex shader is missing precision declaration that fragment shader has');
    return false;
  }
  
  return true;
}

// Helper to create shader material with consistent precision
export function createShaderMaterial(vertexShader, fragmentShader, uniforms) {
  // Ensure both shaders have precision declarations
  const vertexWithPrecision = vertexShader.includes('precision') 
    ? vertexShader
    : `precision mediump float;\n${vertexShader}`;
  
  const fragmentWithPrecision = fragmentShader.includes('precision')
    ? fragmentShader
    : `precision mediump float;\n${fragmentShader}`;
  
  return new THREE.ShaderMaterial({
    vertexShader: vertexWithPrecision,
    fragmentShader: fragmentWithPrecision,
    uniforms
  });
}
