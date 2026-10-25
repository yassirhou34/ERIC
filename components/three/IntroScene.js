"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  MeshReflectorMaterial,
  Sparkles,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { EriccArmModel } from "./EriccArm3D";

function CineCam() {
  const t0 = useRef(0);
  useFrame((state) => {
    t0.current = state.clock.elapsedTime;
    const t = Math.min(1, t0.current / 2.4);
    const e = 1 - Math.pow(1 - t, 3);
    // fly-in choc : loin → proche
    state.camera.position.set(
      3.2 - e * 1.85,
      1.8 - e * 0.95,
      3.6 - e * 2.1
    );
    state.camera.lookAt(0, 0.35 + Math.sin(t0.current * 0.8) * 0.02, 0);
    state.camera.fov = 48 - e * 10;
    state.camera.updateProjectionMatrix();
  });
  return null;
}

function OrbitEnergy() {
  const a = useRef();
  const b = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (a.current) a.current.rotation.set(0.9, t * 0.7, t * 0.25);
    if (b.current) b.current.rotation.set(1.2, -t * 0.45, 0.4);
  });
  return (
    <group position={[0, 0.35, 0]}>
      <mesh ref={a}>
        <torusGeometry args={[0.72, 0.006, 12, 128]} />
        <meshBasicMaterial color="#e10600" transparent opacity={0.7} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[0.9, 0.004, 12, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <MeshReflectorMaterial
        blur={[300, 80]}
        resolution={512}
        mixBlur={0.9}
        mixStrength={0.85}
        roughness={0.65}
        depthScale={0.7}
        color="#121212"
        metalness={0.4}
        mirror={0.55}
      />
    </mesh>
  );
}

export default function IntroScene() {
  return (
    <Canvas
      className="intro-canvas"
      shadows
      dpr={[1, 2]}
      camera={{ position: [3.2, 1.8, 3.6], fov: 48 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 4, 14]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 8, 3]} intensity={1.8} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={1.2} color="#ff4d2e" />
        <spotLight position={[0, 6, 2]} angle={0.35} penumbra={0.7} intensity={2} color="#fff" />
        <pointLight position={[2, 0.5, 2]} intensity={0.8} color="#e10600" />

        <CineCam />
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.25}>
          <group position={[0, 0.02, 0]} scale={1.35}>
            <EriccArmModel q={{}} autoDemo breathe />
          </group>
        </Float>
        <OrbitEnergy />
        <Floor />
        <Sparkles count={90} scale={4} size={2.5} speed={0.55} color="#e10600" opacity={0.75} />
        <Sparkles count={40} scale={3.5} size={1.2} speed={0.3} color="#ffffff" opacity={0.35} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.65} scale={5} blur={2.2} />
        <Environment preset="night" />
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={1.15} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette offset={0.2} darkness={0.75} />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new Vector2(0.0012, 0.0014)}
            radialModulation
            modulationOffset={0.4}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
