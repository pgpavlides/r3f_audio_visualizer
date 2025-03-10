'use client';

import { useState } from 'react';

export default function VisualizerControls({ onControlsChange }) {
  const [controls, setControls] = useState({
    frequency: 3.0,
    amplitude: 0.2,
    sensitivity: 1.0,
    noiseScale: 1.0,
    noiseSpeed: 0.5,
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    const updatedControls = {
      ...controls,
      [name]: numValue
    };
    
    setControls(updatedControls);
    onControlsChange(updatedControls);
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`visualizer-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="controls-toggle"
        onClick={toggleExpand}
      >
        {isExpanded ? 'Hide Controls' : 'Show Controls'}
      </button>
      
      {isExpanded && (
        <div className="controls-panel">
          <div className="control-group">
            <label htmlFor="frequency">Wave Frequency</label>
            <input 
              type="range" 
              id="frequency"
              name="frequency"
              min="1"
              max="10"
              step="0.1"
              value={controls.frequency}
              onChange={handleChange}
            />
            <span className="control-value">{controls.frequency.toFixed(1)}</span>
          </div>
          
          <div className="control-group">
            <label htmlFor="amplitude">Wave Height</label>
            <input 
              type="range" 
              id="amplitude"
              name="amplitude"
              min="0.05"
              max="0.5"
              step="0.01"
              value={controls.amplitude}
              onChange={handleChange}
            />
            <span className="control-value">{controls.amplitude.toFixed(2)}</span>
          </div>
          
          <div className="control-group">
            <label htmlFor="sensitivity">Audio Sensitivity</label>
            <input 
              type="range" 
              id="sensitivity"
              name="sensitivity"
              min="0.1"
              max="3"
              step="0.1"
              value={controls.sensitivity}
              onChange={handleChange}
            />
            <span className="control-value">{controls.sensitivity.toFixed(1)}</span>
          </div>
          
          <div className="control-group">
            <label htmlFor="noiseScale">Noise Scale</label>
            <input 
              type="range" 
              id="noiseScale"
              name="noiseScale"
              min="0.1"
              max="5"
              step="0.1"
              value={controls.noiseScale}
              onChange={handleChange}
            />
            <span className="control-value">{controls.noiseScale.toFixed(1)}</span>
          </div>
          
          <div className="control-group">
            <label htmlFor="noiseSpeed">Noise Speed</label>
            <input 
              type="range" 
              id="noiseSpeed"
              name="noiseSpeed"
              min="0.1"
              max="2"
              step="0.1"
              value={controls.noiseSpeed}
              onChange={handleChange}
            />
            <span className="control-value">{controls.noiseSpeed.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
