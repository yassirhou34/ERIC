"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ericcMGD, ERICC_LENGTHS } from "@/lib/ericc";

const deg = (d) => (d * Math.PI) / 180;

function metal(color, metalness = 0.85, roughness = 0.22, emissive = "#000000", emissiveIntensity = 0) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={1.2}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

function Link({ from, to, color = "#c8102e", radius = 0.012, taper = 1, active = false, dim = false }) {
  const mesh = useMemo(() => {
    const a = new THREE.Vector3(from.x, from.z, from.y);
    const b = new THREE.Vector3(to.x, to.z, to.y);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { mid, len, quat };
  }, [from, to]);

  const c = active ? "#ff3b4a" : dim ? "#9a9590" : color;
  const ei = active ? 0.65 : 0;

  return (
    <mesh position={mesh.mid} quaternion={mesh.quat} castShadow receiveShadow>
      <cylinderGeometry args={[radius * taper * (active ? 1.08 : 1), radius * (active ? 1.08 : 1), Math.max(mesh.len, 0.001), 28]} />
      {metal(c, 0.78, 0.24, active ? "#ff3b4a" : "#000", ei)}
    </mesh>
  );
}

function Joint({ p, color = "#b08d57", r = 0.022, active = false, dim = false }) {
  const c = active ? "#ffb020" : dim ? "#8a8680" : color;
  return (
    <group position={[p.x, p.z, p.y]}>
      <mesh castShadow>
        <sphereGeometry args={[active ? r * 1.15 : r, 32, 32]} />
        <meshStandardMaterial
          color={c}
          metalness={0.92}
          roughness={0.15}
          emissive={active ? "#ffb020" : c}
          emissiveIntensity={active ? 0.7 : 0.18}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 1.35, r * 0.18, 12, 48]} />
        {metal(active ? "#ff3b4a" : "#1a1a1a", 0.9, 0.25, active ? "#ff3b4a" : "#000", active ? 0.4 : 0)}
      </mesh>
    </group>
  );
}

function Pedestal({ active = false, dim = false }) {
  const c1 = active ? "#ff3b4a" : dim ? "#555" : "#111111";
  const c2 = active ? "#ff6a3d" : dim ? "#884444" : "#c8102e";
  return (
    <group>
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.016, 64]} />
        {metal(c1, 0.7, 0.35, active ? "#ff3b4a" : "#000", active ? 0.45 : 0)}
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.012, 64]} />
        {metal(c2, 0.55, 0.35, active ? "#ff3b4a" : "#000", active ? 0.5 : 0)}
      </mesh>
      <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.195, 64]} />
        <meshBasicMaterial color={active ? "#ff3b4a" : "#c8102e"} transparent opacity={active ? 0.7 : 0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function idleEriccQ(t) {
  /* poses compactes — le bras reste dans le cadre */
  return {
    theta1: Math.sin(t * 0.45) * 22,
    theta2: 22 + Math.sin(t * 0.55) * 10,
    theta3: 32 + Math.cos(t * 0.5) * 10,
    theta4: Math.sin(t * 0.7) * 12,
    theta5: 40,
    grip: 18 + Math.abs(Math.sin(t * 0.9)) * 14,
  };
}

/** Bras ERICC en mètres (échelle /1000). */
export function EriccArmModel({
  q,
  accent = "#c8102e",
  breathe = false,
  autoDemo = false,
  showHalo = true,
  highlight = null,
}) {
  const isHi = (id) => highlight === id;
  const dim = Boolean(highlight);
  const group = useRef();
  const trail = useRef();
  const frame = useRef(0);
  const [demoQ, setDemoQ] = useState(() => idleEriccQ(0));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (autoDemo) {
      frame.current += 1;
      if (frame.current % 2 === 0) setDemoQ(idleEriccQ(t));
    }
    if (group.current && breathe) {
      group.current.rotation.y = Math.sin(t * 0.3) * 0.1;
      group.current.position.y = Math.sin(t * 0.7) * 0.006;
    }
    if (trail.current) {
      trail.current.rotation.z = t * 1.4;
      trail.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    }
  });

  const qNow = autoDemo ? demoQ : q;
  const mgd = useMemo(() => ericcMGD(qNow), [qNow]);
  const s = 0.001;
  const pts = useMemo(() => {
    const P = mgd.points;
    return {
      O: { x: P.O.x * s, y: P.O.y * s, z: P.O.z * s },
      S: { x: P.S.x * s, y: P.S.y * s, z: P.S.z * s },
      E: { x: P.E.x * s, y: P.E.y * s, z: P.E.z * s },
      W: { x: P.W.x * s, y: P.W.y * s, z: P.W.z * s },
      G: { x: P.G.x * s, y: P.G.y * s, z: P.G.z * s },
    };
  }, [mgd]);

  const grip = (qNow.grip ?? 25) / 1000;
  const open = Math.min(0.045, Math.max(0.008, grip * 0.8));

  return (
    <group ref={group}>
      <Pedestal active={isHi("socle")} dim={dim && !isHi("socle")} />
      <mesh position={[0, ERICC_LENGTHS.L1 * s * 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.036, ERICC_LENGTHS.L1 * s, 28]} />
        {metal(
          isHi("chaise") ? "#ff3b4a" : dim ? "#666" : "#1c1c1c",
          0.75,
          0.32,
          isHi("chaise") ? "#ff3b4a" : "#000",
          isHi("chaise") ? 0.55 : 0
        )}
      </mesh>
      <mesh position={[0, ERICC_LENGTHS.L1 * s * 0.55, 0]}>
        <torusGeometry args={[0.042, 0.006, 12, 48]} />
        {metal(isHi("chaise") ? "#ffb020" : "#9a7b4f", 0.9, 0.2, isHi("chaise") ? "#ffb020" : "#000", isHi("chaise") ? 0.5 : 0)}
      </mesh>

      <Link from={pts.O} to={pts.S} color="#2a2a2a" radius={0.017} taper={0.85} active={isHi("chaise")} dim={dim && !isHi("chaise")} />
      <Joint p={pts.S} color="#c9a227" r={0.03} active={isHi("epaule")} dim={dim && !isHi("epaule")} />
      <Link from={pts.S} to={pts.E} color={accent} radius={0.02} taper={0.9} active={isHi("bras")} dim={dim && !isHi("bras")} />
      <Joint p={pts.E} color="#c9a227" r={0.026} active={isHi("coude")} dim={dim && !isHi("coude")} />
      <Link from={pts.E} to={pts.W} color={accent} radius={0.016} taper={0.88} active={isHi("avantbras")} dim={dim && !isHi("avantbras")} />
      <Joint p={pts.W} color="#111" r={0.022} active={isHi("poignet")} dim={dim && !isHi("poignet")} />
      <Link from={pts.W} to={pts.G} color="#3a3a3a" radius={0.011} active={isHi("poignet")} dim={dim && !isHi("poignet")} />
      <Joint p={pts.G} color={accent} r={0.017} active={isHi("pince")} dim={dim && !isHi("pince")} />

      <mesh position={[pts.G.x + open, pts.G.z, pts.G.y]} castShadow>
        <boxGeometry args={[0.007, 0.048, 0.014]} />
        {metal(isHi("pince") ? "#ff3b4a" : "#0d0d0d", 0.7, 0.25, isHi("pince") ? "#ff3b4a" : "#000", isHi("pince") ? 0.6 : 0)}
      </mesh>
      <mesh position={[pts.G.x - open, pts.G.z, pts.G.y]} castShadow>
        <boxGeometry args={[0.007, 0.048, 0.014]} />
        {metal(isHi("pince") ? "#ff3b4a" : "#0d0d0d", 0.7, 0.25, isHi("pince") ? "#ff3b4a" : "#000", isHi("pince") ? 0.6 : 0)}
      </mesh>

      {showHalo && (
        <>
          <mesh position={[pts.G.x, pts.G.z, pts.G.y]}>
            <sphereGeometry args={[0.048, 20, 20]} />
            <meshBasicMaterial color={accent} transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <mesh ref={trail} position={[pts.G.x, pts.G.z, pts.G.y]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.0035, 10, 64]} />
            <meshBasicMaterial color={accent} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function NaoFigure({ q, accent = "#004d3a", spin = false, autoDemo = false }) {
  const group = useRef();
  const pulse = useRef();
  const frame = useRef(0);
  const [demoQ, setDemoQ] = useState(q);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (autoDemo) {
      frame.current += 1;
      if (frame.current % 2 === 0) {
        setDemoQ({
          RShoulderPitch: 70 + Math.sin(t * 0.8) * 25,
          RShoulderRoll: -15 + Math.sin(t * 0.6) * 12,
          RElbowRoll: 45 + Math.cos(t * 0.9) * 25,
          RElbowYaw: Math.sin(t * 0.5) * 20,
          RWristYaw: 0,
        });
      }
    }
    if (group.current && spin) group.current.rotation.y = t * 0.28;
    if (pulse.current) {
      pulse.current.material.emissiveIntensity = 0.45 + Math.sin(t * 2.4) * 0.35;
    }
  });

  const qNow = autoDemo ? demoQ : q;
  const sp = deg(qNow?.RShoulderPitch ?? 80);
  const sr = deg(qNow?.RShoulderRoll ?? -18);
  const er = deg(qNow?.RElbowRoll ?? 58);
  const ey = deg(qNow?.RElbowYaw ?? 0);

  return (
    <group ref={group} position={[0, -0.52, 0]}>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.02, 64]} />
        {metal("#0f2a22", 0.6, 0.4)}
      </mesh>
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.27, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.095, 40, 40]} />
        <meshStandardMaterial color="#f5f5f5" metalness={0.25} roughness={0.35} />
      </mesh>
      <mesh position={[-0.032, 1.175, 0.078]} ref={pulse}>
        <sphereGeometry args={[0.014, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0.032, 1.175, 0.078]}>
        <sphereGeometry args={[0.014, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 1.14, 0.09]}>
        <boxGeometry args={[0.08, 0.012, 0.01]} />
        {metal("#111", 0.8, 0.3)}
      </mesh>

      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.115, 0.3, 10, 20]} />
        <meshStandardMaterial color="#efefef" metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.92, 0.1]}>
        <circleGeometry args={[0.035, 32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} metalness={0.5} roughness={0.3} />
      </mesh>

      <mesh position={[-0.065, 0.36, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.4, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.25} roughness={0.4} />
      </mesh>
      <mesh position={[0.065, 0.36, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.4, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.25} roughness={0.4} />
      </mesh>
      <mesh position={[-0.065, 0.08, 0.02]}>
        <boxGeometry args={[0.07, 0.035, 0.12]} />
        {metal("#222", 0.6, 0.4)}
      </mesh>
      <mesh position={[0.065, 0.08, 0.02]}>
        <boxGeometry args={[0.07, 0.035, 0.12]} />
        {metal("#222", 0.6, 0.4)}
      </mesh>

      <group position={[0.145, 0.99, 0]} rotation={[0, 0, sr]}>
        <group rotation={[sp, 0, 0]}>
          <mesh position={[0, -0.125, 0]} castShadow>
            <capsuleGeometry args={[0.034, 0.17, 8, 16]} />
            <meshStandardMaterial color={accent} metalness={0.55} roughness={0.28} />
          </mesh>
          <group position={[0, -0.25, 0]} rotation={[er, ey * 0.3, 0]}>
            <mesh position={[0, -0.105, 0]} castShadow>
              <capsuleGeometry args={[0.03, 0.15, 8, 16]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>

      <mesh position={[-0.185, 0.78, 0.04]} rotation={[0.45, 0, 0.35]} castShadow>
        <capsuleGeometry args={[0.034, 0.24, 8, 16]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.35} roughness={0.38} />
      </mesh>
    </group>
  );
}
