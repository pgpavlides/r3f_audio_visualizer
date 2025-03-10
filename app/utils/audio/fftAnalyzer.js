'use client';

/**
 * FFT Audio Analyzer
 * Enhanced audio analysis with various frequency range utilities
 */
class FFTAnalyzer {
  constructor(audioElement, audioContext, initialVolume = 1.0) {
    this.audio = audioElement;
    this.audioContext = audioContext;
    this.gain = this.audioContext.createGain();
    this.gain.gain.value = initialVolume;
    
    // Flag to track if the source is already set up
    this.isSourceSetup = false;
    
    // Create analyzer node
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 2048; // More detailed frequency analysis
    this.analyzer.smoothingTimeConstant = 0.8;
    
    this.bufferLength = this.analyzer.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    // Setup for frequency range data
    this.frequencyData = {
      bass: new Uint8Array(this.bufferLength),
      mid: new Uint8Array(this.bufferLength),
      treble: new Uint8Array(this.bufferLength),
      full: new Uint8Array(this.bufferLength),
    };
    
    // Frequency ranges (Hz)
    this.ranges = {
      bass: { min: 20, max: 250 },
      mid: { min: 250, max: 2000 },
      treble: { min: 2000, max: 16000 },
    };
    
    // For average calculations
    this.averages = {
      bass: 0,
      mid: 0,
      treble: 0,
      full: 0,
    };
    
    // For normalized calculations (0-1 range)
    this.normalized = {
      bass: 0,
      mid: 0,
      treble: 0,
      full: 0,
    };
    
    // For binning frequency data
    this.binCount = 64; // Number of bins to use for visualization
    this.bins = new Array(this.binCount).fill(0);
    
    // For peak detection
    this.peakDetection = {
      threshold: 0.5,
      decay: 0.95,
      peaks: new Array(this.binCount).fill(0),
      isPeak: false,
      lastPeakTime: 0,
    };
    
    // For energy calculation
    this.energy = {
      current: 0,
      history: new Array(50).fill(0),
      average: 0,
    };
    
    // Callbacks
    this.onDataCallback = null;
    this.onBeatCallback = null;
    
    // Flag to use fallback data when needed
    this.useFallbackData = false;
    
    // Setup audio source
    if (audioElement.src) {
      this.setupSource();
    }
  }
  
  // Create dummy data for testing/fallback
  createDummyData() {
    // Generate some random data
    const now = Date.now() / 1000;
    
    // Reset arrays
    this.dataArray.fill(0);
    
    // Add some simulated frequency data
    for (let i = 0; i < this.bufferLength; i++) {
      // Different patterns for different frequency ranges
      if (i < this.bufferLength * 0.2) { // Bass
        this.dataArray[i] = 128 + 127 * Math.sin(now * 1.5 + i * 0.05);
      } else if (i < this.bufferLength * 0.5) { // Mid
        this.dataArray[i] = 128 + 127 * Math.sin(now * 2.5 + i * 0.08);
      } else { // Treble
        this.dataArray[i] = 128 + 127 * Math.sin(now * 3.5 + i * 0.1);
      }
    }
    
    return this.dataArray;
  }
  
  setupSource() {
    console.log("Setting up audio source");
    try {
      // If source is already set up, don't set it up again
      if (this.isSourceSetup) {
        console.log("Source already set up, skipping setup");
        return;
      }
      
      // Disconnect any existing connections
      if (this.source) {
        this.source.disconnect();
      }
      
      // Create and connect media element source
      try {
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyzer);
        this.analyzer.connect(this.gain);
        this.gain.connect(this.audioContext.destination);
        
        // Mark source as set up
        this.isSourceSetup = true;
        this.useFallbackData = false;
        
        console.log("FFT Analyzer: Source setup complete");
      } catch (err) {
        console.error("Error creating media element source, using fallback:", err);
        this.useFallbackData = true;
      }
    } catch (error) {
      console.error("FFT Analyzer: Error setting up source", error);
      this.useFallbackData = true;
    }
  }
  
  setAudioSource(audioElement) {
    if (audioElement !== this.audio) {
      this.audio = audioElement;
      this.isSourceSetup = false;
      this.setupSource();
    }
  }
  
  setVolume(volume) {
    if (this.gain) {
      this.gain.gain.value = volume;
      return true;
    }
    return false;
  }
  
  getVolume() {
    return this.gain ? this.gain.gain.value : 0;
  }
  
  connectStreamSource(stream) {
    try {
      // Disconnect any existing connections
      if (this.source) {
        this.source.disconnect();
      }
      
      // Create and connect stream source
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyzer);
      
      // Don't connect to destination for microphone to prevent feedback
      this.isSourceSetup = true;
      this.useFallbackData = false;
      
      console.log("FFT Analyzer: Stream source connected");
      return true;
    } catch (error) {
      console.error("FFT Analyzer: Error connecting stream source", error);
      this.useFallbackData = true;
      return false;
    }
  }
  
  disconnectSource() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
      this.isSourceSetup = false;
      console.log("FFT Analyzer: Source disconnected");
      return true;
    }
    return false;
  }
  
  getFrequencyIndex(frequency) {
    // Convert frequency to index in the analyzer data array
    const nyquist = this.audioContext.sampleRate / 2;
    const index = Math.round((frequency / nyquist) * this.bufferLength);
    return Math.min(this.bufferLength - 1, Math.max(0, index));
  }
  
  getFrequencyAtIndex(index) {
    // Convert index to frequency
    const nyquist = this.audioContext.sampleRate / 2;
    return (index / this.bufferLength) * nyquist;
  }
  
  getFrequencyRangeIndices(minFreq, maxFreq) {
    const minIndex = this.getFrequencyIndex(minFreq);
    const maxIndex = this.getFrequencyIndex(maxFreq);
    return { minIndex, maxIndex };
  }
  
  updateData() {
    // Make sure source is set up
    if (!this.isSourceSetup && this.audio.src) {
      this.setupSource();
    }
    
    // Check if we should use fallback data
    if (this.useFallbackData) {
      // Use simulated data when real data is not available
      this.createDummyData();
    } else {
      // Get latest frequency data
      try {
        this.analyzer.getByteFrequencyData(this.dataArray);
        
        // Check if we're getting real data or just zeros
        const hasNonZeroData = this.dataArray.some(val => val > 0);
        if (!hasNonZeroData) {
          console.log("Got all zeros from analyzer, using fallback data");
          this.useFallbackData = true;
          this.createDummyData();
        }
      } catch (err) {
        console.error("Error getting frequency data:", err);
        this.useFallbackData = true;
        this.createDummyData();
      }
    }
    
    // Copy data to frequency range arrays
    const ranges = {
      bass: this.getFrequencyRangeIndices(this.ranges.bass.min, this.ranges.bass.max),
      mid: this.getFrequencyRangeIndices(this.ranges.mid.min, this.ranges.mid.max),
      treble: this.getFrequencyRangeIndices(this.ranges.treble.min, this.ranges.treble.max),
    };
    
    // Reset arrays
    this.frequencyData.bass.fill(0);
    this.frequencyData.mid.fill(0);
    this.frequencyData.treble.fill(0);
    this.frequencyData.full.set(this.dataArray);
    
    // Fill frequency range arrays
    for (let i = 0; i < this.bufferLength; i++) {
      if (i >= ranges.bass.minIndex && i <= ranges.bass.maxIndex) {
        this.frequencyData.bass[i] = this.dataArray[i];
      }
      if (i >= ranges.mid.minIndex && i <= ranges.mid.maxIndex) {
        this.frequencyData.mid[i] = this.dataArray[i];
      }
      if (i >= ranges.treble.minIndex && i <= ranges.treble.maxIndex) {
        this.frequencyData.treble[i] = this.dataArray[i];
      }
    }
    
    // Calculate averages for each range
    let bassSum = 0;
    let bassCount = 0;
    let midSum = 0;
    let midCount = 0;
    let trebleSum = 0;
    let trebleCount = 0;
    let fullSum = 0;
    
    for (let i = 0; i < this.bufferLength; i++) {
      if (i >= ranges.bass.minIndex && i <= ranges.bass.maxIndex) {
        bassSum += this.dataArray[i];
        bassCount++;
      }
      if (i >= ranges.mid.minIndex && i <= ranges.mid.maxIndex) {
        midSum += this.dataArray[i];
        midCount++;
      }
      if (i >= ranges.treble.minIndex && i <= ranges.treble.maxIndex) {
        trebleSum += this.dataArray[i];
        trebleCount++;
      }
      fullSum += this.dataArray[i];
    }
    
    this.averages.bass = bassCount > 0 ? bassSum / bassCount : 0;
    this.averages.mid = midCount > 0 ? midSum / midCount : 0;
    this.averages.treble = trebleCount > 0 ? trebleSum / trebleCount : 0;
    this.averages.full = fullSum / this.bufferLength;
    
    // Calculate normalized values (0-1 range)
    this.normalized.bass = this.averages.bass / 255;
    this.normalized.mid = this.averages.mid / 255;
    this.normalized.treble = this.averages.treble / 255;
    this.normalized.full = this.averages.full / 255;
    
    // Create frequency bins for visualization
    this.updateBins();
    
    // Calculate energy
    this.updateEnergy();
    
    // Detect beats
    this.detectBeats();
    
    // Call data callback if set
    if (this.onDataCallback) {
      this.onDataCallback({
        frequencyData: this.frequencyData,
        averages: this.averages,
        normalized: this.normalized,
        bins: this.bins,
        energy: this.energy,
        peaks: this.peakDetection.peaks,
        isPeak: this.peakDetection.isPeak,
      });
    }
  }
  
  updateBins() {
    // Clear bins
    this.bins.fill(0);
    
    // Calculate how many frequency values to place in each bin
    const valuesPerBin = Math.ceil(this.bufferLength / this.binCount);
    
    // Distribute frequency data across bins
    for (let i = 0; i < this.binCount; i++) {
      let sum = 0;
      const startIndex = i * valuesPerBin;
      const endIndex = Math.min(startIndex + valuesPerBin, this.bufferLength);
      
      for (let j = startIndex; j < endIndex; j++) {
        sum += this.dataArray[j];
      }
      
      // Average for this bin
      this.bins[i] = sum / (endIndex - startIndex);
      
      // Update peak values with decay
      this.peakDetection.peaks[i] = Math.max(
        this.bins[i],
        this.peakDetection.peaks[i] * this.peakDetection.decay
      );
    }
  }
  
  updateEnergy() {
    // Calculate current energy level
    const currentEnergy = this.normalized.full;
    
    // Update energy history
    this.energy.history.shift();
    this.energy.history.push(currentEnergy);
    
    // Calculate average energy
    const sum = this.energy.history.reduce((a, b) => a + b, 0);
    this.energy.average = sum / this.energy.history.length;
    
    // Set current energy
    this.energy.current = currentEnergy;
  }
  
  detectBeats() {
    const now = performance.now();
    const timeSinceLastPeak = now - this.peakDetection.lastPeakTime;
    
    // Detect peak based on energy level and threshold
    const isPeak = 
      this.energy.current > this.energy.average * (1 + this.peakDetection.threshold) &&
      timeSinceLastPeak > 100; // Minimum 100ms between peaks
    
    if (isPeak) {
      this.peakDetection.lastPeakTime = now;
      this.peakDetection.isPeak = true;
      
      // Trigger beat callback if set
      if (this.onBeatCallback) {
        this.onBeatCallback({
          energy: this.energy.current,
          threshold: this.peakDetection.threshold,
          timestamp: now,
        });
      }
    } else {
      this.peakDetection.isPeak = false;
    }
  }
  
  setDataCallback(callback) {
    this.onDataCallback = callback;
  }
  
  setBeatCallback(callback) {
    this.onBeatCallback = callback;
  }
  
  setFFTSize(size) {
    // Must be power of 2
    const validSizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    if (validSizes.includes(size)) {
      this.analyzer.fftSize = size;
      this.bufferLength = this.analyzer.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      // Reinitialize frequency data arrays
      this.frequencyData = {
        bass: new Uint8Array(this.bufferLength),
        mid: new Uint8Array(this.bufferLength),
        treble: new Uint8Array(this.bufferLength),
        full: new Uint8Array(this.bufferLength),
      };
      
      return true;
    }
    return false;
  }
  
  setSmoothingTimeConstant(value) {
    if (value >= 0 && value <= 1) {
      this.analyzer.smoothingTimeConstant = value;
      return true;
    }
    return false;
  }
  
  setBinCount(count) {
    if (count > 0 && count <= this.bufferLength / 2) {
      this.binCount = count;
      this.bins = new Array(this.binCount).fill(0);
      this.peakDetection.peaks = new Array(this.binCount).fill(0);
      return true;
    }
    return false;
  }
  
  setPeakThreshold(threshold) {
    if (threshold >= 0) {
      this.peakDetection.threshold = threshold;
      return true;
    }
    return false;
  }
  
  setPeakDecay(decay) {
    if (decay >= 0 && decay <= 1) {
      this.peakDetection.decay = decay;
      return true;
    }
    return false;
  }
  
  // Destroy and clean up
  destroy() {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.gain) {
      this.gain.disconnect();
    }
    if (this.analyzer) {
      this.analyzer.disconnect();
    }
    
    this.onDataCallback = null;
    this.onBeatCallback = null;
  }
}

export default FFTAnalyzer;