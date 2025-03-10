uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  
  // Create a wave effect based on time
  vec3 pos = position;
  float elevation = sin(pos.x * 2.0 + uTime) * cos(pos.z * 2.0 + uTime) * uIntensity * 0.2;
  pos.y += elevation;
  vElevation = elevation;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}