"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JointPanel from "./JointPanel";
import { ERICC_DEFAULT, ERICC_LIMITS, ericcMGD } from "@/lib/ericc";

const SAMPLES_PER_SEG = 90;

const ESSAI_A = [
  { theta1: -85, theta2: -15, theta3: -20, theta4: 0, theta5: -5, grip: 25 },
  { theta1: 85, theta2: 65, theta3: 55, theta4: 0, theta5: 75, grip: 25 },
];

const ESSAI_B = [
  { theta1: -85, theta2: -15, theta3: -20, theta4: 0, theta5: -5, grip: 25 },
  { theta1: -40, theta2: 10, theta3: 0, theta4: 0, theta5: 15, grip: 25 },
  { theta1: 0, theta2: 30, theta3: 20, theta4: 0, theta5: 35, grip: 25 },
  { theta1: 40, theta2: 50, theta3: 40, theta4: 0, theta5: 55, grip: 25 },
  { theta1: 85, theta2: 65, theta3: 55, theta4: 0, theta5: 75, grip: 25 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpQ(a, b, t) {
  return {
    theta1: lerp(a.theta1, b.theta1, t),
    theta2: lerp(a.theta2, b.theta2, t),
    theta3: lerp(a.theta3, b.theta3, t),
    theta4: lerp(a.theta4, b.theta4, t),
    theta5: lerp(a.theta5, b.theta5, t),
    grip: lerp(a.grip ?? 25, b.grip ?? 25, t),
  };
}

function pointG(q) {
  return ericcMGD(q).G;
}

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Distance point → segment AB (3D). */
function distToSegment(p, a, b) {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
  const ab2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z || 1e-12;
  let t = (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / ab2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * ab.x, y: a.y + t * ab.y, z: a.z + t * ab.z };
  return dist3(p, proj);
}

function buildAnalysis(points) {
  if (points.length < 2) {
    return {
      samples: [],
      ideal: [],
      direct: 0,
      pathLen: 0,
      maxDev: 0,
      ratio: 0,
      segDevs: [],
      nSeg: 0,
      nSamples: 0,
    };
  }
  const samples = [];
  const ideal = [];
  const segDevs = [];
  let pathLen = 0;
  let direct = 0;
  let maxDev = 0;

  for (let s = 0; s < points.length - 1; s++) {
    const A = points[s];
    const B = points[s + 1];
    const gA = pointG(A);
    const gB = pointG(B);
    direct += dist3(gA, gB);
    let segMax = 0;
    let prev = null;
    for (let i = 0; i <= SAMPLES_PER_SEG; i++) {
      const t = i / SAMPLES_PER_SEG;
      const q = lerpQ(A, B, t);
      const g = pointG(q);
      samples.push(g);
      ideal.push({
        x: lerp(gA.x, gB.x, t),
        y: lerp(gA.y, gB.y, t),
        z: lerp(gA.z, gB.z, t),
      });
      const d = distToSegment(g, gA, gB);
      segMax = Math.max(segMax, d);
      maxDev = Math.max(maxDev, d);
      if (prev) pathLen += dist3(prev, g);
      prev = g;
    }
    segDevs.push(segMax);
  }

  return {
    samples,
    ideal,
    direct,
    pathLen,
    maxDev,
    ratio: direct > 1e-9 ? pathLen / direct : 0,
    segDevs,
    nSeg: points.length - 1,
    nSamples: samples.length,
  };
}

function TrajPlot({ title, plane, samples, ideal, points }) {
  const W = 720;
  const H = 340;
  const pad = 44;
  const get = (p) => (plane === "xy" ? { u: p.x, v: p.y } : { u: p.x, v: p.z });

  const all = [...samples, ...ideal, ...points.map(pointG)];
  if (!all.length) {
    return (
      <div className="viz-card">
        <header>
          <span>{title}</span>
          <span>{plane.toUpperCase()}</span>
        </header>
        <div className="learn-empty">Enregistre au moins deux points (Val) ou lance Essai A.</div>
      </div>
    );
  }
  const us = all.map((p) => get(p).u);
  const vs = all.map((p) => get(p).v);
  let minU = Math.min(...us);
  let maxU = Math.max(...us);
  let minV = Math.min(...vs);
  let maxV = Math.max(...vs);
  const spanU = Math.max(1, maxU - minU);
  const spanV = Math.max(1, maxV - minV);
  const marginU = spanU * 0.08;
  const marginV = spanV * 0.08;
  minU -= marginU;
  maxU += marginU;
  minV -= marginV;
  maxV += marginV;
  const mapU = (u) => pad + ((u - minU) / (maxU - minU)) * (W - 2 * pad);
  const mapV = (v) => H - pad - ((v - minV) / (maxV - minV)) * (H - 2 * pad);

  const path = (arr) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"} ${mapU(get(p).u).toFixed(1)} ${mapV(get(p).v).toFixed(1)}`).join(" ");

  return (
    <div className="viz-card learn-plot-card">
      <header>
        <span>{title}</span>
        <span>{plane.toUpperCase()}</span>
      </header>
      <svg className="pp-svg learn-plot-svg" viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#fafcfb" />
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#ddd" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#ddd" />
        <path d={path(samples)} fill="none" stroke="#0f766e" strokeWidth="2.6" strokeLinejoin="round" />
        <path d={path(ideal)} fill="none" stroke="#e67e22" strokeWidth="2" strokeDasharray="8 5" />
        {points.map((q, i) => {
          const g = pointG(q);
          return (
            <g key={i}>
              <circle cx={mapU(get(g).u)} cy={mapV(get(g).v)} r="7" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
              <text x={mapU(get(g).u) + 10} y={mapV(get(g).v) - 8} fontSize="13" fill="#7c3aed" fontWeight="700">
                P{i + 1}
              </text>
            </g>
          );
        })}
        <text x={pad + 4} y={22} fontSize="12" fill="#666">
          {plane === "xy" ? "Y ↑" : "Z ↑"}
        </text>
        <text x={W - 52} y={H - 14} fontSize="12" fill="#666">
          X →
        </text>
      </svg>
    </div>
  );
}

export default function LearnTrajSim({ q, setQ, onPointsChange }) {
  const [points, setPoints] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(false);
  const raf = useRef(null);
  const anim = useRef({ seg: 0, t: 0 });

  const analysis = useMemo(() => buildAnalysis(points), [points]);

  const pushPoints = useCallback(
    (pts) => {
      setPoints(pts);
      setCursor(0);
      onPointsChange?.(pts);
    },
    [onPointsChange]
  );

  const setJoint = (key, val) => setQ((prev) => ({ ...prev, [key]: val }));

  const initI = () => {
    playRef.current = false;
    setPlaying(false);
    setQ({ ...ERICC_DEFAULT });
    setCursor(0);
  };

  const valPoint = () => {
    const next = [...points, { ...q }];
    pushPoints(next);
    setCursor(next.length - 1);
  };

  const beginP = () => {
    playRef.current = false;
    setPlaying(false);
    setCursor(0);
    if (points[0]) setQ({ ...points[0] });
  };

  const clearPts = () => {
    playRef.current = false;
    setPlaying(false);
    pushPoints([]);
  };

  const stopPlay = () => {
    playRef.current = false;
    setPlaying(false);
  };

  const playL = () => {
    if (points.length < 2) return;
    playRef.current = true;
    setPlaying(true);
    anim.current = { seg: 0, t: 0 };
    setQ({ ...points[0] });
  };

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const loop = (now) => {
      if (!playRef.current) return;
      const dt = (now - last) / 1000;
      last = now;
      const a = anim.current;
      a.t += dt * 0.35;
      if (a.t >= 1) {
        a.t = 0;
        a.seg += 1;
        if (a.seg >= points.length - 1) {
          setQ({ ...points[points.length - 1] });
          setCursor(points.length - 1);
          playRef.current = false;
          setPlaying(false);
          return;
        }
      }
      const A = points[a.seg];
      const B = points[a.seg + 1];
      setQ(lerpQ(A, B, Math.min(1, a.t)));
      setCursor(a.seg);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, points, setQ]);

  const loadEssaiA = () => {
    stopPlay();
    pushPoints(ESSAI_A.map((p) => ({ ...p })));
    setQ({ ...ESSAI_A[0] });
  };

  const loadEssaiB = () => {
    stopPlay();
    pushPoints(ESSAI_B.map((p) => ({ ...p })));
    setQ({ ...ESSAI_B[0] });
  };

  const exportJson = () => {
    const payload = {
      meta: {
        module: "Apprentissage trajectoire — interpolation articulaire",
        date: new Date().toISOString(),
        note: "L interpole les angles ; pas de MGI ni collisions continues",
      },
      points: points.map((p, i) => {
        const g = pointG(p);
        return {
          id: `P${i + 1}`,
          q: [p.theta1, p.theta2, p.theta3, p.theta4, p.theta5],
          G: { x: +g.x.toFixed(1), y: +g.y.toFixed(1), z: +g.z.toFixed(1) },
        };
      }),
      measures: {
        memorized: points.length,
        segments: analysis.nSeg,
        directMm: +analysis.direct.toFixed(2),
        pathMm: +analysis.pathLen.toFixed(2),
        maxDevMm: +analysis.maxDev.toFixed(2),
        ratio: +analysis.ratio.toFixed(4),
        segDevs: analysis.segDevs.map((v) => +v.toFixed(2)),
        samples: analysis.nSamples,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ericc-apprentissage.json";
    a.click();
  };

  useEffect(() => {
    loadEssaiA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="learn-lab">
      <div className="panel pp-main">
        <div className="arch-ornament" aria-hidden />
        <p className="arch-kicker">09 — Apprentissage et programmation</p>
        <h2>Trajectoire par apprentissage</h2>
        <p className="lead">
          Sélectionne une posture avec les cinq curseurs, enregistre avec <strong>Val</strong>.{" "}
          <strong>I</strong> restaure l&apos;init, <strong>P</strong> remet le pointeur au début,{" "}
          <strong>L</strong> anime les points. Les courbes comparent l&apos;interpolation articulaire au
          segment cartésien idéal entre les extrémités de G.
        </p>

        <div className="learn-toolbar-rows">
          <div className="pp-actions">
            <button type="button" className="btn btn-ghost" onClick={initI}>
              I — Initialiser
            </button>
            <button type="button" className="btn btn-primary" onClick={valPoint}>
              Val — Enregistrer point
            </button>
            <button type="button" className="btn btn-ghost" onClick={beginP}>
              P — Début
            </button>
            <button type="button" className="btn btn-primary" onClick={playL} disabled={points.length < 2}>
              L — Lire / animer
            </button>
            <button type="button" className="btn btn-ghost" onClick={stopPlay}>
              Pause / Stop
            </button>
            <button type="button" className="btn btn-ghost" onClick={clearPts}>
              Effacer les points
            </button>
          </div>
          <div className="pp-actions">
            <button type="button" className="btn btn-ghost" onClick={loadEssaiA}>
              Essai A — 2 points éloignés
            </button>
            <button type="button" className="btn btn-ghost" onClick={loadEssaiB}>
              Essai B — 5 points intermédiaires
            </button>
            <button type="button" className="btn btn-ghost" onClick={exportJson}>
              Exporter les résultats JSON
            </button>
          </div>
        </div>

        <details className="learn-joints">
          <summary>Curseurs articulaires (consigne actuelle) · pointeur P{points.length ? cursor + 1 : "—"}/{points.length || 0}</summary>
          <JointPanel
            limits={{
              theta1: ERICC_LIMITS.theta1,
              theta2: ERICC_LIMITS.theta2,
              theta3: ERICC_LIMITS.theta3,
              theta4: ERICC_LIMITS.theta4,
              theta5: ERICC_LIMITS.theta5,
              grip: ERICC_LIMITS.grip,
            }}
            values={q}
            onChange={setJoint}
            onReset={initI}
          />
        </details>

        <div className="learn-plots">
          <TrajPlot
            title="Vue de dessus · plan XY"
            plane="xy"
            samples={analysis.samples}
            ideal={analysis.ideal}
            points={points}
          />
          <TrajPlot
            title="Vue latérale · plan XZ"
            plane="xz"
            samples={analysis.samples}
            ideal={analysis.ideal}
            points={points}
          />
          <div className="learn-legend">
            <span className="lg-real">━━ Trajectoire réelle dans le modèle (interpolation articulaire)</span>
            <span className="lg-ideal">┄┄ Segment cartésien idéal</span>
            <span className="lg-pts">● Points appris</span>
          </div>
        </div>

        <div className="dh-grid-2" style={{ marginTop: 18 }}>
          <div className="panel" style={{ margin: 0 }}>
            <p className="credits-label">Mesures numériques</p>
            <div className="coords">
              {points.length < 2
                ? "Enregistre au moins deux points."
                : `Points mémorisés : ${points.length}
Segments interpolés : ${analysis.nSeg}
Distance directe cumulée : ${analysis.direct.toFixed(2)} mm
Longueur trajectoire calculée : ${analysis.pathLen.toFixed(2)} mm
Écart maximal à la droite (3D) : ${analysis.maxDev.toFixed(2)} mm
Rapport longueurs : ${analysis.ratio.toFixed(4)}
Écarts max par segment : ${analysis.segDevs.map((v) => v.toFixed(2)).join(" ; ")} mm
Échantillons : ${analysis.nSamples} (${SAMPLES_PER_SEG} intervalles / segment)`}
            </div>
          </div>

          <div className="panel" style={{ margin: 0 }}>
            <p className="credits-label">Journal d&apos;apprentissage</p>
            {points.length === 0 ? (
              <p className="lead">Aucun point enregistré.</p>
            ) : (
              <div className="coords">
                {points
                  .map((p, i) => {
                    const g = pointG(p);
                    return `P${i + 1}  θ=[${[p.theta1, p.theta2, p.theta3, p.theta4, p.theta5]
                      .map((v) => Number(v).toFixed(1) + "°")
                      .join(", ")}]
     G = (${g.x.toFixed(1)}; ${g.y.toFixed(1)}; ${g.z.toFixed(1)}) mm`;
                  })
                  .join("\n\n")}
              </div>
            )}
          </div>
        </div>

        <div className="dh-note" style={{ marginTop: 16 }}>
          Interprétation : l&apos;écart maximal est calculé en 3D par rapport au segment joignant chaque
          paire de points appris. Les courbes projetées XY / XZ ne suffisent pas à démontrer une
          trajectoire droite en 3D. Les mouvements de L interpolent les angles des articulations ;
          aucun calcul de MGI ni contrôle continu de collision n&apos;est réalisé dans ce module.
        </div>
      </div>
    </div>
  );
}
