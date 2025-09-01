"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame, Canvas } from "@react-three/fiber";

const OceanOrb = () => {
  const mat = useRef<THREE.ShaderMaterial | null>(null);
  const mesh = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = clock.getElapsedTime();
    }
    if (mesh.current) {
      mesh.current.rotation.y += 0.003;
    }
  });

  const uniforms = React.useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color("#67e8f9") },
      uColor2: { value: new THREE.Color("#3b82f6") },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      vec3 pos = position;
      float f1 = sin(pos.x * 2.5 + uTime * 1.2);
      float f2 = sin(pos.y * 3.2 + uTime * 1.1);
      float f3 = sin(pos.z * 2.8 + uTime * 1.4);
      float disp = (f1 + f2 + f3) * 0.08;
      pos += normal * disp;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vNormalW = normalize(normalMatrix * normal);
      vPosW = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosW);
      float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormalW)), 0.0), 2.0);
      vec3 base = mix(uColor2, uColor1, fresnel);
      float h = clamp((vPosW.y + 1.2) / 2.4, 0.0, 1.0);
      base = mix(base * 0.9, base * 1.1, h);
      gl_FragColor = vec4(base, 0.95);
    }
  `;

  return (
    <mesh ref={mesh} castShadow receiveShadow>
      <icosahedronGeometry args={[1.2, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
};

const OceanScene = () => {
  return (
    <Canvas dpr={[1, 2]} shadows camera={{ position: [0, 0, 3.6], fov: 50 }}>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 5]} intensity={1.0} castShadow />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} />
      <OceanOrb />
    </Canvas>
  );
};

export default OceanScene;
