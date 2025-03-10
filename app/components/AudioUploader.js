'use client';

import { useState, useRef } from 'react';

export default function AudioUploader({ onAudioSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = (file) => {
    // Check if file is audio
    if (file.type.startsWith('audio/')) {
      setSelectedFile(file);
      
      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);
      onAudioSelect(objectUrl);
    } else {
      alert('Please select an audio file');
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className="audio-uploader">
      <form
        className="audio-uploader-form"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          onChange={handleChange}
        />
        
        <label htmlFor="file-upload" className="audio-uploader-label" onClick={onButtonClick}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
          
          {selectedFile ? (
            <p className="text-white/80">Selected: {selectedFile.name}</p>
          ) : (
            <p>Drag audio file here or click to browse</p>
          )}
        </label>
      </form>
    </div>
  );
}
