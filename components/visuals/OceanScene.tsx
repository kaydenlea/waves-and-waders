// "use client";

// import React, { useRef } from "react";
// import * as THREE from "three";
// import { useFrame, Canvas } from "@react-three/fiber";

// const OceanOrb = () => {
//   const mat = useRef<THREE.ShaderMaterial | null>(null);
//   const mesh = useRef<THREE.Mesh | null>(null);

//   useFrame(({ clock }) => {
//     if (mat.current) {
//       mat.current.uniforms.uTime.value = clock.getElapsedTime();
//     }
//     if (mesh.current) {
//       mesh.current.rotation.y += 0.003;
//     }
//   });

//   const uniforms = React.useMemo(
//     () => ({
//       uTime: { value: 0 },
//       uColor1: { value: new THREE.Color("#67e8f9") },
//       uColor2: { value: new THREE.Color("#3b82f6") },
//     }),
//     []
//   );

//   const vertexShader = `
//     uniform float uTime;
//     varying vec3 vNormalW;
//     varying vec3 vPosW;
//     void main() {
//       vec3 pos = position;
//       float f1 = sin(pos.x * 2.5 + uTime * 1.2);
//       float f2 = sin(pos.y * 3.2 + uTime * 1.1);
//       float f3 = sin(pos.z * 2.8 + uTime * 1.4);
//       float disp = (f1 + f2 + f3) * 0.08;
//       pos += normal * disp;
//       vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
//       vNormalW = normalize(normalMatrix * normal);
//       vPosW = (modelMatrix * vec4(pos, 1.0)).xyz;
//       gl_Position = projectionMatrix * mvPosition;
//     }
//   `;

//   const fragmentShader = `
//     precision highp float;
//     uniform vec3 uColor1;
//     uniform vec3 uColor2;
//     varying vec3 vNormalW;
//     varying vec3 vPosW;
//     void main() {
//       vec3 viewDir = normalize(cameraPosition - vPosW);
//       float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormalW)), 0.0), 2.0);
//       vec3 base = mix(uColor2, uColor1, fresnel);
//       float h = clamp((vPosW.y + 1.2) / 2.4, 0.0, 1.0);
//       base = mix(base * 0.9, base * 1.1, h);
//       gl_FragColor = vec4(base, 0.95);
//     }
//   `;

//   return (
//     <mesh ref={mesh} castShadow receiveShadow>
//       <icosahedronGeometry args={[1.2, 64]} />
//       <shaderMaterial
//         transparent
//         depthWrite={false}
//         ref={mat}
//         uniforms={uniforms}
//         vertexShader={vertexShader}
//         fragmentShader={fragmentShader}
//       />
//     </mesh>
//   );
// };

// const OceanScene = () => {
//   return (
//     <Canvas dpr={[1, 2]} shadows camera={{ position: [0, 0, 3.6], fov: 50 }}>
//       {/* <color attach="background" args={["#0f172a"]} /> */}
//       <ambientLight intensity={0.6} />
//       <directionalLight position={[3, 3, 5]} intensity={1.0} castShadow />
//       <directionalLight position={[-4, -2, -3]} intensity={0.3} />
//       <OceanOrb />
//     </Canvas>
//   );
// };

// export default OceanScene;

"use client";
/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useRef, useMemo, useLayoutEffect } from "react";
import { Color } from "three";

const hexToNormalizedRGB = (hex: string) => {
  hex = hex.replace("#", "");
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
};

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

const SilkPlane = forwardRef(function SilkPlane({ uniforms }, ref) {
  const { viewport } = useThree();

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scale.set(viewport.width, viewport.height, 1);
    }
  }, [ref, viewport]);

  useFrame((_, delta) => {
    ref.current.material.uniforms.uTime.value += 0.1 * delta;
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
});
SilkPlane.displayName = "SilkPlane";

const WaveBg = ({
  speed = 5,
  scale = 1.2,
  color = "#5da3ffff",
  noiseIntensity = 0,
  rotation = 3,
}) => {
  const meshRef = useRef();

  const uniforms = useMemo(
    () => ({
      uSpeed: { value: speed },
      uScale: { value: scale },
      uNoiseIntensity: { value: noiseIntensity },
      uColor: { value: new Color(...hexToNormalizedRGB(color)) },
      uRotation: { value: rotation },
      uTime: { value: 0 },
    }),
    [speed, scale, noiseIntensity, color, rotation]
  );

  return (
    <div className="absolute w-full h-full">
      <Canvas dpr={[1, 2]} frameloop="always" className=" min-w-200">
        <SilkPlane ref={meshRef} uniforms={uniforms} />
      </Canvas>
    </div>
  );
};

export default WaveBg;
