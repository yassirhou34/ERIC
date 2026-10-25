"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  MeshReflectorMaterial,
  OrbitControls,
  PresentationControls,
  Sparkles,
} from "@react-three/drei";
import { EriccArmModel, NaoFigure } from "./EriccArm3D";

/** Cadre la caméra sur le centre du robot (évite la coupe en haut). */
function FrameTarget({ y = 0.32 }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, y]);
  return null;
}

function Lights({ warm = true }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3.5, 2.2, -2]} intensity={0.7} color={warm ? "#ff9a5c" : "#6ec8ff"} />
      <spotLight
        position={[0, 7, 3]}
        angle={0.38}
        penumbra={0.7}
        intensity={1.1}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[2, 0.4, 2]} intensity={0.35} color={warm ? "#c8102e" : "#004d3a"} />
    </>
  );
}

function MirrorFloor({ tint = "#f5f0e8" }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <planeGeometry args={[6, 6]} />
      <MeshReflectorMaterial
        blur={[280, 80]}
        resolution={512}
        mixBlur={0.85}
        mixStrength={0.55}
        roughness={0.85}
        depthScale={0.6}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        color={tint}
        metalness={0.15}
        mirror={0.35}
      />
    </mesh>
  );
}

export function LandingEriccStage() {
  return (
    <div className="stage-3d landing-stage">
      <Canvas shadows camera={{ position: [1.4, 0.82, 1.55], fov: 38 }} dpr={[1, 2]}>
        <color attach="background" args={["#faf7f2"]} />
        <fog attach="fog" args={["#faf7f2", 4.5, 11]} />
        <Suspense fallback={null}>
          <Lights />
          <FrameTarget y={0.32} />
          <PresentationControls
            global
            snap
            speed={1.1}
            zoom={1}
            polar={[-0.08, 0.28]}
            azimuth={[-0.45, 0.45]}
          >
            <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.08}>
              <group position={[0, -0.04, 0]} scale={1.05}>
                <EriccArmModel q={{}} autoDemo breathe />
              </group>
            </Float>
          </PresentationControls>
          <MirrorFloor />
          <Sparkles count={28} scale={2.4} size={1.5} speed={0.28} color="#c8102e" opacity={0.4} />
          <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={2.8} blur={2.6} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      <div className="stage-caption">
        <span className="pulse-dot" />
        Bras live · glisse pour pivoter
      </div>
    </div>
  );
}

export function LandingNaoStage() {
  return (
    <div className="stage-3d landing-stage nao">
      <Canvas shadows camera={{ position: [1.45, 0.95, 1.75], fov: 38 }} dpr={[1, 2]}>
        <color attach="background" args={["#f2f7f4"]} />
        <fog attach="fog" args={["#f2f7f4", 5, 12]} />
        <Suspense fallback={null}>
          <Lights warm={false} />
          <FrameTarget y={0.4} />
          <PresentationControls
            global
            snap
            speed={1.1}
            zoom={1}
            polar={[-0.08, 0.28]}
            azimuth={[-0.45, 0.45]}
          >
            <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.1}>
              <group position={[0, 0.02, 0]} scale={0.95}>
                <NaoFigure q={{}} autoDemo spin />
              </group>
            </Float>
          </PresentationControls>
          <MirrorFloor tint="#eef5f1" />
          <Sparkles count={28} scale={2.6} size={1.5} speed={0.26} color="#004d3a" opacity={0.4} />
          <ContactShadows position={[0, 0.002, 0]} opacity={0.38} scale={2.8} blur={2.5} />
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>
      <div className="stage-caption">
        <span className="pulse-dot green" />
        NAO animé · présence 3D
      </div>
    </div>
  );
}

export function EriccLabStage({ q }) {
  return (
    <div className="stage-3d lab-stage">
      <Canvas
        shadows
        camera={{ position: [1.45, 0.55, 1.55], fov: 38 }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => gl.setClearColor("#fffcf8")}
      >
        <color attach="background" args={["#fffcf8"]} />
        <Suspense fallback={null}>
          <Lights />
          <group position={[0, 0.02, 0]} scale={0.88}>
            <EriccArmModel q={q} showHalo={false} />
          </group>
          {/* Grille seule (pas de plan opaque) → le bras reste visible même baissé */}
          <gridHelper args={[3.5, 28, "#cfc4b6", "#ebe4db"]} position={[0, 0, 0]} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.25} scale={3} blur={2.8} frames={1} />
          <Environment preset="apartment" />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          target={[0, 0.22, 0]}
          /* évite la vue trop plongeante qui “efface” le bras baissé */
          minPolarAngle={0.95}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </div>
  );
}

export function EriccArchStage({ q, highlight }) {
  return (
    <div className="stage-3d lab-stage arch-stage">
      <Canvas
        shadows
        camera={{ position: [1.35, 0.7, 1.45], fov: 38 }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => gl.setClearColor("#f7f4ef")}
      >
        <color attach="background" args={["#f7f4ef"]} />
        <Suspense fallback={null}>
          <Lights />
          <group position={[0, 0.02, 0]} scale={0.9}>
            <EriccArmModel q={q} showHalo={false} highlight={highlight} />
          </group>
          <gridHelper args={[3.2, 24, "#d2c6b6", "#ebe4db"]} position={[0, 0, 0]} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.28} scale={2.8} blur={2.6} frames={1} />
          <Environment preset="apartment" />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          target={[0, 0.26, 0]}
          minPolarAngle={0.9}
          maxPolarAngle={1.35}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

/** Même scène que l’archi, cadrage un peu plus large pour repérer O1/O2/O3. */
export function EriccSensorsStage({ q, highlight }) {
  return (
    <div className="stage-3d lab-stage sensors-stage">
      <Canvas
        shadows
        camera={{ position: [1.4, 0.68, 1.5], fov: 38 }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => gl.setClearColor("#f5f8f7")}
      >
        <color attach="background" args={["#f5f8f7"]} />
        <Suspense fallback={null}>
          <Lights />
          <group position={[0, 0.02, 0]} scale={0.9}>
            <EriccArmModel q={q} showHalo={false} highlight={highlight} />
          </group>
          <gridHelper args={[3.2, 24, "#c5d4ce", "#e6eee9"]} position={[0, 0, 0]} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.26} scale={2.8} blur={2.6} frames={1} />
          <Environment preset="apartment" />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          target={[0, 0.26, 0]}
          minPolarAngle={0.9}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </div>
  );
}

export function NaoLabStage({ q }) {
  return (
    <div className="stage-3d lab-stage">
      <Canvas shadows camera={{ position: [1.55, 1.05, 1.95], fov: 40 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#f7faf8"]} />
        <Suspense fallback={null}>
          <Lights warm={false} />
          <group scale={0.85} position={[0, 0.05, 0]}>
            <NaoFigure q={q} />
          </group>
          <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={3} blur={2.4} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={1.3} maxDistance={4} />
      </Canvas>
    </div>
  );
}
