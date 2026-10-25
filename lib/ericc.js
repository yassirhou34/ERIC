/** Modèle géométrique simplifié ERICC (mm / degrés) — cohérent avec le lab EP. */

export const ERICC_LIMITS = {
  theta1: { min: -135, max: 135, label: "θ₁ — Lacet" },
  theta2: { min: -45, max: 90, label: "θ₂ — Épaule" },
  theta3: { min: -45, max: 90, label: "θ₃ — Coude" },
  theta4: { min: -180, max: 180, label: "θ₄ — Rotation pince" },
  theta5: { min: -90, max: 90, label: "θ₅ — Inclinaison", relative: true },
  grip: { min: 0, max: 55, label: "Ouverture mors (mm)" },
};

export const ERICC_LENGTHS = {
  L1: 340, // hauteur socle → épaule
  L2: 280, // bras
  L3: 317.5, // avant-bras
  L4: 150, // poignet → TCP
};

export const ERICC_DEFAULT = {
  theta1: 0,
  theta2: 30,
  theta3: 30,
  theta4: 0,
  theta5: 60,
  grip: 25,
};

export const ERICC_PARTS = [
  {
    id: "socle",
    name: "Socle",
    n: "01",
    desc: "Base fixe assurant stabilité et ancrage du manipulateur.",
    speech:
      "Socle. Base fixe du robot E.R.I.C.C. Elle assure la stabilité et l’ancrage du manipulateur sur le bâti.",
  },
  {
    id: "chaise",
    name: "Chaise",
    n: "02",
    desc: "Élément mobile en lacet (θ₁) supportant bras et avant-bras.",
    speech:
      "Chaise. Élément mobile en lacet, commande par thêta 1. Elle porte le bras et l’avant-bras et oriente toute la chaîne dans le plan horizontal.",
  },
  {
    id: "epaule",
    name: "Épaule",
    n: "03",
    desc: "Liaison pivot θ₂ entre chaise et bras.",
    speech:
      "Épaule. Liaison pivot thêta 2 entre la chaise et le bras. Elle permet de lever ou d’abaisser le bras.",
  },
  {
    id: "bras",
    name: "Bras",
    n: "04",
    desc: "Segment entre épaule et coude (longueur L2).",
    speech:
      "Bras. Segment principal entre l’épaule et le coude, de longueur L 2. C’est le premier grand levier de la chaîne série.",
  },
  {
    id: "coude",
    name: "Coude",
    n: "05",
    desc: "Liaison pivot θ₃ entre bras et avant-bras.",
    speech:
      "Coude. Liaison pivot thêta 3 entre le bras et l’avant-bras. Elle plie la chaîne pour rapprocher ou éloigner le poignet.",
  },
  {
    id: "avantbras",
    name: "Avant-bras",
    n: "06",
    desc: "Segment entre coude et poignet (longueur L3).",
    speech:
      "Avant-bras. Segment entre le coude et le poignet, de longueur L 3. Il prolonge le bras jusqu’à l’organe terminal.",
  },
  {
    id: "poignet",
    name: "Poignet",
    n: "07",
    desc: "Orientation de la pince via θ₄ / θ₅ (pas à pas couplés).",
    speech:
      "Poignet. Il oriente la pince grâce aux axes thêta 4 et thêta 5, motorisés en pas à pas et couplés.",
  },
  {
    id: "pince",
    name: "Pince",
    n: "08",
    desc: "Organe terminal — ouverture / fermeture (MCC).",
    speech:
      "Pince. Organe terminal du robot. Elle s’ouvre et se ferme par un moteur à courant continu pour saisir ou déposer un objet.",
  },
];

export const ERICC_MOTORS = [
  { id: "t1", axis: "θ₁ Lacet", type: "MCC", role: "Rotation asservie de la chaise." },
  { id: "t2", axis: "θ₂ Épaule", type: "MCC", role: "Couple pour soulever le bras." },
  { id: "t3", axis: "θ₃ Coude", type: "MCC", role: "Déplacement de l’avant-bras." },
  { id: "t4", axis: "θ₄ Rotation pince", type: "Pas à pas", role: "Orientation incrémentale (couplé)." },
  { id: "t5", axis: "θ₅ Inclinaison", type: "Pas à pas", role: "Basculement poignet (couplé)." },
  { id: "grip", axis: "Ouverture pince", type: "MCC", role: "Serrage / ouverture des mors." },
];

/** Capteurs angulaires O1 / O2 / O3 (retour modèle simulé). */
export const ERICC_SENSORS = [
  {
    id: "o1",
    code: "O1",
    name: "Lacet",
    joint: "theta1",
    highlight: "chaise",
    unit: "°",
    desc: "Position angulaire de la chaise autour de l’axe vertical. Mesure θ₁ du modèle.",
    speech:
      "O 1, lacet. Capteur de position angulaire de la chaise. Il estime thêta 1, l’orientation du bras dans le plan horizontal.",
  },
  {
    id: "o2",
    code: "O2",
    name: "Épaule",
    joint: "theta2",
    highlight: "epaule",
    unit: "°",
    desc: "Position angulaire du bras par rapport à la chaise. Mesure θ₂ du modèle.",
    speech:
      "O 2, épaule. Capteur de position angulaire du bras. Il estime thêta 2, l’élévation du bras depuis l’épaule.",
  },
  {
    id: "o3",
    code: "O3",
    name: "Coude",
    joint: "theta3",
    highlight: "coude",
    unit: "°",
    desc: "Position angulaire de l’avant-bras par rapport au bras. Mesure θ₃ du modèle.",
    speech:
      "O 3, coude. Capteur de position angulaire de l’avant-bras. Il estime thêta 3, la flexion au niveau du coude.",
  },
];

const deg = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * MGD simplifié EP (cohérent Studio / EP) : point G (TCP) dans R0.
 * Convention pédagogique : orientation L4 → φ = θ₂ + θ₅ (θ₃ agit sur le poignet W, pas sur φ).
 */
export function ericcMGD(q) {
  const { L1, L2, L3, L4 } = ERICC_LENGTHS;
  const t1 = deg(q.theta1);
  const t2 = deg(q.theta2);
  const t3 = deg(q.theta3);
  const t5 = deg(q.theta5);

  const rE = L2 * Math.cos(t2);
  const zE = L1 + L2 * Math.sin(t2);
  const rW = rE + L3 * Math.sin(t2 + t3);
  const zW = zE - L3 * Math.cos(t2 + t3);
  /* φ = θ₂ + θ₅ — modèle simplifié EP (pas θ₂+θ₃+θ₅) */
  const phi = t2 + t5;
  const rG = rW + L4 * Math.sin(phi);
  const zG = zW - L4 * Math.cos(phi);

  const x = rG * Math.cos(t1);
  const y = rG * Math.sin(t1);
  const z = zG;

  const S = { x: 0, y: 0, z: L1 };
  const E = {
    x: rE * Math.cos(t1),
    y: rE * Math.sin(t1),
    z: zE,
  };
  const W = {
    x: rW * Math.cos(t1),
    y: rW * Math.sin(t1),
    z: zW,
  };
  const G = { x, y, z };

  const ax = Math.sin(phi) * Math.cos(t1);
  const ay = Math.sin(phi) * Math.sin(t1);
  const az = -Math.cos(phi);
  const sx = -Math.sin(t1);
  const sy = Math.cos(t1);
  const sz = 0;
  const nx = ay * sz - az * sy;
  const ny = az * sx - ax * sz;
  const nz = ax * sy - ay * sx;

  const T = [
    [nx, sx, ax, x],
    [ny, sy, ay, y],
    [nz, sz, az, z],
    [0, 0, 0, 1],
  ];

  return {
    G,
    points: { O: { x: 0, y: 0, z: 0 }, S, E, W, G },
    T,
    planar: { rE, zE, rW, zW, rG, zG, phi },
  };
}

/**
 * MGI partiel : (x,y,z) → θ₁,θ₂,θ₃ ; θ₅ conservé ; θ₄ libre (= 0).
 * Recherche sur l’erreur MGD(G) — cohérente avec ericcMGD.
 */
export function ericcMGI(x, y, z, theta5Keep = 60) {
  const t1 = (Math.atan2(y, x) * 180) / Math.PI;
  const t1c = clamp(t1, ERICC_LIMITS.theta1.min, ERICC_LIMITS.theta1.max);

  let best = null;
  const step = 0.2;
  for (let t2 = ERICC_LIMITS.theta2.min; t2 <= ERICC_LIMITS.theta2.max; t2 += step) {
    for (let t3 = ERICC_LIMITS.theta3.min; t3 <= ERICC_LIMITS.theta3.max; t3 += step) {
      const g = ericcMGD({
        theta1: t1c,
        theta2: t2,
        theta3: t3,
        theta4: 0,
        theta5: theta5Keep,
      }).G;
      const err = (g.x - x) ** 2 + (g.y - y) ** 2 + (g.z - z) ** 2;
      if (!best || err < best.err) best = { err, t2, t3, g };
    }
  }

  if (!best || best.err > 10000) {
    return { ok: false, message: "Cible hors enveloppe approximative du modèle (avec θ₅ actuel)." };
  }

  const residual = Math.sqrt(best.err);
  return {
    ok: true,
    q: {
      theta1: +t1c.toFixed(1),
      theta2: +best.t2.toFixed(1),
      theta3: +best.t3.toFixed(1),
      theta4: 0,
      theta5: theta5Keep,
    },
    residual,
    reached: best.g,
  };
}

export function mobilityEricc() {
  const n = 5;
  const Nm5 = 5;
  const M = 6 * n - 5 * Nm5;
  return { n, Nm5, M };
}
