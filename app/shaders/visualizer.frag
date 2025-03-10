uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;

varying vec2 vUv;
varying float vElevation;

void main() {
  // Calculate a gradient color based on the elevation and UV coordinates
  vec3 baseColor = uColor;
  
  // Add pulsing effect based on time
  float pulse = (sin(uTime) * 0.5 + 0.5) * uIntensity;
  
  // Mix colors based on elevation
  vec3 mixColor = mix(baseColor, vec3(1.0), vElevation * 3.0 + 0.5);
  
  // Apply pulse effect
  vec3 finalColor = mix(mixColor, vec3(1.0, 1.0, 1.0), pulse * 0.2);
  
  gl_FragColor = vec4(finalColor, 1.0);
}