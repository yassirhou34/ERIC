"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Sparkles } from "@react-three/drei";
import { EriccArmModel } from "./EriccArm3D";
import { ERICC_DEFAULT } from "@/lib/ericc";

function CineCam() {
  const t0 = useRef(0);
  useFrame((state) => {
    t0.current = state.clock.elapsedTime;
    const t = Math.min(1, t0.current / 2.2);
    const e = 1 - Math.pow(1 - t, 3);
    state.camera.position.set(3.0 - e * 1.65, 1.65 - e * 0.85, 3.4 - e * 1.9);
    state.camera.lookAt(0, 0.32, 0);
    state.camera.fov = 46 - e * 8;
    state.camera.updateProjectionMatrix();
  });
  return null;
}

function OrbitEnergy() {
  const a = useRef();
  useFrame((s) => {
    if (a.current) a.current.rotation.y = s.clock.elapsedTime * 0.55;
  });
  return (
    <mesh ref={a} position={[0, 0.32, 0]} rotation={[0.85, 0, 0.2]}>
      <torusGeometry args={[0.78, 0.005, 8, 96]} />
      <meshBasicMaterial color="#e10600" transparent opacity={0.55} />
    </mesh>
  );
}

export default function IntroScene() {
  return (
    <Canvas
      className="intro-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [3.0, 1.65, 3.4], fov: 46 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#050505");
      }}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 5, 12]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 8, 3]} intensity={1.5} />
        <pointLight position={[-2.5, 2, -1.5]} intensity={0.9} color="#ff4d2e" />
        <spotLight position={[0, 5, 2]} angle={0.4} penumbra={0.8} intensity={1.4} />

        <CineCam />
        <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.18}>
          <group position={[0, 0.02, 0]} scale={1.28}>
            <EriccArmModel q={ERICC_DEFAULT} autoDemo breathe showHalo={false} />
          </group>
        </Float>
        <OrbitEnergy />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[3.2, 64]} />
          <meshStandardMaterial color="#101010" metalness={0.55} roughness={0.45} />
        </mesh>
        <Sparkles count={36} scale={3.2} size={2} speed={0.4} color="#e10600" opacity={0.55} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={4} blur={2.4} frames={1} />
        <Environment preset="night" />
      </Suspense>
    </Canvas>
  );
}
