'use client';

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Preloader from "./components/preloader";

// Use dynamic import with SSR disabled for the visualizers
const LineVisualizer = dynamic(
  () => import("./components/LineVisualizer"),
  { ssr: false }
);

export default function Home() {
  const [audioSrc, setAudioSrc] = useState('/audio/song.mp3');
  
  // State for controlling each phase of the sequence
  const [showPreloader, setShowPreloader] = useState(true);  // 1. LogoGP.svg with loading bar
  const [preloaderFadingOut, setPreloaderFadingOut] = useState(false); // 2. Preloader fading out
  const [progress, setProgress] = useState(0);
  const [showAppLogo, setShowAppLogo] = useState(false);    // 3. audio-visualizer-logo.svg appears
  const [showContent, setShowContent] = useState(false);     // 5. Content appears as background fades
  
  // Simulate loading progress
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          
          // EXACTLY SEQUENCED STEPS:
          
          // 2. Loading bar fills, BOTH LogoGP.svg AND loading bar fade out
          setTimeout(() => {
            setPreloaderFadingOut(true);
            
            // Wait for fade out, then remove preloader and show app logo
            setTimeout(() => {
              setShowPreloader(false);
              
              // 3. Wait a moment, then show audio-visualizer-logo.svg
              setTimeout(() => {
                setShowAppLogo(true);
                
                // 4. After a while, fade out the application logo
                setTimeout(() => {
                  setShowAppLogo(false);
                  
                  // 5. After logo is gone, fade in the content
                  setTimeout(() => {
                    setShowContent(true);
                  }, 1000);
                }, 2000);
              }, 300);
            }, 1000); // Time for preloader to fade out
          }, 500);
          
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, []);
  
  // Listen for audio selection
  useEffect(() => {
    const handleAudioSelected = (event) => {
      setAudioSrc(event.detail.src);
    };
    
    window.addEventListener('audio-selected', handleAudioSelected);
    return () => {
      window.removeEventListener('audio-selected', handleAudioSelected);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      {/* 1. LogoGP.svg with loading bar */}
      {showPreloader && (
        <div 
          style={{
            opacity: preloaderFadingOut ? 0 : 1,
            transition: 'opacity 1s ease-in-out',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 40
          }}
        >
          <Preloader 
            active={true} 
            progress={progress} 
            logoSrc="/logo/LogoGP.svg"
          />
        </div>
      )}
      
      {/* 3. audio-visualizer-logo.svg appears with fade in */}
      <div 
        className="fixed inset-0 z-30 flex items-center justify-center bg-black"
        style={{
          opacity: showAppLogo ? 1 : 0,
          visibility: showAppLogo ? 'visible' : 'hidden',
          transition: 'opacity 1s ease-in-out, visibility 0s ' + (showAppLogo ? '0s' : '1s')
        }}
      >
        <img 
          src="/logo/audio-visualizer-logo.svg" 
          alt="Audio Visualizer Logo" 
          className="w-64 h-64 object-contain"
        />
      </div>

      {/* 5. Content appears as black background fades */}
      <div 
        className="fixed inset-0 z-20"
        style={{
          opacity: showContent ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
          height: '100%',
          width: '100%'
        }}
      >
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-white">Loading visualizer...</div>
          </div>
        }>
          <LineVisualizer audioSrc={audioSrc} />
        </Suspense>
      </div>
    </div>
  );
}
