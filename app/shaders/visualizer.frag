precision mediump float;

varying vec2 vUv;
varying float vElevation;
varying vec3 vNormal;

uniform float uTime;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform float uPeakFrequency;

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Dynamic base color that shifts based on time and intensity
    vec3 dynamicBase = mix(uBaseColor, uBaseColor * 1.2, sin(uTime * 0.2) * 0.5 + 0.5);
    
    // Color gradient based on UV and elevation
    vec3 mixColor = mix(dynamicBase, uAccentColor, vUv.y + vElevation * 0.5);
    
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
    
    // Light reflection effect
    vec3 lightDir = normalize(vec3(sin(uTime * 0.5), cos(uTime * 0.5), 1.0));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.5;
    finalColor += diffuse * uAccentColor * 0.3;
    
    gl_FragColor = vec4(finalColor, 1.0);
}