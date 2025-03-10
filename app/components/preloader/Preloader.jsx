'use client';

import React, { useEffect, useState } from 'react';
import './Preloader.css';

/**
 * Preloader Component
 * Shows a loading screen with a logo and progress bar until content is loaded
 */
const Preloader = ({ 
  active = true, 
  progress = 0, 
  logoSrc = "/logo/LogoGP.svg", 
  logoAlt = "Audio Visualizer Logo"
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-screen__container">
        {logoSrc && (
          <img
            className="loading-screen__logo"
            src={logoSrc}
            alt={logoAlt}
          />
        )}
        <div className="progress__container">
          <div
            className="progress__bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;