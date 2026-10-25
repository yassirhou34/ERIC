"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, Text } from "@react-three/drei";

function MotorDisk({ position, color, sense, label }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += sense * dt * 2.8;
  });
  return (
    <group position={position}>
      <mesh ref={ref} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 40]} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.14]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, sense >= 0 ? 0.4 : -0.4]}>
        <torusGeometry args={[0.11, 0.008, 8, 48, Math.PI * 1.4]} />
        <meshBasicMaterial color={sense === 0 ? "#888" : color} />
      </mesh>
      <Text position={[0, -0.22, 0]} fontSize={0.07} color="#333" anchorX="center" anchorY="middle">
        {label}
      </Text>
      <Text position={[0, -0.3, 0]} fontSize={0.05} color={sense === 0 ? "#888" : color} anchorX="center">
        {sense > 0 ? "SENS +" : sense < 0 ? "SENS -" : "ARRET"}
      </Text>
    </group>
  );
}

function CoupledWrist({ incl, rot }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.x = incl * 0.35;
    ref.current.rotation.y = rot * 0.45;
  });
  return (
    <group position={[0, 0.05, 0.55]}>
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[0.08, 0.08, 0.2]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.35} />
      </mesh>
      <group ref={ref}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.06, 0.1]} />
          <meshStandardMaterial
            color="#c8102e"
            metalness={0.45}
            roughness={0.3}
            emissive="#c8102e"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh position={[0.05, 0, 0.08]}>
          <boxGeometry args={[0.02, 0.05, 0.08]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-0.05, 0, 0.08]}>
          <boxGeometry args={[0.02, 0.05, 0.08]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      <Text position={[0, -0.28, 0]} fontSize={0.055} color="#444" anchorX="center">
        Poignet
      </Text>
    </group>
  );
}

function Scene({ stepA, stepB }) {
  const incl = stepA + stepB;
  const rot = stepA - stepB;
  const mode = useMemo(() => {
    if (stepA === 0 && stepB === 0) return "arret";
    if (incl !== 0 && rot === 0) return "meme sens -> inclinaison";
    if (rot !== 0 && incl === 0) return "sens opposes -> rotation";
    return "combine inclinaison + rotation";
  }, [stepA, stepB, incl, rot]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
      <pointLight position={[-2, 2, 1]} intensity={0.4} color="#ff9a5c" />
      <MotorDisk position={[-0.42, 0.08, 0]} color="#2f6fed" sense={stepA} label="Moteur A" />
      <MotorDisk position={[0.42, 0.08, 0]} color="#e67e22" sense={stepB} label="Moteur B" />
      <mesh position={[-0.2, 0.08, 0.22]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.28, 0.015, 0.015]} />
        <meshStandardMaterial color="#999" />
      </mesh>
      <mesh position={[0.2, 0.08, 0.22]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.28, 0.015, 0.015]} />
        <meshStandardMaterial color="#999" />
      </mesh>
      <mesh position={[0, 0.08, 0.35]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial
          color="#111"
          metalness={0.7}
          roughness={0.25}
          emissive="#c8102e"
          emissiveIntensity={0.25}
        />
      </mesh>
      <Text position={[0, 0.2, 0.35]} fontSize={0.06} color="#c8102e" anchorX="center">
        SUM
      </Text>
      <CoupledWrist incl={incl} rot={rot} />
      <Text position={[0, -0.48, 0.2]} fontSize={0.048} color="#666" anchorX="center" maxWidth={2.2}>
        {mode}
      </Text>
      <ContactShadows position={[0, -0.02, 0]} opacity={0.3} scale={3} blur={2.4} frames={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[3.5, 3.5]} />
        <meshStandardMaterial color="#f4f0ea" roughness={1} />
      </mesh>
      <Environment preset="apartment" />
    </>
  );
}

export default function WristCouple3D({ stepA = 0, stepB = 0 }) {
  return (
    <div className="stage-3d lab-stage couple-stage">
      <Canvas
        camera={{ position: [0.9, 0.85, 1.6], fov: 40 }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#f7f4ef"]} />
        <Suspense fallback={null}>
          <Scene stepA={stepA} stepB={stepB} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.7} maxPolarAngle={1.4} />
      </Canvas>
    </div>
  );
}
