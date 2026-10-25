"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import JointPanel from "./JointPanel";
import { NaoLabStage } from "./three/DynamicStages";
import {
  NAO_ARM_LIMITS,
  NAO_DEFAULT,
  NAO_DOF,
  NAO_MODULES,
  NAO_OFFSETS,
  NAO_PARTS,
  NAO_POSTURES,
  NAO_SENSORS,
  naoLeftArmFromRight,
  naoRightArmMGD,
  naoRightArmMGI,
} from "@/lib/nao";
import { useSmoothJoints } from "@/lib/useSmoothJoints";

export default function NaoLab() {
  const [tab, setTab] = useState("board");
  const [q, setQ] = useState(NAO_DEFAULT);
  const qs = useSmoothJoints(q, 14);
  const [part, setPart] = useState("rarm");
  const [sensor, setSensor] = useState("sonar");
  const [voiceOn, setVoiceOn] = useState(true);
  const [sonar, setSonar] = useState({ left: false, right: false, center: false });
  const [posture, setPosture] = useState("StandInit");
  const [mgiTarget, setMgiTarget] = useState({ x: 120, y: 140, z: 80 });
  const [mgiMsg, setMgiMsg] = useState("Prêt pour le MGI numérique (WristYaw fixé).");
  const [logs, setLogs] = useState(["[naoqi] Session virtuelle — lab pédagogique"]);
  const [termIn, setTermIn] = useState("");
  const termRef = useRef(null);

  const mgd = useMemo(() => naoRightArmMGD(qs), [qs]);
  const mgdExact = useMemo(() => naoRightArmMGD(q), [q]);
  const mgdLeft = useMemo(() => naoLeftArmFromRight(mgdExact), [mgdExact]);

  const speak = useCallback(
    (text) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      if (!voiceOn || !text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 1.02;
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.find((v) => v.lang?.startsWith("fr"));
      if (fr) u.voice = fr;
      window.speechSynthesis.speak(u);
    },
    [voiceOn]
  );

  const setJoint = (key, val) => {
    setQ((p) => ({ ...p, [key]: val }));
    setLogs((L) => [`[joint] ${key}=${val}`, ...L].slice(0, 50));
  };

  const applyPosture = (name) => {
    const p = NAO_POSTURES[name];
    if (!p) return;
    setPosture(name);
    setQ({ ...p.q });
    setLogs((L) => [`[posture] ${name}`, ...L].slice(0, 50));
    speak(`Posture ${name}. ${p.desc}`);
  };

  const selectPart = (id) => {
    setPart(id);
    const p = NAO_PARTS.find((x) => x.id === id);
    speak(p?.speech);
  };

  const selectSensor = (id) => {
    setSensor(id);
    const s = NAO_SENSORS.find((x) => x.id === id);
    speak(s?.speech);
  };

  const runMGI = () => {
    const res = naoRightArmMGI(mgiTarget, q);
    setQ(res.q);
    setMgiMsg(res.message);
    setLogs((L) => [`[mgi] résidu ${res.residual.toFixed(1)} mm`, ...L].slice(0, 50));
  };

  const runTerm = (raw) => {
    const cmd = (raw || termIn).trim();
    if (!cmd) return;
    const up = cmd.toUpperCase();
    let out = "";
    if (up === "HELP" || up === "AIDE") {
      out = "Commandes : CO · POSTURE StandInit|Stand|StandZero · SAY texte · SONAR L|C|R · RESET · AIDE";
    } else if (up === "CO") {
      out = `CO  SP=${q.RShoulderPitch} SR=${q.RShoulderRoll} EY=${q.RElbowYaw} ER=${q.RElbowRoll} WY=${q.RWristYaw}`;
    } else if (up.startsWith("POSTURE")) {
      const name = cmd.split(/\s+/)[1] || "StandInit";
      const key = Object.keys(NAO_POSTURES).find((k) => k.toLowerCase() === name.toLowerCase());
      if (key) {
        applyPosture(key);
        out = `POSTURE ${key} appliquée (virtuel).`;
      } else out = "ERREUR : posture inconnue.";
    } else if (up.startsWith("SAY ")) {
      const t = cmd.slice(4);
      speak(t);
      out = `Say: ${t}`;
    } else if (up.startsWith("SONAR")) {
      const a = up.split(/\s+/)[1];
      const map = { L: "left", C: "center", R: "right" };
      const k = map[a];
      if (k) {
        const nextVal = !sonar[k];
        setSonar((s) => ({ ...s, [k]: nextVal }));
        out = `Sonar ${k} = ${nextVal}`;
      } else out = "Usage : SONAR L|C|R";
    } else if (up === "RESET") {
      setQ({ ...NAO_DEFAULT });
      out = "RESET — StandInit approximatif.";
    } else {
      out = `ERREUR : « ${cmd} ». Tape AIDE.`;
    }
    setLogs((L) => [`> ${cmd}`, out, ...L].slice(0, 50));
    setTermIn("");
  };

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = 0;
  }, [logs]);

  const active = NAO_MODULES.find((t) => t.id === tab);
  const activeIdx = NAO_MODULES.findIndex((t) => t.id === tab);
  const activePart = NAO_PARTS.find((p) => p.id === part);
  const activeSensor = NAO_SENSORS.find((s) => s.id === sensor);
  const anySonar = sonar.left || sonar.right || sonar.center;

  return (
    <div className="atelier nao-theme">
      <aside className="atelier-rail">
        <Link href="/" className="back">
          ← Maison
        </Link>
        <div>
          <div className="title">NAO</div>
          <div className="status">Atelier live</div>
        </div>
        <nav>
          {NAO_MODULES.map((t, i) => (
            <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="atelier-main">
        <div className="lead-block">
          <h1>{active?.label}</h1>
          <p>Module {String(activeIdx + 1).padStart(2, "0")} · humanoïde · Polytech GII-4A</p>
        </div>

        {(tab === "board" || tab === "mgd") && (
          <div className="panel-grid">
            <JointPanel
              limits={NAO_ARM_LIMITS}
              values={q}
              onChange={setJoint}
              onReset={() => setQ(NAO_DEFAULT)}
              accentNote="Bras droit NAO — angles Choregraphe · animation live."
            />
            <div style={{ display: "grid", gap: 14 }}>
              <div className="live-meter">
                <div className="cell">
                  <small>Hand X</small>
                  <strong>{mgd.hand.x.toFixed(1)}</strong>
                </div>
                <div className="cell">
                  <small>Hand Y</small>
                  <strong>{mgd.hand.y.toFixed(1)}</strong>
                </div>
                <div className="cell">
                  <small>Hand Z</small>
                  <strong>{mgd.hand.z.toFixed(1)}</strong>
                </div>
              </div>
              <div className="viz-card" style={{ minHeight: 420 }}>
                <header>
                  <span>NAO 3D · bras piloté</span>
                  <span>THREE.JS</span>
                </header>
                <div className="lab-canvas-wrap" style={{ height: 400 }}>
                  <NaoLabStage q={qs} />
                </div>
              </div>
              <div className="two-col">
                <div className="viz-card" style={{ minHeight: 280 }}>
                  <header>
                    <span>Chaîne bras · schéma</span>
                    <span>YZ</span>
                  </header>
                  <NaoArmSvg mgd={mgd} />
                </div>
                <div className="coords">
                  {`Main (mm, repère torse approx.)
x=${mgd.hand.x.toFixed(1)} y=${mgd.hand.y.toFixed(1)} z=${mgd.hand.z.toFixed(1)}
portée ≈ ${mgd.reach.toFixed(1)} mm

Shoulder → Elbow → Hand
consigne: SP ${q.RShoulderPitch}° · SR ${q.RShoulderRoll}°
EY ${q.RElbowYaw}° · ER ${q.RElbowRoll}° · WY ${q.RWristYaw}°

Offsets : UpperArm ${NAO_OFFSETS.UpperArmLength} · LowerArm ${NAO_OFFSETS.LowerArmLength} mm`}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "dof" && (
          <div className="nao-arch">
            <div className="panel nao-arch-main">
              <div className="arch-ornament" aria-hidden />
              <div className="arch-head">
                <div>
                  <p className="arch-kicker">Module 02 · Chaîne humanoïde</p>
                  <h2>Architecture et degrés de liberté</h2>
                  <p className="lead">Sélectionne une partie : la voix explique. Total salle : {NAO_DOF.totalRoom} ddl.</p>
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

              <div className="nao-arch-layout">
                <div className="viz-card">
                  <header>
                    <span>Silhouette · pièce active</span>
                    <span>{activePart?.name}</span>
                  </header>
                  <NaoBodySvg active={part} onSelect={selectPart} />
                </div>
                <div className="nao-side">
                  <div className="list-select arch-parts">
                    {NAO_PARTS.map((p) => (
                      <button key={p.id} type="button" className={part === p.id ? "active" : ""} onClick={() => selectPart(p.id)}>
                        <span className="arch-n">{p.n}</span>
                        <span className="arch-name">{p.name}</span>
                        <span className="nao-dof-badge">{p.dof} ddl</span>
                      </button>
                    ))}
                  </div>
                  <div className="arch-card">
                    <p className="credits-label">Élément sélectionné</p>
                    <h3>{activePart?.name}</h3>
                    <p>{activePart?.desc}</p>
                    <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => speak(activePart?.speech)}>
                      Réécouter
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <h3>Bilan mobilité</h3>
              <div className="nao-dof-grid">
                <div><span>Tête</span><strong>{NAO_DOF.head}</strong></div>
                <div><span>Bras ×2</span><strong>{NAO_DOF.arm * 2}</strong></div>
                <div><span>Jambes ×2</span><strong>{NAO_DOF.leg * 2}</strong></div>
                <div><span>Total</span><strong>{NAO_DOF.totalRoom}</strong></div>
              </div>
              <p className="lead" style={{ marginTop: 12 }}>{NAO_DOF.note}</p>
              <div className="viz-card" style={{ marginTop: 14, minHeight: 280 }}>
                <header>Bras 3D live</header>
                <div className="lab-canvas-wrap" style={{ height: 260 }}>
                  <NaoLabStage q={qs} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "postures" && (
          <div className="nao-postures">
            <div className="panel">
              <p className="arch-kicker">Module 03 · Choregraphe</p>
              <h2>Postures Stand*</h2>
              <p className="lead">Applique une posture de référence — le bras 3D suit en douceur.</p>
              <div className="nao-posture-grid">
                {Object.entries(NAO_POSTURES).map(([name, p]) => (
                  <button
                    key={name}
                    type="button"
                    className={`nao-posture-card ${posture === name ? "active" : ""}`}
                    onClick={() => applyPosture(name)}
                  >
                    <strong>{p.label}</strong>
                    <span>{p.desc}</span>
                  </button>
                ))}
              </div>
              <div className="coords" style={{ marginTop: 14 }}>
                {`Posture active : ${posture}
θ = [${q.RShoulderPitch}, ${q.RShoulderRoll}, ${q.RElbowYaw}, ${q.RElbowRoll}, ${q.RWristYaw}]°
Angles nuls ⇔ StandZero (référence MGD).`}
              </div>
            </div>
            <div className="viz-card" style={{ minHeight: 420 }}>
              <header>
                <span>Prévisualisation 3D</span>
                <span>{posture}</span>
              </header>
              <div className="lab-canvas-wrap" style={{ height: 400 }}>
                <NaoLabStage q={qs} />
              </div>
            </div>
          </div>
        )}

        {tab === "limits" && (
          <div className="panel">
            <p className="arch-kicker">Module 04 · Débattements</p>
            <h2>Limites articulaires bras droit</h2>
            <p className="lead">Bornes documentaires Choregraphe — cliquer une ligne sélectionne l’axe sur le curseur board.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Axe</th>
                  <th>Min</th>
                  <th>Courant</th>
                  <th>Max</th>
                  <th>Amplitude</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(NAO_ARM_LIMITS).map(([k, v]) => {
                  const cur = q[k];
                  const amp = v.max - v.min;
                  const pct = ((cur - v.min) / amp) * 100;
                  return (
                    <tr key={k}>
                      <td>{v.label}</td>
                      <td>{v.min}°</td>
                      <td><strong>{Number(cur).toFixed(1)}°</strong></td>
                      <td>{v.max}°</td>
                      <td>{amp.toFixed(1)}°</td>
                      <td>
                        <div className="nao-bar">
                          <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sensors" && (
          <div className="sensors-lab nao-sensors">
            <div className="panel sensors-main">
              <div className="arch-ornament" aria-hidden />
              <div className="arch-head">
                <div>
                  <p className="arch-kicker">Module 05 · Extéroception</p>
                  <h2>Capteurs NAO</h2>
                  <p className="lead">Sélectionne un capteur : description + voix. Aucun matériel connecté.</p>
                </div>
                <button
                  type="button"
                  className={`voice-toggle ${voiceOn ? "on" : ""}`}
                  onClick={() => setVoiceOn((v) => !v)}
                >
                  <span className="voice-dot" aria-hidden />
                  {voiceOn ? "Voix ON" : "Voix OFF"}
                </button>
              </div>
              <div className="nao-sensor-grid">
                {NAO_SENSORS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`nao-sensor-card ${sensor === s.id ? "active" : ""}`}
                    onClick={() => selectSensor(s.id)}
                  >
                    <strong>{s.name}</strong>
                    <span>{s.tech}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="arch-card" style={{ margin: 0 }}>
                <p className="credits-label">Capteur sélectionné</p>
                <h3>{activeSensor?.name}</h3>
                <p>{activeSensor?.desc}</p>
                <p className="sensor-note">{activeSensor?.tech}</p>
                <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => speak(activeSensor?.speech)}>
                  Réécouter
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "sonar" && (
          <div className="nao-sonar-lab">
            <div className="panel">
              <p className="arch-kicker">Module 06 · Choregraphe-like</p>
              <h2>Module Sonar</h2>
              <p className="lead">Place un obstacle virtuel — Left / Center / Right Detected. Le NAO « dit » s’il y a détection.</p>
              <div className="nao-sonar-btns">
                {[
                  ["left", "Obstacle gauche"],
                  ["center", "Obstacle centre"],
                  ["right", "Obstacle droit"],
                ].map(([k, lab]) => (
                  <button
                    key={k}
                    type="button"
                    className={`btn ${sonar[k] ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      setSonar((s) => {
                        const next = { ...s, [k]: !s[k] };
                        const any = next.left || next.right || next.center;
                        speak(any ? "Obstacle détecté." : "Silence. Aucun obstacle.");
                        return next;
                      });
                    }}
                  >
                    {lab}
                  </button>
                ))}
              </div>
              <div className="coords" style={{ marginTop: 14 }}>
                {`SonarLeftDetected = ${sonar.left}
SonarMiddleDetected = ${sonar.center}
SonarRightDetected = ${sonar.right}
Say: ${anySonar ? "Obstacle détecté" : "… (silence — aucun obstacle)"}`}
              </div>
            </div>
            <div className="viz-card">
              <header>
                <span>Radar pédagogique</span>
                <span>US</span>
              </header>
              <SonarRadar sonar={sonar} />
            </div>
          </div>
        )}

        {tab === "mgi" && (
          <div className="two-col">
            <div className="panel">
              <p className="arch-kicker">Module 08 · Inverse</p>
              <h3>MGI numérique bras droit</h3>
              <p className="lead">Impose (x,y,z) main. WristYaw fixé. Solveur amorti pédagogique (pas Paul analytique).</p>
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
                <button type="button" className="btn btn-primary" onClick={runMGI}>
                  Calculer les angles
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setMgiTarget({
                      x: +mgdExact.hand.x.toFixed(1),
                      y: +mgdExact.hand.y.toFixed(1),
                      z: +mgdExact.hand.z.toFixed(1),
                    })
                  }
                >
                  Reprendre main actuelle
                </button>
              </div>
              <p className="lead" style={{ marginTop: 12 }}>{mgiMsg}</p>
              <div className="coords" style={{ marginTop: 10 }}>
                {`Méthode Paul (cours) : pré-multiplications Aᵢ⁻¹, isolation θᵢ via ATAN2.
Ce module : vérification numérique seulement.`}
              </div>
            </div>
            <div className="panel">
              <h3>Symétrie bras gauche</h3>
              <p className="lead">MGD_G ≈ Sym_Y(MGD_D) — ShoulderOffsetY → −Y, rolls inversés.</p>
              <div className="coords">
                {`Droit  hand = (${mgdExact.hand.x.toFixed(1)}; ${mgdExact.hand.y.toFixed(1)}; ${mgdExact.hand.z.toFixed(1)})
Gauche hand ≈ (${mgdLeft.hand.x.toFixed(1)}; ${mgdLeft.hand.y.toFixed(1)}; ${mgdLeft.hand.z.toFixed(1)})`}
              </div>
              <div className="viz-card" style={{ marginTop: 14, minHeight: 300 }}>
                <header>3D live après MGI</header>
                <div className="lab-canvas-wrap" style={{ height: 280 }}>
                  <NaoLabStage q={qs} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "pepper" && (
          <div className="panel nao-pepper">
            <p className="arch-kicker">Module 09 · Extension</p>
            <h2>Extension Pepper</h2>
            <p className="lead">Même méthodologie DH / MGD / MGI — robot compagnon SoftBank.</p>
            <div className="nao-pepper-grid">
              <div className="arch-card">
                <p className="credits-label">Pepper</p>
                <h3>~121 cm · 29 kg</h3>
                <p>17 articulations · 3 roues omnidirectionnelles · tablette tactile · Choregraphe 2.5.</p>
              </div>
              <div className="arch-card">
                <p className="credits-label">Méthode TP</p>
                <h3>Validation</h3>
                <p>Angles connus → pose (MGD). Pose cible → MGI → appliquer. Contrôler les butées et singularités.</p>
              </div>
              <div className="arch-card">
                <p className="credits-label">Salle</p>
                <h3>Compte PRT</h3>
                <p>WiFi TP-Link_EF7D (salle). Pas de liaison robot dans ce lab virtuel.</p>
              </div>
            </div>
          </div>
        )}

        {tab === "console" && (
          <div className="term-lab">
            <div className="panel term-main">
              <div className="term-head">
                <div>
                  <p className="arch-kicker">Module 10 · NAOqi-like</p>
                  <h2>Console virtuelle</h2>
                  <p className="lead">Session locale — aucune commande n’atteint un robot réel.</p>
                </div>
                <span className="term-session">● Session locale</span>
              </div>
              <div className="term-layout">
                <div className="term-window">
                  <div className="term-titlebar">
                    <span>naoqi / terminal</span>
                    <span className="term-online">● en ligne</span>
                  </div>
                  <div className="term-scroll" ref={termRef}>
                    {logs.map((line, i) => (
                      <div key={i} className={line.startsWith(">") ? "term-in" : line.startsWith("ERREUR") ? "term-err" : ""}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <form
                    className="term-input-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runTerm();
                    }}
                  >
                    <input
                      value={termIn}
                      onChange={(e) => setTermIn(e.target.value)}
                      placeholder="Ex. CO · POSTURE Stand · SAY Bonjour · SONAR C"
                      spellCheck={false}
                    />
                    <button type="submit" className="btn btn-primary">
                      Exécuter
                    </button>
                  </form>
                </div>
                <aside className="term-side">
                  <p className="credits-label">Commandes rapides</p>
                  <div className="term-quick">
                    {["CO", "POSTURE StandInit", "POSTURE Stand", "SAY Bonjour", "SONAR C", "RESET", "AIDE"].map((c) => (
                      <button key={c} type="button" className="term-qbtn" onClick={() => runTerm(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NaoArmSvg({ mgd }) {
  const scale = 1.1;
  const ox = 80;
  const oy = 280;
  const map = (p) => ({ x: ox + p.y * scale, y: oy - p.z * scale });
  const s = map(mgd.shoulder);
  const e = map(mgd.elbow);
  const h = map(mgd.hand);
  return (
    <svg viewBox="0 0 420 340" style={{ width: "100%", height: "100%" }}>
      <rect width="420" height="340" fill="#f7faf8" />
      <polyline
        points={`${s.x},${s.y} ${e.x},${e.y} ${h.x},${h.y}`}
        fill="none"
        stroke="#0b3d2e"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {[s, e, h].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="7" fill="#fff" stroke={i === 2 ? "#c8102e" : "#0b3d2e"} strokeWidth="2" />
      ))}
      <text x="16" y="28" fill="#5c5852" fontSize="12">
        Vue pédagogique YZ (épaule → main)
      </text>
    </svg>
  );
}

function NaoBodySvg({ active, onSelect }) {
  const zones = [
    { id: "head", x: 150, y: 28, w: 60, h: 48 },
    { id: "torso", x: 140, y: 90, w: 80, h: 100 },
    { id: "larm", x: 70, y: 95, w: 55, h: 110 },
    { id: "rarm", x: 235, y: 95, w: 55, h: 110 },
    { id: "lleg", x: 145, y: 200, w: 35, h: 110 },
    { id: "rleg", x: 185, y: 200, w: 35, h: 110 },
  ];
  return (
    <svg viewBox="0 0 360 340" className="pp-svg" style={{ background: "#f7faf8" }}>
      {zones.map((z) => (
        <rect
          key={z.id}
          x={z.x}
          y={z.y}
          width={z.w}
          height={z.h}
          rx="10"
          fill={active === z.id ? "rgba(11,61,46,0.35)" : "rgba(11,61,46,0.08)"}
          stroke={active === z.id ? "#0b3d2e" : "#9bb0a6"}
          strokeWidth={active === z.id ? 2.5 : 1.2}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(z.id)}
        />
      ))}
      <text x="155" y="56" fontSize="11" fill="#0b3d2e" fontWeight="700">Tête</text>
      <text x="158" y="145" fontSize="11" fill="#0b3d2e">Torse</text>
      <text x="78" y="150" fontSize="10" fill="#0b3d2e">G</text>
      <text x="252" y="150" fontSize="10" fill="#0b3d2e">D</text>
      <text x="120" y="320" fontSize="11" fill="#666">Clique une zone</text>
    </svg>
  );
}

function SonarRadar({ sonar }) {
  return (
    <svg viewBox="0 0 420 320" className="pp-svg">
      <rect width="420" height="320" fill="#f0f7f4" />
      <circle cx="210" cy="220" r="140" fill="none" stroke="#c5d4ce" strokeDasharray="4 6" />
      <circle cx="210" cy="220" r="90" fill="none" stroke="#c5d4ce" strokeDasharray="4 6" />
      <circle cx="210" cy="220" r="45" fill="none" stroke="#c5d4ce" strokeDasharray="4 6" />
      <ellipse cx="210" cy="230" rx="36" ry="48" fill="#0b3d2e" opacity="0.85" />
      <circle cx="210" cy="200" r="18" fill="#f5f5f5" />
      {[
        { on: sonar.left, a: -50, label: "L" },
        { on: sonar.center, a: 0, label: "C" },
        { on: sonar.right, a: 50, label: "R" },
      ].map((b) => {
        const rad = ((b.a - 90) * Math.PI) / 180;
        const x = 210 + Math.cos(rad) * 110;
        const y = 220 + Math.sin(rad) * 110;
        return (
          <g key={b.label}>
            <circle cx={x} cy={y} r={b.on ? 22 : 14} fill={b.on ? "#e67e22" : "#9aa0a6"} opacity={b.on ? 0.9 : 0.35} />
            <text x={x - 4} y={y + 4} fontSize="11" fill="#fff" fontWeight="700">
              {b.label}
            </text>
          </g>
        );
      })}
      <text x="24" y="28" fontSize="12" fill="#5c5852">
        Obstacles virtuels · ultrason
      </text>
    </svg>
  );
}
