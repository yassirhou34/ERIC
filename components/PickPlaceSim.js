"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PIECES = [
  { id: "cyl36", label: "Cylindre (Ø 36 mm)", kind: "cyl", d: 36, h: 40, gripClose: 28 },
  { id: "cyl50", label: "Cylindre (Ø 50 mm)", kind: "cyl", d: 50, h: 45, gripClose: 42 },
  { id: "box40", label: "Parallélépipède 40×40", kind: "box", w: 40, h: 35, gripClose: 32 },
  { id: "box60", label: "Parallélépipède 60×40", kind: "box", w: 60, h: 30, gripClose: 48 },
];

const DESTINATIONS = [
  { id: "zoneA", label: "Zone de dépose (360, 100) mm", x: 360, y: 100 },
  { id: "zoneB", label: "Zone B (280, −80) mm", x: 280, y: -80 },
  { id: "zoneC", label: "Zone C (420, 40) mm", x: 420, y: 40 },
];

const PICK = { x: 220, y: 90 };
const Z_SAFE = 120;
const Z_WORK = 20;
const L1 = 280;
const L2 = 300;
const OPEN_MAX = 70;

const STEPS = [
  { id: "approach", label: "Approche en hauteur", at: "pick", z: Z_SAFE, grip: "open", hold: false },
  { id: "orient", label: "Orientation de la pince", at: "pick", z: Z_SAFE, grip: "open", hold: false },
  { id: "descend", label: "Descente sur la pièce", at: "pick", z: Z_WORK, grip: "open", hold: false },
  { id: "grasp", label: "Fermeture et préhension", at: "pick", z: Z_WORK, grip: "close", hold: true },
  { id: "lift", label: "Levée de sécurité", at: "pick", z: Z_SAFE, grip: "close", hold: true },
  { id: "transfer", label: "Transfert vers la destination", at: "dest", z: Z_SAFE, grip: "close", hold: true },
  { id: "lower", label: "Descente pour dépose", at: "dest", z: Z_WORK, grip: "close", hold: true },
  { id: "release", label: "Ouverture et dépose", at: "dest", z: Z_WORK, grip: "open", hold: false, drop: true },
  { id: "retract", label: "Retrait de sécurité", at: "dest", z: Z_SAFE, grip: "open", hold: false },
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ik2r(x, y) {
  const r = clamp(Math.hypot(x, y), 1e-3, L1 + L2 - 1);
  const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const s2 = Math.sqrt(Math.max(0, 1 - c2 * c2));
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2);
  return {
    elbow: { x: L1 * Math.cos(t1), y: L1 * Math.sin(t1) },
    tip: {
      x: L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2),
      y: L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2),
    },
  };
}

function resolveTarget(stepDef, dest, piece) {
  const xy = stepDef.at === "dest" ? dest : PICK;
  const grip = stepDef.grip === "close" ? piece.gripClose : OPEN_MAX;
  return { x: xy.x, y: xy.y, z: stepDef.z, grip, hold: stepDef.hold, drop: !!stepDef.drop };
}

function TopView({ pose, pick, dest, piece, held, dropped }) {
  const W = 520;
  const H = 400;
  const scale = 0.55;
  const ox = 70;
  const oy = H / 2;
  const map = (x, y) => [ox + x * scale, oy - y * scale];
  const ik = ik2r(pose.x, pose.y);
  const [bx, by] = map(0, 0);
  const [ex, ey] = map(ik.elbow.x, ik.elbow.y);
  const [gx, gy] = map(ik.tip.x, ik.tip.y);
  const [px, py] = map(pick.x, pick.y);
  const [dx, dy] = map(dest.x, dest.y);
  const obj = held ? { x: gx, y: gy } : dropped ? { x: dx, y: dy } : { x: px, y: py };

  return (
    <svg className="pp-svg" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <pattern id="ppGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e2d8" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#f7f4ef" />
      <rect width={W} height={H} fill="url(#ppGrid)" />
      {[200, 350, 500, 640].map((r) => (
        <circle key={r} cx={bx} cy={by} r={r * scale} fill="none" stroke="#d2c6b6" strokeDasharray="4 6" />
      ))}
      <line x1={bx} y1={by} x2={bx + 70} y2={by} stroke="#2f6fed" strokeWidth="2" />
      <line x1={bx} y1={by} x2={bx} y2={by - 70} stroke="#0f766e" strokeWidth="2" />
      <text x={bx + 76} y={by + 4} fontSize="11" fill="#2f6fed">X</text>
      <text x={bx + 4} y={by - 76} fontSize="11" fill="#0f766e">Y</text>

      <circle cx={px} cy={py} r="18" fill="none" stroke="#2f6fed" strokeDasharray="5 4" strokeWidth="2" />
      <text x={px + 22} y={py + 4} fontSize="11" fill="#2f6fed" fontWeight="700">Prise</text>
      <circle cx={dx} cy={dy} r="16" fill="none" stroke="#e67e22" strokeWidth="2.5" />
      <circle cx={dx} cy={dy} r="9" fill="none" stroke="#0f766e" strokeWidth="2" />
      <text x={dx + 20} y={dy + 4} fontSize="11" fill="#c96a12" fontWeight="700">Dépose</text>
      <line x1={px} y1={py} x2={dx} y2={dy} stroke="#e67e22" strokeDasharray="6 5" opacity="0.4" />

      <circle cx={bx} cy={by} r="10" fill="#111" />
      <line x1={bx} y1={by} x2={ex} y2={ey} stroke="#2f6fed" strokeWidth="7" strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={gx} y2={gy} stroke="#0f766e" strokeWidth="6" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="7" fill="#fff" stroke="#111" strokeWidth="2" />
      <circle cx={gx} cy={gy} r="8" fill="#c8102e" />
      <text x={gx + 12} y={gy - 8} fontSize="11" fill="#333">Pince · Z={pose.z.toFixed(0)} mm</text>
      <text x={ex + 8} y={ey - 10} fontSize="10" fill="#666">Coude (IK illustrative)</text>

      {piece.kind === "cyl" ? (
        <circle cx={obj.x} cy={obj.y} r={Math.max(6, (piece.d * scale) / 2)} fill={held ? "#e67e22" : "#9aa0a6"} />
      ) : (
        <rect
          x={obj.x - Math.max(8, (piece.w * scale) / 4)}
          y={obj.y - 8}
          width={Math.max(14, (piece.w * scale) / 2)}
          height="16"
          fill={held ? "#e67e22" : "#9aa0a6"}
          rx="2"
        />
      )}
      <g transform={`translate(16 ${H - 34})`}>
        <rect width="14" height="14" fill={held ? "#e67e22" : "#bbb"} />
        <text x="22" y="12" fontSize="12" fill="#555">
          {held ? "Objet saisi" : dropped ? "Objet déposé" : "Objet non manipulé"}
        </text>
      </g>
    </svg>
  );
}

function SideView({ pose, piece, held, dropped, dest }) {
  const W = 520;
  const H = 260;
  const baseX = 70;
  const tableY = 210;
  const sR = 0.42;
  const sZ = 1.05;
  const r = Math.hypot(pose.x, pose.y);
  const tipX = baseX + r * sR;
  const tipY = tableY - pose.z * sZ;
  const midX = baseX + r * sR * 0.42;
  const midY = tableY - Math.max(36, pose.z * 0.5) * sZ;
  const open = (pose.grip / OPEN_MAX) * 16;
  const objH = (piece.h || 40) * 0.65;
  const pickR = Math.hypot(PICK.x, PICK.y) * sR;
  const destR = Math.hypot(dest.x, dest.y) * sR;
  const objX = held ? tipX : dropped ? baseX + destR : baseX + pickR;
  const objY = held ? tipY + 6 : tableY - objH;

  return (
    <svg className="pp-svg" viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#f5f8f7" />
      <line x1="36" y1={tableY} x2={W - 16} y2={tableY} stroke="#888" strokeWidth="3" />
      <text x="40" y={tableY + 16} fontSize="11" fill="#666">Table Z=0</text>
      <rect x={baseX - 26} y={tableY - 16} width="52" height="16" fill="#444" rx="2" />
      <line x1={baseX} y1={tableY - 16} x2={midX} y2={midY} stroke="#2f6fed" strokeWidth="6" strokeLinecap="round" />
      <line x1={midX} y1={midY} x2={tipX} y2={tipY} stroke="#0f766e" strokeWidth="5" strokeLinecap="round" />
      <circle cx={baseX} cy={tableY - 16} r="6" fill="#111" />
      <circle cx={midX} cy={midY} r="5" fill="#fff" stroke="#111" />
      <line x1={tipX - open} y1={tipY} x2={tipX - open} y2={tipY + 20} stroke="#111" strokeWidth="3" />
      <line x1={tipX + open} y1={tipY} x2={tipX + open} y2={tipY + 20} stroke="#111" strokeWidth="3" />
      <line x1={tipX - open} y1={tipY} x2={tipX + open} y2={tipY} stroke="#c8102e" strokeWidth="3" />
      <text x={Math.min(tipX + 12, W - 200)} y={tipY - 8} fontSize="11" fill="#333">
        Profil pédagogique · Z={pose.z.toFixed(0)} mm
      </text>
      <rect x={objX - 11} y={objY} width="22" height={objH} fill={held ? "#e67e22" : "#9aa0a6"} rx="2" />
      <rect x="0" y={H - 28} width={W} height="28" fill="rgba(15,118,110,0.1)" />
      <text x="14" y={H - 10} fontSize="11" fill="#0f766e" fontFamily="ui-monospace,monospace">
        Pince ({pose.x.toFixed(0)}; {pose.y.toFixed(0)}; {pose.z.toFixed(0)}) mm · angle{" "}
        {((Math.atan2(pose.y, pose.x) * 180) / Math.PI).toFixed(0)}° · ouverture {pose.grip.toFixed(0)} mm ·{" "}
        {held ? "pièce saisie" : "pièce non saisie"}
      </text>
    </svg>
  );
}

export default function PickPlaceSim({ onEriccPose }) {
  const [pieceId, setPieceId] = useState("cyl36");
  const [destId, setDestId] = useState("zoneA");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [done, setDone] = useState(() => STEPS.map(() => false));
  const [dropped, setDropped] = useState(false);
  const [holding, setHolding] = useState(false);
  const [pose, setPose] = useState({ x: PICK.x, y: PICK.y, z: Z_SAFE, grip: OPEN_MAX });
  const [busy, setBusy] = useState(false);

  const anim = useRef({ from: null, to: null, t: 0, active: false });
  const stepRef = useRef(0);
  const playRef = useRef(false);

  const piece = PIECES.find((p) => p.id === pieceId) || PIECES[0];
  const dest = DESTINATIONS.find((d) => d.id === destId) || DESTINATIONS[0];

  const syncEricc = useCallback(
    (p, holding) => {
      if (!onEriccPose) return;
      const ang = (Math.atan2(p.y, p.x) * 180) / Math.PI;
      onEriccPose({
        theta1: clamp(ang, -135, 135),
        theta2: clamp(20 + (p.z / Z_SAFE) * 30, 15, 65),
        theta3: clamp(40 - (p.z / Z_SAFE) * 12, 15, 50),
        theta4: 0,
        theta5: 55,
        grip: clamp(p.grip * 0.65, 5, 55),
      });
    },
    [onEriccPose]
  );

  const snapTo = useCallback(
    (i) => {
      const to = resolveTarget(STEPS[i], dest, piece);
      setPose(to);
      setStep(i);
      stepRef.current = i;
      setDone((d) => d.map((_, k) => k <= i));
      if (STEPS[i].drop) {
        setDropped(true);
        setHolding(false);
      }
      if (i < 3) {
        setDropped(false);
        setHolding(false);
      }
      if (STEPS[i].hold && !STEPS[i].drop) setHolding(true);
      syncEricc(to, STEPS[i].hold && !STEPS[i].drop);
      anim.current = { from: to, to, t: 1, active: false };
      setBusy(false);
    },
    [dest, piece, syncEricc]
  );

  const startSegment = useCallback(
    (i) => {
      const to = resolveTarget(STEPS[i], dest, piece);
      const from = { ...pose };
      anim.current = { from, to, t: 0, active: true };
      setBusy(true);
      setStep(i);
      stepRef.current = i;
    },
    [dest, piece, pose]
  );

  const reset = () => {
    playRef.current = false;
    setPlaying(false);
    setDone(STEPS.map(() => false));
    setDropped(false);
    setHolding(false);
    setBusy(false);
    const to = { x: PICK.x, y: PICK.y, z: Z_SAFE, grip: OPEN_MAX };
    setPose(to);
    setStep(0);
    stepRef.current = 0;
    anim.current = { from: to, to, t: 1, active: false };
    syncEricc(to, false);
  };

  const stepOnce = () => {
    playRef.current = false;
    setPlaying(false);
    if (anim.current.active && anim.current.t < 1) {
      snapTo(stepRef.current);
      return;
    }
    const cur = stepRef.current;
    if (!done[cur]) {
      snapTo(cur);
      return;
    }
    if (cur >= 8) return;
    startSegment(cur + 1);
  };

  const runCycle = () => {
    playRef.current = true;
    setPlaying(true);
    if (done.every(Boolean)) {
      const from = { x: PICK.x, y: PICK.y, z: Z_SAFE, grip: OPEN_MAX };
      const to = resolveTarget(STEPS[0], dest, piece);
      setDone(STEPS.map(() => false));
      setDropped(false);
      setHolding(false);
      setPose(from);
      setStep(0);
      stepRef.current = 0;
      anim.current = { from, to, t: 0, active: true };
      setBusy(true);
      return;
    }
    if (!anim.current.active) {
      if (done[stepRef.current] && stepRef.current < 8) startSegment(stepRef.current + 1);
      else startSegment(stepRef.current);
    }
  };

  useEffect(() => {
    let id;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const a = anim.current;
      if (a.active) {
        a.t = Math.min(1, a.t + dt * 0.7 * speed);
        const p = {
          x: lerp(a.from.x, a.to.x, a.t),
          y: lerp(a.from.y, a.to.y, a.t),
          z: lerp(a.from.z, a.to.z, a.t),
          grip: lerp(a.from.grip, a.to.grip, a.t),
        };
        setPose(p);
        if (a.to.hold && !a.to.drop && a.t > 0.35) setHolding(true);
        if (a.to.drop && a.t > 0.5) setHolding(false);
        syncEricc(p, a.to.hold && !a.to.drop && a.t > 0.35);
        if (a.t >= 1) {
          a.active = false;
          setBusy(false);
          const i = stepRef.current;
          setDone((d) => {
            const n = [...d];
            n[i] = true;
            return n;
          });
          if (STEPS[i].drop) {
            setDropped(true);
            setHolding(false);
          }
          if (STEPS[i].hold && !STEPS[i].drop) setHolding(true);
          if (playRef.current) {
            if (i < 8) {
              const next = i + 1;
              const to = resolveTarget(STEPS[next], dest, piece);
              anim.current = { from: { ...p }, to, t: 0, active: true };
              setBusy(true);
              setStep(next);
              stepRef.current = next;
            } else {
              playRef.current = false;
              setPlaying(false);
            }
          }
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [speed, dest, piece, syncEricc]);

  /* reset pose when piece/dest changes */
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceId, destId]);

  const doneCount = done.filter(Boolean).length;

  const exportJson = () => {
    const payload = {
      meta: {
        module: "Prise-dépose pédagogique 2,5D",
        note: "Modèle illustratif — pas de collisions 3D ni efforts réels",
        date: new Date().toISOString(),
      },
      piece,
      destination: dest,
      pick: PICK,
      limits: { zSafe: Z_SAFE, zWork: Z_WORK, openMax: OPEN_MAX },
      step: step + 1,
      pose,
      holding,
      dropped,
      journal: STEPS.map((s, i) => ({ n: i + 1, label: s.label, status: done[i] ? "OK" : "—" })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ericc-prise-depose.json";
    a.click();
  };

  return (
    <div className="pp-lab">
      <div className="panel pp-main">
        <div className="arch-ornament" aria-hidden />
        <p className="arch-kicker">Module 06 · Cycle simulé</p>
        <h2>Prise et dépose</h2>
        <p className="lead">
          Animation pédagogique 2,5D avec bras illustratif (IK plane). Ni physique de contact, ni
          collisions 3D du robot réel.
        </p>

        <div className="pp-toolbar">
          <label>
            Pièce
            <select value={pieceId} onChange={(e) => setPieceId(e.target.value)}>
              {PIECES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Destination
            <select value={destId} onChange={(e) => setDestId(e.target.value)}>
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <div className="pp-actions">
            <button type="button" className="btn btn-primary" onClick={runCycle}>
              Exécuter le cycle simulé
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { playRef.current = false; setPlaying(false); }}>
              Pause
            </button>
            <button type="button" className="btn btn-ghost" onClick={stepOnce}>
              Étape suivante
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Réinitialiser
            </button>
          </div>
          <label className="pp-speed">
            Vitesse {speed.toFixed(1)}×
            <input type="range" min="0.4" max="2.5" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={exportJson}>
            Exporter les résultats JSON
          </button>
        </div>

        <div className="pp-layout">
          <div className="pp-views">
            <div className="viz-card">
              <header>
                <span>Table virtuelle · vue du dessus · X / Y en mm</span>
                <span>2,5D</span>
              </header>
              <TopView pose={pose} pick={PICK} dest={dest} piece={piece} held={holding} dropped={dropped} />
            </div>
            <div className="viz-card">
              <header>
                <span>Vue latérale animée · levée et descente</span>
                <span>Z</span>
              </header>
              <SideView pose={pose} piece={piece} held={holding} dropped={dropped} dest={dest} />
            </div>
          </div>

          <aside className="pp-side">
            <div className="arch-card">
              <p className="credits-label">Résultats de l&apos;essai</p>
              <h3>Étape {Math.max(1, Math.min(9, doneCount + (busy ? 1 : 0)))}/9</h3>
              <p>
                {playing
                  ? STEPS[step].label
                  : doneCount === 9
                    ? "Cycle terminé."
                    : "Appuyer sur « Étape suivante » ou « Exécuter le cycle ». Ce modèle ne simule pas les efforts ni les collisions 3D."}
              </p>
              <div className="coords" style={{ marginTop: 12 }}>
                {`Effort de la pince : 0 N (non modélisé)
Retrait Z : ${Z_SAFE} mm
Orientation : 0°
Ouverture : ${pose.grip.toFixed(0)} mm
Limites : modèle 2,5D, non validé physiquement`}
              </div>
            </div>

            <div className="panel pp-log" style={{ margin: 0 }}>
              <p className="credits-label">Journal des événements</p>
              <ol className="pp-journal">
                {STEPS.map((s, i) => (
                  <li key={s.id} className={done[i] ? "ok" : i === step && playing ? "run" : ""}>
                    <span>{i + 1}. {s.label}</span>
                    <strong>{done[i] ? "OK" : i === step && playing ? "…" : "—"}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
