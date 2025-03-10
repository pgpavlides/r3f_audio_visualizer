'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Import our shaders
import { vertexShader, fragmentShader } from '../shaders';
import VisualizerControls from './VisualizerControls';
import { useShaderDebug } from '../utils/shaderUtils';
import FallbackVisualizer from './FallbackVisualizer';

const AudioAnalyzer = ({ audioSrc, setAudioData }) => {
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Handle audio source changes (when user uploads a new file)
  useEffect(() => {
    // Reset play state when source changes
    setIsPlaying(false);
    
    // Clean up old audio if it exists
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    
    // Create new audio element with new source
    const audio = new Audio(audioSrc);
    setAudioElement(audio);
    
    // If we already have an audio context, connect the new audio element
    if (audioContext && analyser) {
      audio.addEventListener('canplaythrough', () => {
        try {
          const source = audioContext.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
        } catch (e) {
          // Handle potential errors with reconnection
          console.error("Error connecting new audio source:", e);
        }
      });
    }
  }, [audioSrc]);

  // Initial setup of AudioContext and Analyser
  useEffect(() => {
    // Setup audio context and analyzer when component mounts
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const analyzer = context.createAnalyser();
    
    // Set a more detailed FFT size for better frequency resolution
    analyzer.fftSize = 128; // This will give us 64 frequency bins
    
    setAudioContext(context);
    setAnalyser(analyzer);

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      if (context) {
        context.close();
      }
    };
  }, []);

  // Connect audio to analyzer when both are available
  useEffect(() => {
    if (!audioContext || !analyser || !audioElement) return;
    
    const onCanPlay = () => {
      try {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      } catch (e) {
        console.error("Error setting up audio:", e);
      }
    };
    
    audioElement.addEventListener('canplaythrough', onCanPlay);
    
    return () => {
      audioElement.removeEventListener('canplaythrough', onCanPlay);
    };
  }, [audioContext, analyser, audioElement]);

  // Audio data analysis loop
  useEffect(() => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateData = () => {
      if (!isPlaying) {
        // If not playing, request next frame and return
        requestAnimationFrame(updateData);
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average frequency and intensity
      let sum = 0;
      let peakFrequency = 0;
      let peakValue = 0;
      
      // Normalize the frequency data (0-1 range)
      const normalizedData = Array(bufferLength).fill(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        sum += value;
        normalizedData[i] = value / 255;
        
        if (value > peakValue) {
          peakValue = value;
          peakFrequency = i;
        }
      }
      
      const average = sum / bufferLength / 255; // Normalize to 0-1
      const peak = peakValue / 255; // Normalize to 0-1
      
      setAudioData({
        average,
        peak,
        peakFrequency: peakFrequency / bufferLength, // Normalize to 0-1
        frequencyData: normalizedData // Array of normalized values
      });
      
      requestAnimationFrame(updateData);
    };

    const animation = requestAnimationFrame(updateData);
    
    return () => {
      cancelAnimationFrame(animation);
    };
  }, [analyser, isPlaying, setAudioData]);

  const togglePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioContext.resume().then(() => {
        audioElement.play().catch(e => {
          console.error("Error playing audio:", e);
        });
        setIsPlaying(true);
      });
    }
  };

  return (
    <div className="audio-controls">
      <button 
        onClick={togglePlayPause} 
        className="play-button"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};

const VisualizerMesh = ({ audioData, controls }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const { clock } = useThree();
  
  // Default values for when audio isn't playing yet
  const intensity = (audioData?.average ?? 0) * (controls?.sensitivity ?? 1.0);
  const peak = (audioData?.peak ?? 0) * (controls?.sensitivity ?? 1.0);
  const peakFrequency = audioData?.peakFrequency ?? 0.5;
  
  // Default frequency data if none is available
  const frequencyData = audioData?.frequencyData ?? Array(64).fill(0);
  
  // Use provided control values or fallback to defaults
  const frequency = controls?.frequency ?? 3.0;
  const amplitude = controls?.amplitude ?? 0.2;
  const waveIntensity = controls?.waveIntensity ?? 1.0;
  const resolution = controls?.resolution ?? 1.0;
  
  // Convert the frequency data array to a Float32Array for the shader
  const audioDataArray = useMemo(() => {
    // Ensure we have 64 elements for the shader
    const paddedData = Array(64).fill(0);
    for (let i = 0; i < Math.min(frequencyData.length, 64); i++) {
      // Apply wave intensity to make frequency data more or less pronounced
      paddedData[i] = frequencyData[i] * waveIntensity;
    }
    return new Float32Array(paddedData);
  }, [frequencyData, waveIntensity]);
  
  // Dynamically update mesh and material based on audio
  useFrame(() => {
    if (materialRef.current) {
      // Update time uniform
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      
      // Update audio-reactive uniforms
      materialRef.current.uniforms.uIntensity.value = intensity * 2 + 0.2;
      materialRef.current.uniforms.uAmplitude.value = amplitude + peak * 0.5;
      materialRef.current.uniforms.uPeakFrequency.value = peakFrequency;
      materialRef.current.uniforms.uFrequency.value = frequency;
      
      // Update audio data array uniform
      materialRef.current.uniforms.uAudioData.value = audioDataArray;
      
      // Also update mesh animation based on audio
      if (meshRef.current) {
        // Make mesh move with the music
        const baseRotation = -Math.PI / 4; // Starting rotation
        meshRef.current.rotation.x = baseRotation + Math.sin(clock.getElapsedTime() * 0.5) * 0.05 * intensity;
        meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.3) * 0.05 * peak;
        
        // Add some subtle movement based on audio intensity
        meshRef.current.position.y = intensity * 0.1 - 0.05; // Slight up/down movement with beat
      }
    }
  });
  
  // Create dynamic color based on audio
  const baseColor = useMemo(() => {
    // Adjust hue based on peak frequency
    const h = 0.6 - peakFrequency * 0.5; // Blue (0.6) to purple/red area as frequency increases
    const s = 0.7 + intensity * 0.3; // More saturation with higher intensity
    const l = 0.2 + intensity * 0.1; // Slightly brighter with higher intensity
    
    return new THREE.Color().setHSL(h, s, l);
  }, [peakFrequency, intensity]);
  
  // Create accent color (complementary to base)
  const accentColor = useMemo(() => {
    // Complementary or high contrast color
    const h = (baseColor.getHSL({}).h + 0.5) % 1.0; // Opposite hue
    const s = 0.9; // High saturation
    const l = 0.5 + peak * 0.2; // Brighter with peaks
    
    return new THREE.Color().setHSL(h, s, l);
  }, [baseColor, peak]);

  // All uniforms must have the same precision in both shaders
  const uniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uFrequency: { value: frequency },
    uAmplitude: { value: amplitude },
    uIntensity: { value: 0.5 },
    uPeakFrequency: { value: 0.5 },
    uBaseColor: { value: baseColor },
    uAccentColor: { value: accentColor },
    uAudioData: { value: audioDataArray } // Add frequency data array
  }), [frequency, amplitude, baseColor, accentColor, audioDataArray]);

  // Calculate grid size based on resolution control (higher resolution = more detailed waves)
  const gridSize = Math.floor(64 * resolution);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 4, 0, 0]}>
      <planeGeometry args={[5, 5, gridSize, gridSize]} /> {/* Dynamic resolution */}
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        precision="mediump"
      />
    </mesh>
  );
};

export default function AudioVisualizer({ audioSrc = '/audio/song.mp3' }) {
  const [audioData, setAudioData] = useState(null);
  const [controls, setControls] = useState({
    frequency: 3.0,
    amplitude: 0.2,
    sensitivity: 1.0,
    waveIntensity: 1.0,
    resolution: 1.0
  });
  const [useShaderVisualizer, setUseShaderVisualizer] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Handle shader errors
  useEffect(() => {
    const handleError = (event) => {
      const errorText = event.message || '';
      
      // Check if it's a shader error
      if (errorText.includes('THREE.WebGLProgram') || 
          errorText.includes('shader') || 
          errorText.includes('VALIDATE_STATUS')) {
        console.error('Shader error detected:', errorText);
        setErrorMessage(errorText);
        setUseShaderVisualizer(false);
      }
    };
    
    // Listen for errors
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  const handleControlsChange = (newControls) => {
    setControls(newControls);
  };

  // Toggle between visualizers for debugging
  const toggleVisualizer = () => {
    setUseShaderVisualizer(!useShaderVisualizer);
  };

  return (
    <div className="visualizer-container">
      {useShaderVisualizer ? (
        <>
          <Canvas gl={{ antialias: true, alpha: true, precision: "mediump" }}>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              rotateSpeed={0.5}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 4}
            />
            <ambientLight intensity={0.5} />
            <VisualizerMesh audioData={audioData} controls={controls} />
          </Canvas>
        </>
      ) : (
        // Fallback visualizer if shaders fail
        <FallbackVisualizer audioData={audioData} />
      )}
      
      <AudioAnalyzer 
        audioSrc={audioSrc} 
        setAudioData={setAudioData}
      />
      
      <VisualizerControls onControlsChange={handleControlsChange} />
      
      {errorMessage && (
        <div className="error-message">
          Shader error detected. Using fallback visualizer.
          <button 
            onClick={() => setErrorMessage(null)} 
            className="close-button"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Debug button to toggle visualizers */}
      <button 
        onClick={toggleVisualizer}
        className="debug-toggle"
        style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 20, opacity: 0.5, fontSize: '10px' }}
      >
        Toggle Visualizer Mode
      </button>
    </div>
  );
}
