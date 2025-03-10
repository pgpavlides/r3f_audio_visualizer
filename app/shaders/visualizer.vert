precision mediump float;

varying vec2 vUv;
varying float vElevation;
varying vec3 vNormal;

uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uIntensity;
uniform float uPeakFrequency;

void main() {
    vUv = uv;
    vNormal = normal;
    
    // Create wave effect with multiple frequencies
    vec3 pos = position;
    
    // Base wave pattern
    float elevation = sin(pos.x * uFrequency + uTime) * uAmplitude;
    elevation += sin(pos.y * uFrequency * 0.8 + uTime) * uAmplitude;
    
    // Add higher frequency details based on audio peak frequency
    float detailFreq = 5.0 + uPeakFrequency * 10.0;
    float detail = sin(pos.x * detailFreq + uTime * 2.0) * sin(pos.y * detailFreq + uTime * 2.0) * 0.1;
    elevation += detail * uIntensity;
    
    // Circular wave from center
    float dist = distance(uv, vec2(0.5, 0.5));
    float circularWave = sin(dist * 10.0 - uTime * 2.0) * 0.05 * uIntensity;
    elevation += circularWave;
    
    // Apply audio intensity scaling
    elevation *= uIntensity;
    
    pos.z += elevation;
    vElevation = elevation;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}