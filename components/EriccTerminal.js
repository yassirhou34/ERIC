"use client";

import { useEffect, useRef, useState } from "react";
import { ERICC_DEFAULT, ERICC_LIMITS } from "@/lib/ericc";

const HELP = `Commandes disponibles (simulation pédagogique — aucun matériel) :
  CO              Affiche les angles virtuels
  I / IM / IP     Retour aux références (0,30,30,0,60,25)
  RA m,d,v        Rotation absolue moteur m (1..3) vers d° (v ignorée)
  RR m,i,v        Rotation relative moteur m += i°
  OP a            Ouverture pince a mm (0..55)
  FP f            Fermeture (consigne ouverture f mm)
  VAL             Mémorise la posture actuelle
  EFF             Efface le dernier point
  P               Pointeur au début du programme
  L               Lit / anime les points enregistrés
  AIDE            Cette aide
Ex. CO ; RA 2,45,10 ; RR 3,5,10 ; OP 25 ; VAL`;

function clampJoint(key, val) {
  const lim = ERICC_LIMITS[key];
  if (!lim) return val;
  return Math.max(lim.min, Math.min(lim.max, val));
}

function formatCO(q) {
  return [
    "CO VIRTUEL [hypothèses]",
    `Lacet θ1=${q.theta1}°  Épaule θ2=${q.theta2}°  Coude θ3=${q.theta3}°`,
    `Pince rotation θ4=${q.theta4}°  inclinaison θ5=${q.theta5}°`,
    `Ouverture=${q.grip} mm — pas une lecture de capteurs.`,
  ].join("\n");
}

const MOTOR_MAP = {
  1: "theta1",
  2: "theta2",
  3: "theta3",
};

export default function EriccTerminal({ q, setQ, points, setPoints }) {
  const [lines, setLines] = useState([
    "ericc / terminal · session locale",
    "Les commandes ne pilotent aucun matériel.",
    formatCO(ERICC_DEFAULT),
  ]);
  const [input, setInput] = useState("");
  const [ptr, setPtr] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const playRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const echo = (cmd, out) => {
    setLines((L) => [...L, `> ${cmd}`, ...(Array.isArray(out) ? out : [out])].slice(-200));
  };

  const stopPlay = () => {
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
  };

  const runOne = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;
    const up = cmd.toUpperCase();
    const parts = up.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    const op = parts[0];

    if (op === "AIDE" || op === "HELP" || op === "?") {
      echo(cmd, HELP.split("\n"));
      return;
    }

    if (op === "CO") {
      echo(cmd, formatCO(q).split("\n"));
      return;
    }

    if (op === "I" || op === "IM" || op === "IP") {
      stopPlay();
      setQ({ ...ERICC_DEFAULT });
      echo(cmd, [
        `${op} — retour VIRTUEL aux six références choisies (0..60°) ; aucun référencement physique effectué.`,
        formatCO(ERICC_DEFAULT),
      ]);
      return;
    }

    if (op === "OP" || op === "FP") {
      const a = Number(parts[1]);
      if (Number.isNaN(a)) {
        echo(cmd, `ERREUR : ${op} attend un nombre (mm).`);
        return;
      }
      const grip = clampJoint("grip", a);
      setQ((prev) => ({ ...prev, grip }));
      echo(cmd, [
        `${op} VIRTUEL — ouverture consigne ${grip} mm (limites 0..55).`,
        "Fermeture idéale sans vraie force ni objet.",
      ]);
      return;
    }

    if (op === "RA") {
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const key = MOTOR_MAP[m];
      if (!key || Number.isNaN(d)) {
        echo(cmd, "ERREUR : RA m,d,v — m∈{1,2,3}, d angle absolu.");
        return;
      }
      const val = clampJoint(key, d);
      setQ((prev) => ({ ...prev, [key]: val }));
      echo(cmd, [
        `RA VIRTUEL — M${m} → ${val}° (vitesse ignorée, non calibrée).`,
        "M4/M5 : différentiel poignet, non mappés 1:1 ici.",
      ]);
      return;
    }

    if (op === "RR") {
      const m = Number(parts[1]);
      const inc = Number(parts[2]);
      const key = MOTOR_MAP[m];
      if (!key || Number.isNaN(inc)) {
        echo(cmd, "ERREUR : RR m,i,v — m∈{1,2,3}, i incrément °.");
        return;
      }
      const val = clampJoint(key, q[key] + inc);
      setQ((prev) => ({ ...prev, [key]: clampJoint(key, prev[key] + inc) }));
      echo(cmd, [`RR VIRTUEL — M${m} += ${inc}° → ${val}°.`, "v ignorée."]);
      return;
    }

    if (op === "VAL") {
      const next = [...points, { ...q }];
      setPoints(next);
      setPtr(Math.max(0, next.length - 1));
      echo(cmd, `VAL — point #${next.length} mémorisé (θ=[${q.theta1},${q.theta2},${q.theta3},${q.theta4},${q.theta5}], grip=${q.grip}).`);
      return;
    }

    if (op === "EFF") {
      if (!points.length) {
        echo(cmd, "ERREUR : aucun point à effacer.");
        return;
      }
      const next = points.slice(0, -1);
      setPoints(next);
      setPtr(0);
      echo(cmd, `EFF — dernier point effacé. Reste ${next.length} point(s).`);
      return;
    }

    if (op === "P") {
      stopPlay();
      setPtr(0);
      if (points[0]) setQ({ ...points[0] });
      echo(cmd, points.length ? "P — pointeur au début du programme." : "P — aucun point ; pointeur à 0.");
      return;
    }

    if (op === "L") {
      if (!points.length) {
        echo(cmd, "ERREUR : aucun point enregistré.");
        return;
      }
      stopPlay();
      let i = 0;
      setPtr(0);
      setQ({ ...points[0] });
      echo(cmd, `L — lecture de ${points.length} point(s) (interpolation pas-à-pas virtuelle).`);
      playRef.current = setInterval(() => {
        i += 1;
        if (i >= points.length) {
          stopPlay();
          setPtr(points.length - 1);
          setLines((L) => [...L, "L — fin de lecture."].slice(-200));
          return;
        }
        setPtr(i);
        setQ({ ...points[i] });
      }, 550);
      return;
    }

    echo(cmd, `ERREUR : commande inconnue « ${op} ». Tape AIDE.`);
  };

  const execute = (raw = input) => {
    const chunks = raw.split(";").map((s) => s.trim()).filter(Boolean);
    if (!chunks.length) return;
    chunks.forEach(runOne);
    setInput("");
  };

  const quick = ["CO", "IM", "IP", "OP 25", "VAL", "P", "L", "AIDE"];

  return (
    <div className="term-lab">
      <div className="panel pp-main term-main">
        <div className="arch-ornament" aria-hidden />
        <div className="term-head">
          <div>
            <p className="arch-kicker">03 · Interface de commande</p>
            <h2>Terminal virtuel</h2>
            <p className="lead">
              Teste les instructions ERICC dans une interface pédagogique. Les commandes ne pilotent
              aucun matériel.
            </p>
          </div>
          <span className="term-session">● Session locale</span>
        </div>

        <div className="term-layout">
          <div className="term-window">
            <div className="term-titlebar">
              <span>ericc / terminal</span>
              <span className="term-online">● en ligne</span>
            </div>
            <div className="term-scroll" ref={scrollRef}>
              {lines.map((line, i) => (
                <div key={i} className={line.startsWith(">") ? "term-in" : line.startsWith("ERREUR") ? "term-err" : ""}>
                  {line}
                </div>
              ))}
            </div>
            <form
              className="term-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                execute();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex. CO ; RA 2,45,10 ; RR 3,5,10 ; OP 25 ; VAL"
                spellCheck={false}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary">
                Exécuter
              </button>
            </form>
          </div>

          <aside className="term-side">
            <p className="credits-label">Commandes rapides</p>
            <p className="lead" style={{ marginBottom: 10 }}>
              Lance une instruction en un clic, ou écris la tienne.
            </p>
            <div className="term-quick">
              {quick.map((c) => (
                <button key={c} type="button" className="term-qbtn" onClick={() => execute(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="coords" style={{ marginTop: 14 }}>
              {`Points enregistrés : ${points.length}
Pointeur : ${points.length ? ptr + 1 : 0}`}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => setShowHelp((v) => !v)}
            >
              {showHelp ? "Masquer" : "Voir"} les commandes disponibles
            </button>
            {showHelp && (
              <div className="coords" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                {HELP}
              </div>
            )}
          </aside>
        </div>

        <p className="sensor-note" style={{ marginTop: 14 }}>
          ERICC STUDIO · Polytech Marseille · 2026 — Étude documentaire, sans liaison au robot réel.
        </p>
      </div>
    </div>
  );
}
