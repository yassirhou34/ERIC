"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const OBJECTS = [
  { id: "cyl36", label: "Cylindre Ø 36 mm", kind: "cyl", w: 36, grip: 28 },
  { id: "cyl50", label: "Cylindre Ø 50 mm", kind: "cyl", w: 50, grip: 42 },
  { id: "box40", label: "Parallélépipède 40 mm", kind: "box", w: 40, grip: 32 },
];

const ORIENTS = [
  { id: "ok", label: "Alignement adapté (succès attendu)", angle: 0, ok: true },
  { id: "bad", label: "Orientation défavorable (échec attendu)", angle: 55, ok: false },
];

const SYNCS = [
  { id: "wait", label: "Attendre le retrait du robot 1" },
  { id: "strict", label: "Handshake strict zone libre" },
];

const R1 = { base: { x: 0, y: 0 }, reach: [150, 640], color: "#2f6fed", L1: 300, L2: 320 };
const R2 = { base: { x: 660, y: 0 }, reach: [100, 360], color: "#7c3aed", L1: 200, L2: 220 };
const PICK = { x: 220, y: 90 };
const EXCHANGE = { x: 470, y: 100 };
const DEPOSE = { x: 600, y: 170 };
const RETRACT = 80;
const Z_SAFE = 120;
const Z_WORK = 20;
const OPEN = 70;

/** 20 étapes — R1 dépose à l’échange, R2 récupère puis dépose. */
const STEPS = [
  { who: "R1", label: "R1 — approche au-dessus de la pièce", tip: "pick", z: Z_SAFE, grip: "open", carrier: null },
  { who: "R1", label: "R1 — orienter les mors", tip: "pick", z: Z_SAFE, grip: "open", carrier: null },
  { who: "R1", label: "R1 — descente de préhension", tip: "pick", z: Z_WORK, grip: "open", carrier: null },
  { who: "R1", label: "R1 — saisir la pièce", tip: "pick", z: Z_WORK, grip: "close", carrier: "R1" },
  { who: "R1", label: "R1 — lever la pièce", tip: "pick", z: Z_SAFE, grip: "close", carrier: "R1" },
  { who: "R1", label: "R1 — transfert vers zone commune", tip: "exch", z: Z_SAFE, grip: "close", carrier: "R1" },
  { who: "R1", label: "R1 — descente et dépôt", tip: "exch", z: Z_WORK, grip: "close", carrier: "R1" },
  { who: "R1", label: "R1 — libérer la pièce", tip: "exch", z: Z_WORK, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — demander l’accès à la zone", tip: "r2home", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R1", label: "R1 — retrait pour libérer l’accès", tip: "r1back", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — autorisation de prise", tip: "r2home", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — approche au-dessus de la pièce", tip: "exch", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — orienter les mors", tip: "exch", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — descente de prise", tip: "exch", z: Z_WORK, grip: "open", carrier: null, pieceAt: "exch" },
  { who: "R2", label: "R2 — saisir la pièce", tip: "exch", z: Z_WORK, grip: "close", carrier: "R2", pieceAt: "exch" },
  { who: "R2", label: "R2 — levage sécurisé", tip: "exch", z: Z_SAFE, grip: "close", carrier: "R2" },
  { who: "R2", label: "R2 — transporter vers zone propre", tip: "place", z: Z_SAFE, grip: "close", carrier: "R2" },
  { who: "R2", label: "R2 — descente de dépose", tip: "place", z: Z_WORK, grip: "close", carrier: "R2" },
  { who: "R2", label: "R2 — déposer et libérer", tip: "place", z: Z_WORK, grip: "open", carrier: null, pieceAt: "place" },
  { who: "R2", label: "R2 — retrait final", tip: "r2back", z: Z_SAFE, grip: "open", carrier: null, pieceAt: "place" },
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ikLocal(world, robot) {
  const lx = world.x - robot.base.x;
  const ly = world.y - robot.base.y;
  const { L1, L2 } = robot;
  const r = clamp(Math.hypot(lx, ly), 1e-3, L1 + L2 - 1);
  const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const s2 = Math.sqrt(Math.max(0, 1 - c2 * c2));
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(ly, lx) - Math.atan2(L2 * s2, L1 + L2 * c2);
  const e = {
    x: robot.base.x + L1 * Math.cos(t1),
    y: robot.base.y + L1 * Math.sin(t1),
  };
  const tip = {
    x: e.x + L2 * Math.cos(t1 + t2),
    y: e.y + L2 * Math.sin(t1 + t2),
  };
  return { elbow: e, tip };
}

function tipWorld(key) {
  switch (key) {
    case "pick":
      return { ...PICK };
    case "exch":
      return { ...EXCHANGE };
    case "place":
      return { ...DEPOSE };
    case "r1back":
      return { x: PICK.x - RETRACT, y: PICK.y - 40 };
    case "r2home":
      return { x: R2.base.x - 80, y: 40 };
    case "r2back":
      return { x: DEPOSE.x + 40, y: DEPOSE.y - 50 };
    default:
      return { ...PICK };
  }
}

function TwoView({ r1, r2, piecePos, carrier, obj }) {
  const W = 640;
  const H = 420;
  const scale = 0.55;
  const ox = 50;
  const oy = H / 2 + 10;
  const map = (x, y) => [ox + x * scale, oy - y * scale];

  const drawArm = (robot, pose, label) => {
    const ik = ikLocal({ x: pose.x, y: pose.y }, robot);
    const [bx, by] = map(robot.base.x, robot.base.y);
    const [ex, ey] = map(ik.elbow.x, ik.elbow.y);
    const [tx, ty] = map(ik.tip.x, ik.tip.y);
    return (
      <g key={label}>
        <circle cx={bx} cy={by} r="11" fill="#111" />
        <text x={bx - 10} y={by + 28} fontSize="12" fontWeight="700" fill={robot.color}>
          {label}
        </text>
        <line x1={bx} y1={by} x2={ex} y2={ey} stroke={robot.color} strokeWidth="7" strokeLinecap="round" />
        <line x1={ex} y1={ey} x2={tx} y2={ty} stroke={robot.color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <circle cx={ex} cy={ey} r="6" fill="#fff" stroke="#111" strokeWidth="2" />
        <circle cx={tx} cy={ty} r="7" fill={robot.color} />
      </g>
    );
  };

  const [px, py] = map(PICK.x, PICK.y);
  const [exx, exy] = map(EXCHANGE.x, EXCHANGE.y);
  const [dx, dy] = map(DEPOSE.x, DEPOSE.y);
  const [oxp, oyp] = map(piecePos.x, piecePos.y);

  return (
    <svg className="pp-svg" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <pattern id="trGrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#e8e2d8" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#f7f4ef" />
      <rect width={W} height={H} fill="url(#trGrid)" />

      <circle cx={px} cy={py} r="16" fill="none" stroke="#2f6fed" strokeDasharray="5 4" strokeWidth="2" />
      <text x={px + 18} y={py + 4} fontSize="11" fill="#2f6fed" fontWeight="700">
        PRISE
      </text>
      <circle cx={exx} cy={exy} r="16" fill="none" stroke="#e67e22" strokeDasharray="5 4" strokeWidth="2" />
      <text x={exx + 18} y={exy + 4} fontSize="11" fill="#c96a12" fontWeight="700">
        ÉCHANGE
      </text>
      <circle cx={dx} cy={dy} r="16" fill="none" stroke="#0f766e" strokeDasharray="5 4" strokeWidth="2" />
      <text x={dx + 18} y={dy + 4} fontSize="11" fill="#0f766e" fontWeight="700">
        R2 · DÉPOSE
      </text>

      {drawArm(R1, r1, "R1")}
      {drawArm(R2, r2, "R2")}

      {obj.kind === "cyl" ? (
        <circle cx={oxp} cy={oyp} r={Math.max(7, obj.w * scale * 0.22)} fill="#e67e22" />
      ) : (
        <rect x={oxp - 10} y={oyp - 8} width="20" height="16" fill="#e67e22" rx="2" />
      )}

      <text x="16" y={H - 14} fontSize="12" fill="#555">
        Porteur : {carrier || "aucun"} · pièce {carrier ? "portée" : "posée"} · R1 Z={r1.z.toFixed(0)} mm · R2 Z=
        {r2.z.toFixed(0)} mm
      </text>
    </svg>
  );
}

export default function TwoRobotsSim() {
  const [objId, setObjId] = useState("cyl36");
  const [orientId, setOrientId] = useState("ok");
  const [syncId, setSyncId] = useState("wait");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [done, setDone] = useState(() => STEPS.map(() => false));
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [carrier, setCarrier] = useState(null);
  const [pieceAt, setPieceAt] = useState("pick");
  const [r1, setR1] = useState({ x: PICK.x - 30, y: PICK.y + 20, z: Z_SAFE, grip: OPEN });
  const [r2, setR2] = useState({ x: R2.base.x - 80, y: 40, z: Z_SAFE, grip: OPEN });

  const anim = useRef({ active: false, t: 0, from1: null, to1: null, from2: null, to2: null });
  const stepRef = useRef(0);
  const playRef = useRef(false);

  const obj = OBJECTS.find((o) => o.id === objId) || OBJECTS[0];
  const orient = ORIENTS.find((o) => o.id === orientId) || ORIENTS[0];

  const piecePos =
    carrier === "R1"
      ? { x: r1.x, y: r1.y }
      : carrier === "R2"
        ? { x: r2.x, y: r2.y }
        : pieceAt === "exch"
          ? EXCHANGE
          : pieceAt === "place"
            ? DEPOSE
            : PICK;

  const d1 = dist(R1.base, EXCHANGE);
  const d2 = dist(R2.base, EXCHANGE);

  const applyStepPose = useCallback(
    (i) => {
      const s = STEPS[i];
      const tip = tipWorld(s.tip);
      const grip = s.grip === "close" ? obj.grip : OPEN;
      if (s.who === "R1") {
        setR1((p) => ({ ...p, x: tip.x, y: tip.y, z: s.z, grip }));
      } else {
        setR2((p) => ({ ...p, x: tip.x, y: tip.y, z: s.z, grip }));
      }
      setCarrier(s.carrier);
      if (s.pieceAt) setPieceAt(s.pieceAt);
      else if (s.carrier === "R1") setPieceAt("pick");
      else if (s.carrier === "R2") setPieceAt("exch");
    },
    [obj]
  );

  const startSegment = useCallback(
    (i) => {
      if (!orient.ok && i >= 3) {
        setFailed(true);
        playRef.current = false;
        setPlaying(false);
        setDone((d) => {
          const n = [...d];
          for (let k = 0; k < 3; k++) n[k] = true;
          return n;
        });
        return;
      }
      const s = STEPS[i];
      const tip = tipWorld(s.tip);
      const grip = s.grip === "close" ? obj.grip : OPEN;
      const cur1 = { ...r1 };
      const cur2 = { ...r2 };
      const to1 = s.who === "R1" ? { x: tip.x, y: tip.y, z: s.z, grip } : cur1;
      const to2 = s.who === "R2" ? { x: tip.x, y: tip.y, z: s.z, grip } : cur2;
      anim.current = {
        active: true,
        t: 0,
        from1: cur1,
        to1,
        from2: cur2,
        to2,
        carrier: s.carrier,
        pieceAt: s.pieceAt,
      };
      setBusy(true);
      setStep(i);
      stepRef.current = i;
    },
    [obj, orient, r1, r2]
  );

  const snap = (i) => {
    if (!orient.ok && i >= 3) {
      setFailed(true);
      return;
    }
    applyStepPose(i);
    setStep(i);
    stepRef.current = i;
    setDone((d) => d.map((_, k) => k <= i));
    setBusy(false);
    anim.current.active = false;
    if (i >= 19) setFailed(false);
  };

  const reset = () => {
    playRef.current = false;
    setPlaying(false);
    setFailed(false);
    setDone(STEPS.map(() => false));
    setCarrier(null);
    setPieceAt("pick");
    setBusy(false);
    setStep(0);
    stepRef.current = 0;
    setR1({ x: PICK.x - 30, y: PICK.y + 20, z: Z_SAFE, grip: OPEN });
    setR2({ x: R2.base.x - 80, y: 40, z: Z_SAFE, grip: OPEN });
    anim.current.active = false;
  };

  const stepOnce = () => {
    playRef.current = false;
    setPlaying(false);
    if (anim.current.active && anim.current.t < 1) {
      snap(stepRef.current);
      return;
    }
    if (!done[stepRef.current]) {
      snap(stepRef.current);
      return;
    }
    if (stepRef.current >= 19) return;
    startSegment(stepRef.current + 1);
  };

  const runAll = () => {
    playRef.current = true;
    setPlaying(true);
    setFailed(false);
    if (done.every(Boolean)) {
      reset();
      playRef.current = true;
      setPlaying(true);
      startSegment(0);
      return;
    }
    if (!anim.current.active) {
      if (done[stepRef.current] && stepRef.current < 19) startSegment(stepRef.current + 1);
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
        a.t = Math.min(1, a.t + dt * 0.65 * speed);
        setR1({
          x: lerp(a.from1.x, a.to1.x, a.t),
          y: lerp(a.from1.y, a.to1.y, a.t),
          z: lerp(a.from1.z, a.to1.z, a.t),
          grip: lerp(a.from1.grip, a.to1.grip, a.t),
        });
        setR2({
          x: lerp(a.from2.x, a.to2.x, a.t),
          y: lerp(a.from2.y, a.to2.y, a.t),
          z: lerp(a.from2.z, a.to2.z, a.t),
          grip: lerp(a.from2.grip, a.to2.grip, a.t),
        });
        if (a.t > 0.45 && a.carrier) setCarrier(a.carrier);
        if (a.t >= 1) {
          a.active = false;
          setBusy(false);
          const i = stepRef.current;
          const s = STEPS[i];
          setCarrier(s.carrier);
          if (s.pieceAt) setPieceAt(s.pieceAt);
          setDone((d) => {
            const n = [...d];
            n[i] = true;
            return n;
          });
          if (playRef.current) {
            if (i < 19) {
              if (!orient.ok && i + 1 >= 3) {
                setFailed(true);
                playRef.current = false;
                setPlaying(false);
              } else {
                const next = i + 1;
                const sn = STEPS[next];
                const tip = tipWorld(sn.tip);
                const grip = sn.grip === "close" ? obj.grip : OPEN;
                const p1 = { x: lerp(a.from1.x, a.to1.x, 1), y: lerp(a.from1.y, a.to1.y, 1), z: lerp(a.from1.z, a.to1.z, 1), grip: a.to1.grip };
                const p2 = { x: lerp(a.from2.x, a.to2.x, 1), y: lerp(a.from2.y, a.to2.y, 1), z: lerp(a.from2.z, a.to2.z, 1), grip: a.to2.grip };
                anim.current = {
                  active: true,
                  t: 0,
                  from1: p1,
                  to1: sn.who === "R1" ? { x: tip.x, y: tip.y, z: sn.z, grip } : p1,
                  from2: p2,
                  to2: sn.who === "R2" ? { x: tip.x, y: tip.y, z: sn.z, grip } : p2,
                  carrier: sn.carrier,
                  pieceAt: sn.pieceAt,
                };
                setBusy(true);
                setStep(next);
                stepRef.current = next;
              }
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
  }, [speed, obj, orient]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId, orientId, syncId]);

  const doneCount = done.filter(Boolean).length;
  const complete = doneCount === 20 && !failed;

  const exportJson = () => {
    const payload = {
      meta: {
        module: "Deux robots virtuels — transfert",
        date: new Date().toISOString(),
        note: "Portées, collisions et trajectoires simplifiées",
      },
      object: obj,
      orientation: orient,
      sync: syncId,
      geometry: {
        R1: R1.base,
        R2: R2.base,
        pick: PICK,
        exchange: EXCHANGE,
        depose: DEPOSE,
        reach: { R1: R1.reach, R2: R2.reach },
      },
      measures: {
        r1ToCommon: d1,
        r2ToCommon: d2,
        steps: `${doneCount}/20`,
        transfer: complete ? "TRANSFERT COMPLET RÉUSSI" : failed ? "ÉCHEC ORIENTATION" : "EN COURS",
        finalErrorMm: complete ? 0 : failed ? null : null,
      },
      journal: STEPS.map((s, i) => ({ n: i + 1, label: s.label, status: done[i] ? "OK" : "—" })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ericc-deux-robots.json";
    a.click();
  };

  return (
    <div className="pp-lab tr-lab">
      <div className="panel pp-main">
        <div className="arch-ornament" aria-hidden />
        <p className="arch-kicker">Module 07 · Collaboration</p>
        <h2>Deux robots virtuels : déposer, libérer, récupérer</h2>
        <p className="lead">
          R1 prend la pièce, la dépose en zone d&apos;échange ; R2 récupère puis dépose. Modèle 2,5D
          pédagogique.
        </p>

        <div className="pp-toolbar">
          <label>
            Objet
            <select value={objId} onChange={(e) => setObjId(e.target.value)}>
              {OBJECTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Orientation demandée
            <select value={orientId} onChange={(e) => setOrientId(e.target.value)}>
              {ORIENTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Synchronisation
            <select value={syncId} onChange={(e) => setSyncId(e.target.value)}>
              {SYNCS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="pp-actions">
            <button type="button" className="btn btn-primary" onClick={runAll}>
              Animer le transfert complet
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                playRef.current = false;
                setPlaying(false);
              }}
            >
              Pause
            </button>
            <button type="button" className="btn btn-ghost" onClick={stepOnce}>
              Étape par étape
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Réinitialiser
            </button>
            <button type="button" className="btn btn-ghost" onClick={exportJson}>
              Exporter rapport JSON
            </button>
          </div>
          <label className="pp-speed">
            Vitesse {speed.toFixed(1)}×
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="pp-layout">
          <div className="pp-views">
            <div className="viz-card">
              <header>
                <span>Table virtuelle · Deux robots · vue XY (mm)</span>
                <span>2,5D</span>
              </header>
              <TwoView r1={r1} r2={r2} piecePos={piecePos} carrier={carrier} obj={obj} />
              {complete && (
                <div className="tr-success">✓ Cycle complet : le robot 2 a récupéré puis déposé la pièce</div>
              )}
              {failed && (
                <div className="tr-fail">✗ Échec : orientation défavorable — préhension R1 interrompue</div>
              )}
              <p className="sensor-note" style={{ padding: "8px 12px" }}>
                R1 : base (0, 0), portée [{R1.reach.join("; ")}] mm · R2 : base (660, 0), portée [
                {R2.reach.join("; ")}] mm · Échange (470, 100) · marge retrait {RETRACT} mm · prise Z=
                {Z_WORK} mm, transport Z={Z_SAFE} mm.
              </p>
            </div>

            <details className="tr-algo panel" style={{ margin: 0 }}>
              <summary>Algorithme de transfert et réponses aux quatre questions</summary>
              <div className="dh-guide" style={{ marginTop: 10 }}>
                <p>
                  <strong>Difficultés :</strong> géométrie de prise, portées des deux robots, orientation,
                  hauteur, absence de collision et synchronisation.
                </p>
                <p>
                  <strong>Solutions :</strong> cible dans les deux espaces accessibles, orientation adaptée
                  aux mors, montée en Z avant transfert, dépôt R1, retrait, validation zone libre, puis
                  approche R2.
                </p>
                <p>
                  <strong>Conditions initiales :</strong> pièce en (220, 90), pinces ouvertes, bras hors zone
                  d&apos;échange, cible (470, 100).
                </p>
                <p>
                  <strong>Conditions finales :</strong> R1 retiré, R2 a saisi la pièce et l&apos;a déposée en
                  (600, 170).
                </p>
              </div>
            </details>
          </div>

          <aside className="pp-side">
            <div className="arch-card">
              <p className="credits-label">Validation et mesures</p>
              <div className="coords">
                {`OBJET : ${obj.label}
PRISE INITIALE : (${PICK.x}, ${PICK.y}) mm
POINT COMMUN : (${EXCHANGE.x}, ${EXCHANGE.y}) mm
R1 → COMMUN : ${d1.toFixed(1)} mm (max ${R1.reach[1]})
R2 → COMMUN : ${d2.toFixed(1)} mm (max ${R2.reach[1]})
ORIENTATION OBJET : ${orient.angle}°
MORS MAX : ${OPEN} mm
ÉTAPES : ${doneCount}/20
STATUT : ${playing || busy ? "EN COURS" : "PRÊT"}
TRANSFERT : ${complete ? "TRANSFERT COMPLET RÉUSSI" : failed ? "ÉCHEC" : "—"}
ERREUR FINALE : ${complete ? "0 mm" : "—"}
Portées, collisions et trajectoires simplifiées.`}
              </div>
            </div>

            <div className="panel pp-log" style={{ margin: 0 }}>
              <p className="credits-label">Journal chronologique</p>
              <ol className="pp-journal tr-journal">
                {STEPS.map((s, i) => (
                  <li key={`tr-${i}`} className={done[i] ? "ok" : i === step && (playing || busy) ? "run" : ""}>
                    <span>
                      {i + 1}. {s.label}
                    </span>
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
