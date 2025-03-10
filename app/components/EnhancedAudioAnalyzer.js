'use client';

import React, { useRef, useState, useEffect } from 'react';
import FFTAnalyzer from '../utils/audio/fftAnalyzer';

const EnhancedAudioAnalyzer = ({ audioUrl, onAudioData }) => {
  const [audioElement, setAudioElement] = useState(null);
  const [analyzer, setAnalyzer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const animationRef = useRef(null);
  
  // Initialize audio on component mount
  useEffect(() => {
    try {
      // Create audio context
      const context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create audio element
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      
      // Create analyzer
      const fftAnalyzer = new FFTAnalyzer(audio, context);
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', () => {
        try {
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
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      // Set up analyzer first
      setAudioElement(audio);
      setAnalyzer(fftAnalyzer);

      // Then set audio source
      audio.src = audioUrl;
      audio.load();
      
      // Set callback for analyzer data
      fftAnalyzer.setDataCallback((data) => {
        if (onAudioData) {
          console.log("Sending audio data", data.normalized);
          onAudioData({
            ...data,
            isPlaying: isPlaying
          });
        }
      });
      
    } catch (e) {
      console.error("Error initializing audio:", e);
      setError("Audio system initialization failed.");
    }
    
    return () => {
      if (analyzer) {
        analyzer.destroy();
      }
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioUrl]);
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioElement || !analyzer || !isLoaded) {
      setError("Audio not ready yet. Please wait or try another file.");
      return;
    }
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    } else {
      setError(null);
      
      // Resume audio context (needed due to browser autoplay policies)
      if (audioElement.audioContext && audioElement.audioContext.state === 'suspended') {
        audioElement.audioContext.resume();
      }
      
      audioElement.play().then(() => {
        console.log("Audio started playing");
        setIsPlaying(true);
        
        // Force setup source if not already done
        if (analyzer && !analyzer.isSourceSetup) {
          analyzer.setupSource();
        }
        
        // Start analysis loop
        const updateData = () => {
          if (analyzer) {
            analyzer.updateData();
            animationRef.current = requestAnimationFrame(updateData);
          }
        };
        
        updateData();
      }).catch(e => {
        console.error("Error playing audio:", e);
        setError("Could not play audio file.");
      });
    }
  };
  
  // Handle file upload
  const handleFileUpload = (file) => {
    if (analyzer) {
      analyzer.destroy();
    }
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    
    if (file && file.type.includes('audio')) {
      const url = URL.createObjectURL(file);
      
      // Create new audio context
      const context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create audio element
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      
      // Create analyzer
      const fftAnalyzer = new FFTAnalyzer(audio, context);
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', () => {
        try {
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
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      // Set audio source
      audio.src = url;
      audio.load();
      
      setAudioElement(audio);
      setAnalyzer(fftAnalyzer);
      
      // Set callback for analyzer data
      fftAnalyzer.setDataCallback((data) => {
        if (onAudioData) {
          onAudioData({
            ...data,
            isPlaying
          });
        }
      });
      
      return url;
    }
    
    return null;
  };
  
  return {
    togglePlayPause,
    isPlaying,
    isLoaded,
    error,
    handleFileUpload,
    renderControls: () => (
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
    )
  };
};

export default EnhancedAudioAnalyzer;