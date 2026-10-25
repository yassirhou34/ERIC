"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DH_DEFAULT_PARAMS,
  DH_DEFAULT_Q,
  DH_TABLE_META,
  dhForward,
  dhInverseNumeric,
  dhJacobianTrans,
  singularityIndicator,
  dhAutotests,
  dhVerticalPose,
  sampleDhVolume,
  formatMatrix,
  rotationOrthoError,
} from "@/lib/ericcDh";

const MATRIX_KEYS = [
  { id: "T01", i: 0 },
  { id: "T12", i: 1 },
  { id: "T23", i: 2 },
  { id: "T34", i: 3 },
  { id: "T45", i: 4 },
  { id: "T05", i: -1 },
];

function MatrixGrid({ T }) {
  const cells = formatMatrix(T);
  return (
    <div className="dh-matrix">
      {cells.flat().map((v, i) => (
        <span key={i} className={i % 4 === 3 && i < 12 ? "pos" : ""}>
          {v}
        </span>
      ))}
    </div>
  );
}

function FramesSvg({ frames }) {
  const xs = frames.map((f) => f.origin[0]);
  const zs = frames.map((f) => f.origin[2]);
  const pad = 40;
  const w = 420;
  const h = 280;
  const minX = Math.min(...xs, 0) - 40;
  const maxX = Math.max(...xs, 0) + 40;
  const minZ = Math.min(...zs, 0) - 40;
  const maxZ = Math.max(...zs, 0) + 40;
  const sx = (w - 2 * pad) / Math.max(1, maxX - minX);
  const sz = (h - 2 * pad) / Math.max(1, maxZ - minZ);
  const s = Math.min(sx, sz);
  const mapX = (x) => pad + (x - minX) * s;
  const mapZ = (z) => h - pad - (z - minZ) * s;

  return (
    <svg className="dh-frames-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Repères DH projetés">
      <rect x="0" y="0" width={w} height={h} fill="#f7f4ef" />
      {frames.slice(0, -1).map((f, i) => {
        const a = f.origin;
        const b = frames[i + 1].origin;
        return (
          <line
            key={`l-${i}`}
            x1={mapX(a[0])}
            y1={mapZ(a[2])}
            x2={mapX(b[0])}
            y2={mapZ(b[2])}
            stroke="#c8102e"
            strokeWidth="2.5"
          />
        );
      })}
      {frames.map((f, i) => {
        const T = f.T;
        const o = f.origin;
        const axLen = 55;
        const x2 = o[0] + T[0][0] * axLen;
        const z2x = o[2] + T[2][0] * axLen;
        const y2 = o[0] + T[0][1] * axLen;
        const z2y = o[2] + T[2][1] * axLen;
        const z2 = o[0] + T[0][2] * axLen;
        const z2z = o[2] + T[2][2] * axLen;
        return (
          <g key={`f-${i}`}>
            <line x1={mapX(o[0])} y1={mapZ(o[2])} x2={mapX(x2)} y2={mapZ(z2x)} stroke="#e11" strokeWidth="1.8" />
            <line x1={mapX(o[0])} y1={mapZ(o[2])} x2={mapX(y2)} y2={mapZ(z2y)} stroke="#1a8f4a" strokeWidth="1.8" />
            <line x1={mapX(o[0])} y1={mapZ(o[2])} x2={mapX(z2)} y2={mapZ(z2z)} stroke="#2f6fed" strokeWidth="1.8" />
            <circle cx={mapX(o[0])} cy={mapZ(o[2])} r="4" fill="#111" />
            <text x={mapX(o[0]) + 6} y={mapZ(o[2]) - 6} fontSize="11" fill="#333">
              R{i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function VolumeSvg({ sample }) {
  if (!sample?.pts?.length) {
    return <div className="dh-volume-empty">Clique « Échantillonner le volume ».</div>;
  }
  const w = 420;
  const h = 280;
  const pad = 36;
  const { rMin, rMax, zMin, zMax, pts } = sample;
  const mapR = (r) => pad + ((r - rMin) / Math.max(1e-6, rMax - rMin)) * (w - 2 * pad);
  const mapZ = (z) => h - pad - ((z - zMin) / Math.max(1e-6, zMax - zMin)) * (h - 2 * pad);
  return (
    <svg className="dh-frames-svg" viewBox={`0 0 ${w} ${h}`}>
      <rect width={w} height={h} fill="#f5f8f7" />
      <text x={pad} y={18} fontSize="11" fill="#666">
        z ↑
      </text>
      <text x={w - 70} y={h - 10} fontSize="11" fill="#666">
        r (mm) →
      </text>
      {pts.map((p, i) => (
        <circle key={i} cx={mapR(p.r)} cy={mapZ(p.z)} r="1.6" fill="#0f766e" opacity="0.55" />
      ))}
    </svg>
  );
}

export default function EriccDhExtension({ qSlider }) {
  const [params, setParams] = useState({ ...DH_DEFAULT_PARAMS });
  const [qDh, setQDh] = useState([...DH_DEFAULT_Q]);
  const [matKey, setMatKey] = useState("T34");
  const [mgiTarget, setMgiTarget] = useState({ x: 400, y: 0, z: 320 });
  const [mgiMsg, setMgiMsg] = useState("Prêt pour le calcul inverse DH.");
  const [mgiResult, setMgiResult] = useState(null);
  const [tests, setTests] = useState(null);
  const [epTab, setEpTab] = useState("ref");
  const [epAnalysis, setEpAnalysis] = useState(null);
  const [volume, setVolume] = useState(null);

  const fwd = useMemo(() => dhForward(qDh, params), [qDh, params]);
  const ortho = useMemo(() => rotationOrthoError(fwd.T05), [fwd]);
  const J = useMemo(() => dhJacobianTrans(qDh, params), [qDh, params]);
  const sing = useMemo(() => singularityIndicator(J), [J]);

  const selectedT = useMemo(() => {
    const meta = MATRIX_KEYS.find((m) => m.id === matKey);
    if (!meta) return fwd.T05;
    if (meta.i < 0) return fwd.T05;
    return fwd.Ti[meta.i];
  }, [matKey, fwd]);

  const setParam = (key, val) => setParams((p) => ({ ...p, [key]: Number(val) }));
  const setQi = (i, val) => setQDh((prev) => prev.map((v, k) => (k === i ? Number(val) : v)));

  const copySliders = useCallback(() => {
    if (!qSlider) return;
    setQDh([qSlider.theta1, qSlider.theta2, qSlider.theta3, qSlider.theta5, qSlider.theta4]);
  }, [qSlider]);

  const takeMgdTarget = () => {
    setMgiTarget({
      x: +fwd.position.x.toFixed(5),
      y: +fwd.position.y.toFixed(5),
      z: +fwd.position.z.toFixed(5),
    });
  };

  const runMgi = () => {
    const res = dhInverseNumeric(mgiTarget, params, [qDh, DH_DEFAULT_Q]);
    setMgiResult(res);
    setMgiMsg(
      res.ok
        ? `${res.message} Erreur finale ${res.err.toFixed(4)} mm.`
        : `${res.message} Erreur ${res.err?.toFixed(2) ?? "—"} mm.`
    );
    if (res.q) setQDh(res.q);
  };

  const runTests = () => setTests(dhAutotests(qDh, params));

  const runEp = (mode) => {
    setEpTab(mode);
    if (mode === "ref") {
      setQDh([...DH_DEFAULT_Q]);
      setEpAnalysis(null);
    } else if (mode === "vert") {
      const v = dhVerticalPose(params);
      setQDh(v.q);
      setEpAnalysis(null);
    } else {
      const v = dhVerticalPose(params);
      setQDh(v.q);
      setEpAnalysis(v);
    }
  };

  const exportJson = () => {
    const payload = {
      meta: {
        source: "Polytech GII-4A · Lab ERICC",
        note: "Paramètres d'exemple — non certifiés constructeur",
        date: new Date().toISOString(),
      },
      params,
      qDh,
      position: fwd.position,
      T05: fwd.T05,
      jacobian: J,
      singularity: sing,
      mgi: mgiResult,
      tests,
      epAnalysis,
      volumeBounds: volume
        ? { r: [volume.rMin, volume.rMax], z: [volume.zMin, volume.zMax], n: volume.n }
        : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ericc-dh-calculs.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="dh-ext">
      <div className="dh-ext-head">
        <div>
          <p className="arch-kicker">05 — Extension scientifique</p>
          <h2>Modèle du cours, matrices et validation</h2>
          <p className="lead">
            Deux modèles à distinguer : les vues 2D/3D utilisent une géométrie pédagogique simplifiée.
            Ce module implémente séparément le tableau DH / Dombre-Khalil du cours.
          </p>
        </div>
        <span className="dh-badge">Mathématiques reproductibles</span>
      </div>

      <div className="dh-note">
        Les paramètres symboliques d₃, d₄ et r₅ sont modifiables ; leurs valeurs de démonstration ne
        sont pas des cotes constructeur validées. Le repère et les zéros doivent être contrôlés sur le
        robot.
      </div>

      <div className="dh-grid-2">
        <div className="panel dh-card">
          <h3>1 · Paramétrage DH du cours</h3>
          <p className="lead">
            Convention : T<sub>i−1,i</sub> = Rot(X,α<sub>i</sub>) · Trans(X,d<sub>i</sub>) · Rot(Z,q
            <sub>i</sub>) · Trans(Z,r<sub>i</sub>).
          </p>
          <table className="table dh-table">
            <thead>
              <tr>
                <th>i</th>
                <th>αᵢ</th>
                <th>dᵢ</th>
                <th>qᵢ</th>
                <th>rᵢ</th>
              </tr>
            </thead>
            <tbody>
              {DH_TABLE_META.map((row) => (
                <tr key={row.i}>
                  <td>{row.i}</td>
                  <td>{row.alpha}°</td>
                  <td>{row.dKey ? row.dKey : row.dFixed}</td>
                  <td>q{row.i}</td>
                  <td>{row.rKey ? row.rKey : row.rFixed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="field-row" style={{ marginTop: 12 }}>
            <label>
              d₃ (mm)
              <input type="number" value={params.d3} onChange={(e) => setParam("d3", e.target.value)} />
            </label>
            <label>
              d₄ (mm)
              <input type="number" value={params.d4} onChange={(e) => setParam("d4", e.target.value)} />
            </label>
            <label>
              r₅ (mm)
              <input type="number" value={params.r5} onChange={(e) => setParam("r5", e.target.value)} />
            </label>
          </div>
          <p className="sensor-note">Valeurs d&apos;exemple pour tester les calculs, non certifiées.</p>
        </div>

        <div className="panel dh-card">
          <h3>2 · Angles DH indépendants</h3>
          <p className="lead">
            Modifie les qᵢ directement ou copie les curseurs (sans prétendre que les conventions sont
            identiques).
          </p>
          <div className="field-row">
            {qDh.map((v, i) => (
              <label key={i}>
                q{i + 1} (°)
                <input type="number" step="0.1" value={v} onChange={(e) => setQi(i, e.target.value)} />
              </label>
            ))}
          </div>
          <div className="capture-row">
            <button type="button" className="btn btn-primary" onClick={() => setQDh([...qDh])}>
              Recalculer T₀₅
            </button>
            <button type="button" className="btn btn-ghost" onClick={copySliders}>
              Copier les angles des curseurs
            </button>
          </div>
          <div className="coords" style={{ marginTop: 14 }}>
            {`Position du repère R₅ dans R₀ :
X = ${fwd.position.x.toFixed(3)} mm
Y = ${fwd.position.y.toFixed(3)} mm
Z = ${fwd.position.z.toFixed(3)} mm

Angles DH q : [${qDh.map((v) => Number(v).toFixed(2)).join(", ")}]°
Rappel : repère / angle DH ≠ curseur constructeur sans calibrage.`}
          </div>
        </div>
      </div>

      <div className="dh-grid-2" style={{ marginTop: 20 }}>
        <div className="panel dh-card">
          <h3>3 · Matrices de passage</h3>
          <div className="dh-mat-tabs">
            {MATRIX_KEYS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={matKey === m.id ? "active" : ""}
                onClick={() => setMatKey(m.id)}
              >
                {m.id.replace("T", "T")}
              </button>
            ))}
          </div>
          <MatrixGrid T={selectedT} />
          <p className="sensor-note">
            Contrôle orthogonalité RᵀR = I : erreur max {ortho.maxErr.toExponential(2)} ; det(R) ={" "}
            {ortho.det.toFixed(6)}. T₀₅ calculée par produit cumulatif.
          </p>
        </div>

        <div className="panel dh-card">
          <h3>4 · Repères locaux et axes</h3>
          <p className="lead">Trièdres DH : X rouge, Y vert, Z bleu (projection pédagogique).</p>
          <FramesSvg frames={fwd.frames} />
          <div className="coords" style={{ marginTop: 10 }}>
            {fwd.frames
              .map(
                (f, i) =>
                  `R${i} : (${f.origin[0].toFixed(1)} ; ${f.origin[1].toFixed(1)} ; ${f.origin[2].toFixed(1)})`
              )
              .join("\n")}
          </div>
        </div>
      </div>

      <div className="dh-grid-2" style={{ marginTop: 20 }}>
        <div className="panel dh-card">
          <h3>5 · MGI numérique (modèle DH)</h3>
          <p className="lead">
            Calcul de q₁…q₅ pour une cible de position. Moindres carrés amortis, plusieurs amorces. La
            méthode de Paul reste à développer dans le rapport.
          </p>
          <div className="field-row">
            {["x", "y", "z"].map((k) => (
              <label key={k}>
                {k.toUpperCase()} (mm)
                <input
                  type="number"
                  step="0.001"
                  value={mgiTarget[k]}
                  onChange={(e) => setMgiTarget({ ...mgiTarget, [k]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <div className="capture-row">
            <button type="button" className="btn btn-ghost" onClick={takeMgdTarget}>
              Prendre cible MGD
            </button>
            <button type="button" className="btn btn-primary" onClick={runMgi}>
              Résoudre MGI
            </button>
          </div>
          <div className="coords" style={{ marginTop: 12 }}>
            {mgiResult
              ? `${mgiMsg}
Angles : [${mgiResult.q.join("; ")}]°
Point obtenu : (${mgiResult.position.x.toFixed(2)}; ${mgiResult.position.y.toFixed(2)}; ${mgiResult.position.z.toFixed(2)}) mm
Méthode : moindres carrés amortis, plusieurs amorces.`
              : mgiMsg}
          </div>
        </div>

        <div className="panel dh-card">
          <h3>6 · Validation et singularités</h3>
          <p className="lead">Jacobienne numérique de position Jᵥ (3 × 5), mm/rad.</p>
          <div className="dh-jac">
            {J.map((row, i) => (
              <div key={i}>{row.map((v) => v.toFixed(2).padStart(9, " ")).join(" ")}</div>
            ))}
          </div>
          <div className={`dh-sing ${sing.rankTrans < 3 ? "warn" : ""}`}>
            Indicateur det(Jv Jvᵀ) normalisé ≈ {sing.normalized.toExponential(3)}. Rang de translation{" "}
            {sing.rankTrans}/3 à cette précision.
          </div>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={runTests}>
            Exécuter autotests
          </button>
          {tests && (
            <div className="coords" style={{ marginTop: 10 }}>
              {`Identité / ortho RᵀR : ${tests.identityOrtho.toExponential(2)}
det(R) : ${tests.detR.toFixed(8)}
Aller-retour MGD→MGI→MGD : ${tests.roundTrip.toFixed(6)} mm
${tests.message}
Attention : non-validation des conventions et cotes physiques.`}
            </div>
          )}

          <div className="dh-ep" style={{ marginTop: 16 }}>
            <p className="credits-label">Essai EP · alignement vertical et singularité</p>
            <div className="dh-mat-tabs">
              <button type="button" className={epTab === "ref" ? "active" : ""} onClick={() => runEp("ref")}>
                1 — Référence DH
              </button>
              <button type="button" className={epTab === "vert" ? "active" : ""} onClick={() => runEp("vert")}>
                2 — Posture verticale
              </button>
              <button type="button" className={epTab === "ana" ? "active" : ""} onClick={() => runEp("ana")}>
                3 — Analyser
              </button>
            </div>
            {epAnalysis && (
              <div className="coords" style={{ marginTop: 10 }}>
                {`ANGLES DH q1..q5 : ${epAnalysis.q.map((v) => v.toFixed(1) + "°").join("; ")}
POSITION : X=${epAnalysis.position.x.toFixed(2)}; Y=${epAnalysis.position.y.toFixed(2)}; Z=${epAnalysis.position.z.toFixed(2)} mm
DISTANCE RADIALE √(X²+Y²) = ${epAnalysis.radial.toFixed(6)} mm
ANGLE Z1 / Z5 (non orienté) = ${epAnalysis.zAngle.toFixed(6)}°
VALEURS SINGULIÈRES Jv : ${epAnalysis.singularValues.map((v) => v.toFixed(5)).join("; ")}
RANG Jv (3×5) : ${epAnalysis.rankTrans} / 3
Configuration verticale coaxiale du modèle DH confirmée.
CONCLUSION : singularité mathématique démontrée par la perte de rang de J.
LIMITES : d₃=${params.d3}, d₄=${params.d4}, r₅=${params.r5} mm — indicatifs.`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dh-grid-2" style={{ marginTop: 20 }}>
        <div className="panel dh-card">
          <h3>7 · Volume et trajectoire</h3>
          <p className="lead">
            Projection r–z du modèle DH sur un échantillon — pas un calcul volumique exact ni une mesure
            du robot réel.
          </p>
          <VolumeSvg sample={volume} />
          {volume && (
            <p className="sensor-note">
              {volume.n} configurations. r ≈ [{volume.rMin.toFixed(1)} ; {volume.rMax.toFixed(1)}] mm ; z ≈ [
              {volume.zMin.toFixed(1)} ; {volume.zMax.toFixed(1)}] mm. Bornes observées, non démontrées.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 10 }}
            onClick={() => setVolume(sampleDhVolume(params, 900))}
          >
            Échantillonner le volume
          </button>
        </div>

        <div className="panel dh-card">
          <h3>8 · Reproductibilité du rapport</h3>
          <p className="lead">
            Exporter les paramètres, angles, matrices, point atteint, tests et notes. Le JSON permet à un
            correcteur de vérifier les calculs sans appareil.
          </p>
          <div className="capture-row">
            <button type="button" className="btn btn-primary" onClick={exportJson}>
              Exporter données JSON
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              Imprimer les calculs
            </button>
          </div>
          <div className="coords" style={{ marginTop: 14 }}>
            Sources : sujet EP 4A GII 2026, C7 Modélisation ERICC, descriptif constructeur. Mesures sur
            matériel : non réalisées (accès laboratoire indisponible).
          </div>
        </div>
      </div>

      <div className="panel dh-card" style={{ marginTop: 20 }}>
        <h3>9 · Guide de réponse — rubriques EP</h3>
        <div className="dh-guide">
          <details open>
            <summary>Architecture, motorisations, capteurs et chaîne cinématique</summary>
            <p>
              Robot série RRRRR, cinq articulations de rotation : lacet, épaule, coude, orientation du
              poignet / pince. M1–M3 : MCC ; deux pas à pas pour le poignet avec couplage différentiel.
              Distinguer capteurs de position, de référence et de fin de course. Mobilité utile M = 5
              pour chaîne série ouverte à 5 pivots (5 corps mobiles).
            </p>
          </details>
          <details>
            <summary>Initialisation, bornes θ₁…θ₅ et zéros</summary>
            <p>
              Bornes documentaires : θ₁ ±135°, θ₂ [−45°, +90°], θ₃ [−45°, +90°], θ₄ ±180° ; l&apos;inclinaison
              dépend du couplage. Les zéros doivent respecter les figures constructeur ; les valeurs du
              simulateur sont des estimations.
            </p>
          </details>
          <details>
            <summary>Couplage du poignet, 5 DDL et contraintes d&apos;orientation</summary>
            <p>
              Deux actionneurs couplés (différentiel) pour inclinaison et rotation. 5 DDL : impossible
              d&apos;imposer arbitrairement les 6 composantes d&apos;une pose. Un MGI de position peut admettre
              plusieurs solutions ; les butées les réduisent. Calibrer qᵢ DH ↔ θᵢ constructeur avant
              commande matériel.
            </p>
          </details>
          <details>
            <summary>Volume de travail, table, repères et singularités</summary>
            <p>
              Définir R₀ au socle, plan de table Z = 0 ; tenir compte des offsets et collisions.
              L&apos;alignement bras–avant-bras peut rendre la jacobienne plane singulière ; une position sur
              l&apos;axe du lacet annule l&apos;influence du lacet sur la position.
            </p>
          </details>
          <details>
            <summary>Télé-opération et prise-dépose</summary>
            <p>
              Séquence : approche → orientation pince → ouverture → prise → fermeture → dégagement →
              transport → dépôt → retrait. Cylindres : symétrie d&apos;orientation ; parallélépipèdes :
              alignement des faces.
            </p>
          </details>
          <details>
            <summary>Apprentissage VAL / P / L et linéarité</summary>
            <p>
              I (init), Val (mémoriser), P (début programme), L (lecture). L&apos;interpolation articulaire
              entre deux postures ne suit en général pas un segment droit cartésien. Pour une droite :
              interpolation opérationnelle + MGI valide + contrôle des limites / singularités.
            </p>
          </details>
          <details>
            <summary>MGD, matrices DH, MGI par Paul et validation</summary>
            <p>
              Calculer T₀₁…T₄₅, multiplier pour T₀₅, contrôler RᵀR = I et det(R) = 1. Le cours préconise
              la méthode de Paul pour le MGI symbolique ; le solveur numérique ici est un outil de
              vérification, non un remplacement. Reproduire un exemple MGD puis MGI→MGD avec erreur
              résiduelle mesurée.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
