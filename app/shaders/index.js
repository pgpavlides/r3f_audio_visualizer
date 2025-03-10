'use client';

// Raw content of shaders as strings
const vertexShaderCode = `precision mediump float;

varying vec2 vUv;
varying float vElevation;
varying vec3 vNormal;
varying float vFrequencyValue;

uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uIntensity;
uniform float uPeakFrequency;
uniform float uAudioData[64]; // Array of frequency data points

// Function to map audio data to coordinate
float getAudioValue(vec2 uv) {
    // Get frequency index based on x position
    int freqIndexX = int(clamp(floor(uv.x * 64.0), 0.0, 63.0));
    
    // Get frequency index based on y position
    int freqIndexY = int(clamp(floor(uv.y * 64.0), 0.0, 63.0));
    
    // Interpolate between frequencies based on position
    // This creates a 2D wave effect where both X and Y coordinates affect the wave
    float valueX = uAudioData[freqIndexX];
    float valueY = uAudioData[freqIndexY];
    
    // Combine X and Y waves with a phase difference
    return (valueX + valueY) * 0.5;
}

void main() {
    vUv = uv;
    vNormal = normal;
    
    // Create wave effect with multiple frequencies
    vec3 pos = position;
    
    // Get audio data at this vertex position
    float frequencyValue = getAudioValue(vUv);
    vFrequencyValue = frequencyValue; // Pass to fragment shader
    
    // Base wave pattern that moves with time
    float elevation = sin(pos.x * uFrequency + uTime) * uAmplitude;
    elevation += sin(pos.y * uFrequency * 0.8 + uTime) * uAmplitude;
    
    // Add higher frequency details based on audio peak frequency
    float detailFreq = 5.0 + uPeakFrequency * 10.0;
    float detail = sin(pos.x * detailFreq + uTime * 2.0) * sin(pos.y * detailFreq + uTime * 2.0) * 0.1;
    elevation += detail * uIntensity;
    
    // Add direct wave mapping from audio data - this creates the wavelength visualization
    elevation += frequencyValue * 0.5; // Scale for visibility
    
    // Different wave patterns based on position - this creates a more interesting surface
    // Center area has stronger effect
    float centerEffect = 1.0 - distance(vUv, vec2(0.5, 0.5));
    elevation += frequencyValue * centerEffect * 0.2;
    
    // Create concentric wave rings
    float dist = distance(vUv, vec2(0.5, 0.5));
    float rings = sin(dist * 20.0 - uTime * 1.5) * 0.05 * uIntensity;
    elevation += rings * frequencyValue; // Modulate ring height with audio
    
    // Apply audio intensity scaling
    elevation *= uIntensity;
    
    pos.z += elevation;
    vElevation = elevation;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const fragmentShaderCode = `precision mediump float;

varying vec2 vUv;
varying float vElevation;
varying vec3 vNormal;
varying float vFrequencyValue;

uniform float uTime;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform float uPeakFrequency;
uniform float uAudioData[64]; // Array of frequency data points

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Get frequency data at this fragment
    int freqIndex = int(clamp(floor(vUv.x * 64.0), 0.0, 63.0));
    float frequencyValue = uAudioData[freqIndex];
    
    // Create dynamic color based on audio data
    // Higher frequencies shift more towards accent color
    float freqIntensity = frequencyValue * uIntensity;
    
    // Dynamic base color that shifts based on time and intensity
    vec3 dynamicBase = mix(uBaseColor, uBaseColor * 1.2, sin(uTime * 0.2) * 0.5 + 0.5);
    
    // Create color gradient based on position and elevation
    vec3 mixColor = mix(dynamicBase, uAccentColor, vUv.y + vElevation * 0.5);
    
    // Add frequency-based coloring
    vec3 frequencyColor = vec3(0.1, 0.5, 1.0) * vFrequencyValue; // Color based on specific point's frequency
    mixColor = mix(mixColor, frequencyColor, 0.3); // Blend with base color
    
    // Highlight the wavefront with accent color
    float wave = smoothstep(0.0, 0.1, abs(vElevation) * 2.0);
    mixColor = mix(mixColor, uAccentColor, wave * 0.6);
    
    // Add some pulse effect based on time and audio intensity
    float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
    pulse = pulse * uIntensity * 0.3;
    
    // Special highlight based on peak frequency
    float freqHighlight = smoothstep(0.3, 0.7, uPeakFrequency) * 0.5;
    
    // Adjust color based on elevation, pulse, and frequency
    vec3 finalColor = mix(mixColor, uAccentColor, vElevation * 0.5 + pulse + freqHighlight);
    
    // Add glow effect at peaks
    float glow = smoothstep(0.1, 0.3, abs(vElevation)) * uIntensity;
    finalColor += uAccentColor * glow * 0.8;
    
    // Add subtle noise texture
    float noisePattern = noise(vUv * 100.0 + uTime) * 0.05;
    finalColor += noisePattern;
    
    // Add a grid pattern to help visualize the wavelengths
    float gridX = smoothstep(0.95, 1.0, fract(vUv.x * 16.0));
    float gridY = smoothstep(0.95, 1.0, fract(vUv.y * 16.0));
    float grid = max(gridX, gridY) * 0.1;
    finalColor = mix(finalColor, vec3(1.0), grid * freqIntensity);
    
    // Light reflection effect
    vec3 lightDir = normalize(vec3(sin(uTime * 0.5), cos(uTime * 0.5), 1.0));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.5;
    finalColor += diffuse * uAccentColor * 0.3;
    
    gl_FragColor = vec4(finalColor, 1.0);
}`;

export { vertexShaderCode as vertexShader, fragmentShaderCode as fragmentShader };