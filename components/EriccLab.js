"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import JointPanel from "./JointPanel";
import { EriccProfile, EriccTop } from "./EriccViz";
import EriccDhExtension from "./EriccDhExtension";
import PickPlaceSim from "./PickPlaceSim";
import TwoRobotsSim from "./TwoRobotsSim";
import LearnTrajSim from "./LearnTrajSim";
import EriccTerminal from "./EriccTerminal";
import { EriccLabStage, EriccArchStage, EriccSensorsStage, WristCoupleStage } from "./three/DynamicStages";
import {
  ERICC_DEFAULT,
  ERICC_LIMITS,
  ERICC_MOTORS,
  ERICC_PARTS,
  ERICC_SENSORS,
  ericcMGD,
  ericcMGI,
  mobilityEricc,
} from "@/lib/ericc";
import { useSmoothJoints } from "@/lib/useSmoothJoints";

const TABS = [
  { id: "board", n: "01", label: "Tableau de bord" },
  { id: "arch", n: "02", label: "Architecture" },
  { id: "motors", n: "03", label: "Motorisation" },
  { id: "sensors", n: "04", label: "Capteurs" },
  { id: "mgd", n: "05", label: "MGD / MGI" },
  { id: "pick", n: "06", label: "Prise-dépose" },
  { id: "two", n: "07", label: "Deux robots" },
  { id: "learn", n: "08", label: "Apprentissage" },
  { id: "valid", n: "09", label: "Validation EP" },
  { id: "console", n: "10", label: "Console" },
];

export default function EriccLab() {
  const [tab, setTab] = useState("board");
  const [q, setQ] = useState(ERICC_DEFAULT);
  const qs = useSmoothJoints(q, 14);
  const [part, setPart] = useState("bras");
  const [voiceOn, setVoiceOn] = useState(true);
  const [motor, setMotor] = useState("t3");
  const [stepA, setStepA] = useState(0);
  const [stepB, setStepB] = useState(0);
  const [sensor, setSensor] = useState("o3");
  const [capA, setCapA] = useState(null);
  const [capB, setCapB] = useState(null);

  const speakPart = useCallback(
    (p) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      if (!voiceOn || !p) return;
      const u = new SpeechSynthesisUtterance(p.speech || `${p.name}. ${p.desc}`);
      u.lang = "fr-FR";
      u.rate = 1.02;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.find((v) => v.lang?.startsWith("fr"));
      if (fr) u.voice = fr;
      window.speechSynthesis.speak(u);
    },
    [voiceOn]
  );

  const selectPart = useCallback(
    (id) => {
      setPart(id);
      const p = ERICC_PARTS.find((x) => x.id === id);
      speakPart(p);
    },
    [speakPart]
  );

  const selectSensor = useCallback(
    (id) => {
      setSensor(id);
      const s = ERICC_SENSORS.find((x) => x.id === id);
      speakPart(s);
    },
    [speakPart]
  );

  /* Couplage A/B -> theta4 (rotation) / theta5 (inclinaison) sur le bras live */
  useEffect(() => {
    if (tab !== "motors") return;
    const incl = stepA + stepB;
    const rot = stepA - stepB;
    setQ((prev) => ({
      ...prev,
      theta4: Math.max(-180, Math.min(180, rot * 35)),
      theta5: Math.max(-90, Math.min(90, 50 + incl * 22)),
    }));
  }, [stepA, stepB, tab]);
  const [mgiTarget, setMgiTarget] = useState({ x: 400, y: 0, z: 320 });
  const [mgiMsg, setMgiMsg] = useState("Prêt pour le calcul inverse.");
  const [logs, setLogs] = useState(["[sys] Lab ERICC initialisé — Polytech GII-4A"]);
  const [pickStep, setPickStep] = useState(0);
  const [learnProg, setLearnProg] = useState([]);
  const mgd = useMemo(() => ericcMGD(qs), [qs]);
  const mgdExact = useMemo(() => ericcMGD(q), [q]);
  const mob = mobilityEricc();

  const setJoint = (key, val) => {
    setQ((prev) => ({ ...prev, [key]: val }));
    setLogs((L) => [`[joint] ${key} → ${val}`, ...L].slice(0, 40));
  };

  const runMGI = () => {
    const res = ericcMGI(mgiTarget.x, mgiTarget.y, mgiTarget.z, q.theta5);
    if (!res.ok) {
      setMgiMsg(res.message);
      return;
    }
    setQ((prev) => ({ ...prev, ...res.q, grip: prev.grip }));
    setMgiMsg(
      `Solution approchée — θ₁=${res.q.theta1}° · θ₂=${res.q.theta2}° · θ₃=${res.q.theta3}° · θ₄=${res.q.theta4}° · θ₅=${res.q.theta5}° (conservé). Erreur après arrondi ≈ ${res.residual.toFixed(1)} mm.`
    );
  };

  const omega = () => {
    if (!capA || !capB || capB.t === capA.t) return null;
    const dt = (capB.t - capA.t) / 1000;
    return {
      o1: ((capB.q.theta1 - capA.q.theta1) / dt).toFixed(2),
      o2: ((capB.q.theta2 - capA.q.theta2) / dt).toFixed(2),
      o3: ((capB.q.theta3 - capA.q.theta3) / dt).toFixed(2),
      dt: dt.toFixed(2),
    };
  };

  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="atelier">
      <aside className="atelier-rail">
        <Link href="/" className="back">
          ← Maison
        </Link>
        <div>
          <div className="title">ERICC</div>
          <div className="status">Atelier live</div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <span>{t.n}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="atelier-main">
        <div className="lead-block">
          <h1>{active?.label}</h1>
          <p>Module {active?.n} · simulation réactive · Polytech GII-4A</p>
        </div>
        {(tab === "board" || tab === "mgd") && (
          <div className="panel-grid">
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
              onReset={() => setQ(ERICC_DEFAULT)}
            />
            <div style={{ display: "grid", gap: 16 }}>
              <div className="live-meter">
                <div className="cell">
                  <small>TCP X</small>
                  <strong>{mgd.G.x.toFixed(1)}</strong>
                </div>
                <div className="cell">
                  <small>TCP Y</small>
                  <strong>{mgd.G.y.toFixed(1)}</strong>
                </div>
                <div className="cell">
                  <small>TCP Z</small>
                  <strong>{mgd.G.z.toFixed(1)}</strong>
                </div>
              </div>
              <div className="viz-card" style={{ minHeight: 420 }}>
                <header>
                  <span>Scène 3D temps réel</span>
                  <span>THREE.JS</span>
                </header>
                <div className="lab-canvas-wrap">
                  <EriccLabStage q={qs} />
                </div>
              </div>
              <div className="viz-grid">
                <div className="viz-card">
                  <header>
                    <span>Vue de profil · live</span>
                    <span>XZ</span>
                  </header>
                  <EriccProfile q={qs} />
                </div>
                <div className="viz-card">
                  <header>
                    <span>Vue du dessus</span>
                    <span>θ₁</span>
                  </header>
                  <EriccTop q={qs} />
                </div>
              </div>
              <div className="coords">
                  {`TCP G (mm) live
x = ${mgd.G.x.toFixed(1)} · y = ${mgd.G.y.toFixed(1)} · z = ${mgd.G.z.toFixed(1)}

consigne θ = [${q.theta1}, ${q.theta2}, ${q.theta3}, ${q.theta4}, ${q.theta5}]°
pince = ${q.grip} mm
portée radiale ≈ ${Math.hypot(mgdExact.G.x, mgdExact.G.y).toFixed(1)} mm`}
              </div>
            </div>
          </div>
        )}

        {tab === "mgd" && (
          <div className="mgd-lab">
            <div className="two-col">
              <div className="panel">
                <h3>Modèle géométrique direct</h3>
                <p className="lead">
                  Les curseurs pilotent le point G. Géométrie simplifiée EP — distincte du modèle DH
                  ci-dessous.
                </p>
                <div className="coords">
                  {`rE = L₂ cos θ₂ ; zE = L₁ + L₂ sin θ₂
rW = rE + L₃ sin(θ₂+θ₃)
zW = zE − L₃ cos(θ₂+θ₃)
rG = rW + L₄ sin(θ₂+θ₅)
zG = zW − L₄ cos(θ₂+θ₅)
x = rG cos θ₁ ; y = rG sin θ₁`}
                </div>
                <div className="coords" style={{ marginTop: 12 }}>
                  {`G live = (${mgdExact.G.x.toFixed(1)}, ${mgdExact.G.y.toFixed(1)}, ${mgdExact.G.z.toFixed(1)}) mm
θ = [${q.theta1}, ${q.theta2}, ${q.theta3}, ${q.theta4}, ${q.theta5}]°`}
                </div>
                <div className="matrix" style={{ marginTop: 14 }}>
                  {mgd.T.flat().map((v, i) => (
                    <span key={i} className={i % 4 === 3 && i < 12 ? "pos" : ""}>
                      {typeof v === "number" ? v.toFixed(3) : v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="panel">
                <h3>Modèle géométrique inverse</h3>
                <p className="lead">
                  Impose (x,y,z). MGI partiel (modèle simplifié) : θ₅ conservé, θ₄ libre (= 0).
                </p>
                <div className="field-row">
                  {["x", "y", "z"].map((k) => (
                    <label key={k}>
                      {k.toUpperCase()} (mm)
                      <input
                        type="number"
                        value={mgiTarget[k]}
                        onChange={(e) => setMgiTarget({ ...mgiTarget, [k]: Number(e.target.value) })}
                      />
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" type="button" onClick={runMGI}>
                    Calculer les angles
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() =>
                      setMgiTarget({
                        x: +mgd.G.x.toFixed(1),
                        y: +mgd.G.y.toFixed(1),
                        z: +mgd.G.z.toFixed(1),
                      })
                    }
                  >
                    Reprendre position actuelle
                  </button>
                </div>
                <p className="lead" style={{ marginTop: 14 }}>
                  {mgiMsg}
                </p>
              </div>
            </div>

            <EriccDhExtension qSlider={q} />
          </div>
        )}

        {tab === "arch" && (
          <div className="arch-lab">
            <div className="panel arch-main">
              <div className="arch-ornament" aria-hidden />
              <div className="arch-head">
                <div>
                  <p className="arch-kicker">Module 02 · Chaîne série RRRRR</p>
                  <h2>Architecture de la partie opérative</h2>
                  <p className="lead">
                    Modèle 3D interactif — sélectionne une pièce : elle s’allume et la voix explique.
                  </p>
                </div>
                <button
                  type="button"
                  className={`voice-toggle ${voiceOn ? "on" : ""}`}
                  onClick={() => {
                    setVoiceOn((v) => {
                      if (v && typeof window !== "undefined") window.speechSynthesis?.cancel();
                      return !v;
                    });
                  }}
                >
                  <span className="voice-dot" aria-hidden />
                  {voiceOn ? "Voix ON" : "Voix OFF"}
                </button>
              </div>

              <div className="arch-layout">
                <div className="viz-card arch-3d">
                  <header>
                    <span>Explorateur 3D · pièce active</span>
                    <span>{ERICC_PARTS.find((p) => p.id === part)?.name || "—"}</span>
                  </header>
                  <div className="lab-canvas-wrap arch-canvas">
                    <EriccArchStage q={qs} highlight={part} />
                  </div>
                </div>

                <div className="arch-side">
                  <div className="list-select arch-parts">
                    {ERICC_PARTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={part === p.id ? "active" : ""}
                        onClick={() => selectPart(p.id)}
                      >
                        <span className="arch-n">{p.n}</span>
                        <span className="arch-name">{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="arch-card">
                    <p className="credits-label">Élément sélectionné</p>
                    <h3>{ERICC_PARTS.find((p) => p.id === part)?.name}</h3>
                    <p>{ERICC_PARTS.find((p) => p.id === part)?.desc}</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: 12 }}
                      onClick={() => speakPart(ERICC_PARTS.find((p) => p.id === part))}
                    >
                      Réécouter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3>Mobilité</h3>
              <p className="lead">
                n = {mob.n} solides mobiles · N₅ = {mob.Nm5} pivots
              </p>
              <div className="coords">
                M = 6×n − Σ(m·N_m) = 6×{mob.n} − 5×{mob.Nm5} = <strong>{mob.M}</strong> ddl
              </div>
              <p className="lead" style={{ marginTop: 12 }}>
                Architecture série RRRRR. L’ouverture de pince est un actionneur de préhension, pas un
                6ᵉ axe d’orientation du bras.
              </p>
              <div className="viz-card" style={{ marginTop: 16 }}>
                <header>
                  <span>Schéma profil · repère</span>
                  <span>XZ</span>
                </header>
                <EriccProfile q={qs} />
              </div>
            </div>
          </div>
        )}

        {tab === "motors" && (
          <div className="motors-lab">
            <div className="panel motors-main">
              <div className="arch-ornament" aria-hidden />
              <p className="arch-kicker">Module 03 · Identification</p>
              <h2>Motorisation</h2>
              <p className="lead">
                Clique un axe pour lire son rôle. À droite : couplage des deux moteurs pas à pas du
                poignet (A &amp; B) en 3D.
              </p>
              <table className="table motors-table">
                <thead>
                  <tr>
                    <th>Articulation</th>
                    <th>Actionneur</th>
                  </tr>
                </thead>
                <tbody>
                  {ERICC_MOTORS.map((m) => (
                    <tr
                      key={m.id}
                      className={`clickable ${motor === m.id ? "selected" : ""}`}
                      onClick={() => setMotor(m.id)}
                    >
                      <td>{m.axis}</td>
                      <td>
                        <span className={`motor-badge ${m.type === "MCC" ? "mcc" : "step"}`}>
                          {m.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="arch-card" style={{ marginTop: 14 }}>
                <p className="credits-label">Rôle</p>
                <h3>{ERICC_MOTORS.find((m) => m.id === motor)?.axis}</h3>
                <p>{ERICC_MOTORS.find((m) => m.id === motor)?.role}</p>
              </div>
            </div>

            <div className="panel motors-couple">
              <p className="arch-kicker">Q4 · Couplage poignet</p>
              <h3>Moteurs pas à pas A &amp; B</h3>
              <p className="lead">
                Même sens → inclinaison (A+B). Sens opposés → rotation (A−B). Change le sens : la
                scène 3D réagit.
              </p>

              <div className="couple-controls">
                <label>
                  Moteur A
                  <div className="sense-row">
                    {[-1, 0, 1].map((v) => (
                      <button
                        key={`a-${v}`}
                        type="button"
                        className={`sense-btn ${stepA === v ? "active a" : ""}`}
                        onClick={() => setStepA(v)}
                      >
                        {v > 0 ? "Sens +" : v < 0 ? "Sens −" : "Arrêt"}
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  Moteur B
                  <div className="sense-row">
                    {[-1, 0, 1].map((v) => (
                      <button
                        key={`b-${v}`}
                        type="button"
                        className={`sense-btn ${stepB === v ? "active b" : ""}`}
                        onClick={() => setStepB(v)}
                      >
                        {v > 0 ? "Sens +" : v < 0 ? "Sens −" : "Arrêt"}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="viz-card" style={{ marginTop: 14 }}>
                <header>
                  <span>Couplage 3D · live</span>
                  <span>
                    A={stepA} · B={stepB}
                  </span>
                </header>
                <div className="lab-canvas-wrap couple-canvas">
                  <WristCoupleStage stepA={stepA} stepB={stepB} />
                </div>
              </div>

              <div className="couple-math">
                <div>
                  <span className="credits-label">Inclinaison ∝ A + B</span>
                  <strong className={stepA + stepB !== 0 ? "hot" : ""}>{stepA + stepB}</strong>
                </div>
                <div>
                  <span className="credits-label">Rotation ∝ A − B</span>
                  <strong className={stepA - stepB !== 0 ? "hot" : ""}>{stepA - stepB}</strong>
                </div>
              </div>
              <p className="lead" style={{ marginTop: 10 }}>
                {stepA === 0 && stepB === 0
                  ? "Les deux moteurs sont à l’arrêt."
                  : stepA + stepB !== 0 && stepA - stepB === 0
                    ? "Même sens → contribution d’inclinaison pure."
                    : stepA - stepB !== 0 && stepA + stepB === 0
                      ? "Sens opposés → contribution de rotation pure."
                      : "Commandes mixtes → inclinaison et rotation combinées."}
              </p>
            </div>
          </div>
        )}

        {tab === "sensors" && (() => {
          const activeSensor = ERICC_SENSORS.find((s) => s.id === sensor) || ERICC_SENSORS[2];
          const angleNow = q[activeSensor.joint];
          const w = omega();
          return (
            <div className="sensors-lab">
              <div className="panel sensors-main">
                <div className="arch-ornament" aria-hidden />
                <div className="arch-head">
                  <div>
                    <p className="arch-kicker">Module 04 · Retour angulaire</p>
                    <h2>Capteurs O1 / O2 / O3</h2>
                    <p className="lead">
                      Repère les trois axes sur le bras 3D. Sélectionne un capteur : l’articulation
                      s’allume et la voix explique.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`voice-toggle ${voiceOn ? "on" : ""}`}
                    onClick={() => {
                      setVoiceOn((v) => {
                        if (v && typeof window !== "undefined") window.speechSynthesis?.cancel();
                        return !v;
                      });
                    }}
                  >
                    <span className="voice-dot" aria-hidden />
                    {voiceOn ? "Voix ON" : "Voix OFF"}
                  </button>
                </div>

                <div className="sensors-layout">
                  <div className="viz-card sensors-3d">
                    <header>
                      <span>Repérage 3D · axe actif</span>
                      <span>
                        {activeSensor.code} — {activeSensor.name}
                      </span>
                    </header>
                    <div className="lab-canvas-wrap sensors-canvas">
                      <EriccSensorsStage q={qs} highlight={activeSensor.highlight} />
                    </div>
                    <div className="sensor-picks">
                      {ERICC_SENSORS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`sensor-pick ${sensor === s.id ? "active" : ""}`}
                          onClick={() => selectSensor(s.id)}
                        >
                          <strong>{s.code}</strong>
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="sensor-live">
                      {activeSensor.code} — {activeSensor.desc} Angle calculé :{" "}
                      <strong>{angleNow.toFixed(1)}°</strong>
                    </p>
                  </div>

                  <div className="sensors-side">
                    <div className="arch-card">
                      <p className="credits-label">Capteur sélectionné</p>
                      <h3>
                        {activeSensor.code} — {activeSensor.name}
                      </h3>
                      <p>{activeSensor.desc}</p>
                      <div className="sensor-angle-big">
                        <span className="credits-label">Angle du modèle</span>
                        <strong>{angleNow.toFixed(1)}°</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginTop: 12 }}
                        onClick={() => speakPart(activeSensor)}
                      >
                        Réécouter
                      </button>
                    </div>

                    <div className="panel sensors-joint" style={{ margin: 0, padding: 14 }}>
                      <p className="credits-label">Bouger l’axe (consigne)</p>
                      <label className="sensor-slider">
                        {activeSensor.code} · θ
                        <input
                          type="range"
                          min={ERICC_LIMITS[activeSensor.joint].min}
                          max={ERICC_LIMITS[activeSensor.joint].max}
                          step={1}
                          value={q[activeSensor.joint]}
                          onChange={(e) => setJoint(activeSensor.joint, Number(e.target.value))}
                        />
                        <span>{q[activeSensor.joint].toFixed(0)}°</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel sensors-right">
                <p className="arch-kicker">Position et vitesse estimée</p>
                <h3>Retour O1 · O2 · O3</h3>
                <p className="lead">
                  Angles issus du modèle (simulé). Capture deux états pour estimer ω ≈ Δθ / Δt.
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Axe</th>
                      <th>Angle du modèle</th>
                      <th>Retour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERICC_SENSORS.map((s) => (
                      <tr
                        key={s.id}
                        className={`clickable ${sensor === s.id ? "selected" : ""}`}
                        onClick={() => selectSensor(s.id)}
                      >
                        <td>
                          {s.code} — {s.name}
                        </td>
                        <td>{q[s.joint].toFixed(1)}°</td>
                        <td>Simulé</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="capture-row">
                  <button
                    className={`btn ${capA ? "btn-ghost capture-ok" : "btn-primary"}`}
                    type="button"
                    onClick={() => {
                      setCapA({ t: Date.now(), q: { ...q } });
                      setLogs((L) => ["[cap] Instant A enregistré", ...L].slice(0, 40));
                    }}
                  >
                    Capturer A{capA ? " ✓" : ""}
                  </button>
                  <button
                    className={`btn ${capB ? "btn-ghost capture-ok" : "btn-ghost"}`}
                    type="button"
                    onClick={() => {
                      setCapB({ t: Date.now(), q: { ...q } });
                      setLogs((L) => ["[cap] Instant B enregistré", ...L].slice(0, 40));
                    }}
                  >
                    Capturer B{capB ? " ✓" : ""}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setCapA(null);
                      setCapB(null);
                    }}
                  >
                    Effacer
                  </button>
                </div>

                <div className="omega-panel">
                  <p className="credits-label">Vitesse angulaire estimée</p>
                  {w ? (
                    <div className="omega-grid">
                      <div>
                        <span>Δt</span>
                        <strong>{w.dt} s</strong>
                      </div>
                      <div>
                        <span>ω₁</span>
                        <strong>{w.o1} °/s</strong>
                      </div>
                      <div>
                        <span>ω₂</span>
                        <strong>{w.o2} °/s</strong>
                      </div>
                      <div>
                        <span>ω₃</span>
                        <strong>{w.o3} °/s</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="lead" style={{ marginTop: 8 }}>
                      Capture A, bouge un axe, puis capture B.
                    </p>
                  )}
                </div>

                <p className="sensor-note">
                  Estimation logicielle entre deux clics — pas de tachymètre réel, ni de boucle
                  fermée matériel. Module pédagogique.
                </p>
              </div>
            </div>
          );
        })()}

        {tab === "pick" && (
          <div className="pick-lab">
            <PickPlaceSim
              onEriccPose={(pose) => {
                setQ((prev) => ({ ...prev, ...pose }));
                setPickStep((s) => Math.max(s, 1));
              }}
            />
            <div className="viz-card" style={{ marginTop: 16, minHeight: 340 }}>
              <header>
                <span>Bras ERICC 3D · synchronisé au cycle</span>
                <span>THREE.JS</span>
              </header>
              <div className="lab-canvas-wrap" style={{ height: 320 }}>
                <EriccLabStage q={qs} />
              </div>
            </div>
          </div>
        )}

        {tab === "two" && <TwoRobotsSim />}

        {tab === "learn" && (
          <LearnTrajSim q={q} setQ={setQ} onPointsChange={(pts) => setLearnProg(pts)} />
        )}

        {tab === "valid" && (
          <div className="panel">
            <h2>Validation EP — checklist</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Livrable</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Architecture + schéma", "OK simulé"],
                  ["Motorisation + couplage poignet", "OK"],
                  ["Capteurs + vitesses estimées", capA && capB ? "OK" : "À capturer"],
                  ["MGD / matrice T₀G", "OK"],
                  ["MGI partiel", mgiMsg.startsWith("OK") ? "OK" : "À lancer"],
                  ["Cycle prise-dépose", pickStep > 0 ? "Parcouru" : "À faire"],
                  ["Apprentissage trajectoire", learnProg.length ? `${learnProg.length} pts` : "Vide"],
                ].map(([a, b]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td className={b.includes("OK") || b.includes("Parcouru") || b.includes("pts") ? "status-ok" : "status-warn"}>
                      {b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "console" && (
          <EriccTerminal q={q} setQ={setQ} points={learnProg} setPoints={setLearnProg} />
        )}
      </div>
    </div>
  );
}
