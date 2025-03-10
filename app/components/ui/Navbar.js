'use client';

import React from 'react';

export default function Navbar() {
  return (
    <header className="visualizer-header">
      <div className="logo-container">
        <img 
          src="/logo/audio-visualizer-logo.svg" 
          alt="Audio Visualizer Logo" 
          className="app-logo" 
        />
      </div>
    </header>
  );
}
