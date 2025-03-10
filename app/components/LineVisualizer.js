'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Audio Analyzer Component
const AudioAnalyzer = ({ audioUrl, onAudioData }) => {
  const [audioElement, setAudioElement] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize audio on component mount
  useEffect(() => {
    try {
      // Create audio context
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const newAnalyser = context.createAnalyser();
      newAnalyser.fftSize = 128; // 64 frequency bins
      
      setAudioContext(context);
      setAnalyser(newAnalyser);
      
      // Create audio element
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', () => {
        try {
          const source = context.createMediaElementSource(audio);
          source.connect(newAnalyser);
          newAnalyser.connect(context.destination);
          setIsLoaded(true);
          setError(null);
        } catch (e) {
          console.error("Error setting up audio:", e);
          setError("Could not connect audio source.");
        }
      });
      
      audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        setError("Could not load audio file.");
        setIsLoaded(false);
      });
      
      // Set audio source
      audio.src = audioUrl;
      audio.load();
      setAudioElement(audio);
    } catch (e) {
      console.error("Error initializing audio:", e);
      setError("Audio system initialization failed.");
    }
    
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioUrl]);
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioElement || !audioContext || !isLoaded) {
      setError("Audio not ready yet. Please wait or try another file.");
      return;
    }
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      setError(null);
      audioContext.resume().then(() => {
        audioElement.play().then(() => {
          setIsPlaying(true);
        }).catch(e => {
          console.error("Error playing audio:", e);
          setError("Could not play audio file.");
        });
      });
    }
  };
  
  // Analyze audio data on each animation frame
  useEffect(() => {
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateData = () => {
      if (isPlaying) {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Normalize data
        const normalizedData = Array.from(dataArray).map(val => val / 255);
        
        // Calculate average intensity
        const avgIntensity = normalizedData.reduce((sum, val) => sum + val, 0) / normalizedData.length;
        
        // Send data to parent component
        onAudioData({
          frequencyData: normalizedData,
          average: avgIntensity,
          isPlaying: true
        });
      } else {
        // If not playing, send zero data with isPlaying flag
        onAudioData({
          frequencyData: Array(bufferLength).fill(0),
          average: 0,
          isPlaying: false
        });
      }
      
      requestAnimationFrame(updateData);
    };
    
    const animation = requestAnimationFrame(updateData);
    
    return () => {
      cancelAnimationFrame(animation);
    };
  }, [analyser, isPlaying, onAudioData]);
  
  return (
    <div className="play-control">
      <button 
        onClick={togglePlayPause} 
        className="play-button"
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </button>
      
      {error && (
        <div className="audio-error">{error}</div>
      )}
    </div>
  );
};

// Grid Visualizer Component (inspired by the referenced project)
const GridVisualizer = ({ audioData, controls }) => {
  const meshRef = useRef();
  const { clock } = useThree();
  
  // Grid parameters
  const gridSize = 32; // Number of boxes per side
  const boxSize = 0.05;
  const spacing = 0.15;
  const totalGridSize = gridSize * spacing;
  
  // Create the instanced mesh
  const [geometry, material, matrices] = useMemo(() => {
    const geo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    // Create matrices for each box
    const mats = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      mats.push(new THREE.Matrix4());
    }
    
    return [geo, mat, mats];
  }, []);
  
  // Audio data defaults
  const isPlaying = audioData?.isPlaying ?? false;
  const intensity = (audioData?.average ?? 0) * (controls?.sensitivity ?? 1.0);
  const frequencyData = audioData?.frequencyData ?? Array(64).fill(0);
  
  // Update matrices on each frame
  useFrame(() => {
    if (!meshRef.current) return;
    
    const time = clock.getElapsedTime();
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        const matrix = matrices[index];
        
        // Calculate position
        const x = (i - gridSize / 2) * spacing;
        const y = (j - gridSize / 2) * spacing;
        
        // Calculate height based on audio data and position
        let z = 0;
        
        if (isPlaying) {
          // Map box to frequency (boxes closer to center get lower frequencies)
          const distFromCenter = Math.sqrt(x * x + y * y) / (totalGridSize / 2);
          const freqIndex = Math.min(Math.floor(distFromCenter * 32), 63);
          
          // Get audio intensity for this frequency
          const audioValue = frequencyData[freqIndex] || 0;
          
          // Apply additional height based on audio
          z = audioValue * controls.amplitude * 2.0;
          
          // Add subtle wave pattern
          const wave = Math.sin(time * 2 + x * 2) * Math.cos(time * 1.5 + y * 2) * 0.1;
          z += wave * controls.amplitude;
        }
        
        // Update matrix
        matrix.makeTranslation(x, y, z / 2);
        
        // Scale box height based on audio
        if (isPlaying) {
          matrix.scale(new THREE.Vector3(1, 1, 1 + z * 5));
        }
        
        // Apply to instance
        meshRef.current.setMatrixAt(index, matrix);
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, material, gridSize * gridSize]}
      castShadow
      receiveShadow
    />
  );
};

// Icons for the header
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Main visualizer component
export default function LineVisualizer({ audioSrc = '/audio/song.mp3' }) {
  const [audioData, setAudioData] = useState(null);
  const [controls, setControls] = useState({
    amplitude: 1.0,
    sensitivity: 1.5,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef(null);
  const [logoVisible, setLogoVisible] = useState(false);
  
  // Fade in the logo
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleAudioData = (data) => {
    setAudioData(data);
  };
  
  const handleControlsChange = (newControls) => {
    setControls(newControls);
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
    setShowUpload(false);
  };
  
  const toggleUpload = () => {
    setShowUpload(!showUpload);
    setShowSettings(false);
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.includes('audio')) {
      const url = URL.createObjectURL(file);
      // Pass the URL back to the parent component
      window.dispatchEvent(new CustomEvent('audio-selected', { detail: { src: url } }));
      setShowUpload(false);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="visualizer-container">
      <header className="visualizer-header">
        <div className="logo-container">
          <img 
            src="/logo/audio-visualizer-logo.svg" 
            alt="Audio Visualizer Logo" 
            className="app-logo" 
            style={{
              opacity: logoVisible ? 1 : 0,
              transform: `scale(${logoVisible ? 1 : 0.5})`,
              transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out'
            }}
          />
        </div>
        <div className="header-controls">
          <button className="icon-button" onClick={toggleUpload}>
            <UploadIcon />
          </button>
          <button className="icon-button" onClick={toggleSettings}>
            <SettingsIcon />
          </button>
        </div>
      </header>
      
      <Canvas shadows>
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 5, 20]} />
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          rotateSpeed={0.5}
          target={[0, 0, 0]}
        />
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
        />
        <gridHelper args={[10, 20, '#111', '#222']} />
        <GridVisualizer audioData={audioData} controls={controls} />
        <mesh position={[0, 0, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </Canvas>
      
      <AudioAnalyzer 
        audioUrl={audioSrc} 
        onAudioData={handleAudioData} 
      />
      
      {showSettings && (
        <div className="controls-panel">
          <div className="control-group">
            <label htmlFor="amplitude">Amplitude</label>
            <input 
              type="range" 
              id="amplitude"
              min="0.1"
              max="3.0"
              step="0.1"
              value={controls.amplitude}
              onChange={(e) => handleControlsChange({...controls, amplitude: parseFloat(e.target.value)})}
            />
            <span>{controls.amplitude.toFixed(1)}</span>
          </div>
          
          <div className="control-group">
            <label htmlFor="sensitivity">Sensitivity</label>
            <input 
              type="range" 
              id="sensitivity"
              min="0.1"
              max="3.0"
              step="0.1"
              value={controls.sensitivity}
              onChange={(e) => handleControlsChange({...controls, sensitivity: parseFloat(e.target.value)})}
            />
            <span>{controls.sensitivity.toFixed(1)}</span>
          </div>
        </div>
      )}
      
      {showUpload && (
        <div className="upload-panel">
          <div className="upload-content">
            <h3>Upload Audio File</h3>
            <p>Select an audio file to visualize</p>
            <button className="upload-button" onClick={triggerFileInput}>Choose File</button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="audio/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
