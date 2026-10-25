/** Bras droit NAO — offsets constructeur typiques (mm) + lab pédagogique. */

export const NAO_ARM_LIMITS = {
  RShoulderPitch: { min: -119.5, max: 119.5, label: "RShoulderPitch" },
  RShoulderRoll: { min: -94.5, max: -0.5, label: "RShoulderRoll" },
  RElbowYaw: { min: -119.5, max: 119.5, label: "RElbowYaw" },
  RElbowRoll: { min: 0.5, max: 89.5, label: "RElbowRoll" },
  RWristYaw: { min: -104.5, max: 104.5, label: "RWristYaw" },
};

export const NAO_DEFAULT = {
  RShoulderPitch: 80,
  RShoulderRoll: -18,
  RElbowYaw: 80,
  RElbowRoll: 58,
  RWristYaw: 0,
};

export const NAO_POSTURES = {
  StandZero: {
    label: "StandZero",
    desc: "Angles nuls — référence MGD / zéros constructeur.",
    q: { RShoulderPitch: 0, RShoulderRoll: -1, RElbowYaw: 0, RElbowRoll: 2, RWristYaw: 0 },
  },
  StandInit: {
    label: "StandInit",
    desc: "Posture d’initialisation Choregraphe typique.",
    q: { RShoulderPitch: 80, RShoulderRoll: -18, RElbowYaw: 80, RElbowRoll: 58, RWristYaw: 0 },
  },
  Stand: {
    label: "Stand",
    desc: "Posture debout de repos / présentation.",
    q: { RShoulderPitch: 83, RShoulderRoll: -12, RElbowYaw: 69, RElbowRoll: 24, RWristYaw: 0 },
  },
};

export const NAO_OFFSETS = {
  ShoulderOffsetY: 98,
  ShoulderOffsetZ: 100,
  UpperArmLength: 105,
  ElbowOffsetY: 15,
  LowerArmLength: 55.95,
  HandOffsetX: 57.75,
  HandOffsetZ: 12.31,
};

export const NAO_PARTS = [
  {
    id: "head",
    name: "Tête",
    n: "01",
    dof: 2,
    desc: "Pitch + Yaw — vision, micros, LEDs tactiles.",
    speech: "Tête. Deux degrés de liberté, pitch et yaw. Elle porte les caméras, les micros et les capteurs tactiles.",
  },
  {
    id: "torso",
    name: "Torse",
    n: "02",
    dof: 0,
    desc: "Bâti central — batterie, carte mère, sonars.",
    speech: "Torse. Structure centrale du NAO. Il accueille la batterie, l’électronique et les sonars avant.",
  },
  {
    id: "rarm",
    name: "Bras droit",
    n: "03",
    dof: 5,
    desc: "Shoulder Pitch/Roll, Elbow Yaw/Roll, Wrist Yaw (+ main).",
    speech: "Bras droit. Cinq articulations plus la main. C’est le bras piloté dans cet atelier.",
  },
  {
    id: "larm",
    name: "Bras gauche",
    n: "04",
    dof: 5,
    desc: "Symétrique du bras droit (miroir Y).",
    speech: "Bras gauche. Symétrique du bras droit. On obtient sa pose par réflexion sur le plan sagittal.",
  },
  {
    id: "rleg",
    name: "Jambe droite",
    n: "05",
    dof: 6,
    desc: "Hip, Knee, Ankle — locomotion bipède.",
    speech: "Jambe droite. Six degrés de liberté pour la marche et l’équilibre.",
  },
  {
    id: "lleg",
    name: "Jambe gauche",
    n: "06",
    dof: 6,
    desc: "Symétrique — FSR et bumpers au pied.",
    speech: "Jambe gauche. Symétrique de la jambe droite, avec capteurs FSR et bumpers.",
  },
];

export const NAO_SENSORS = [
  {
    id: "cam",
    name: "Caméras ×2",
    tech: "CMOS VGA / QVGA",
    desc: "Vision frontale et basse — détection de visages, balles, QR.",
    speech: "Caméras. Deux caméras CMOS pour la vision : détection de visages, d’objets et de marquages.",
  },
  {
    id: "mic",
    name: "Micros ×4",
    tech: "Acoustique omnidirectionnelle",
    desc: "Localisation de source sonore et reconnaissance vocale.",
    speech: "Micros. Quatre microphones pour la localisation sonore et la reconnaissance de la parole.",
  },
  {
    id: "sonar",
    name: "Sonars ×2",
    tech: "Ultrasons",
    desc: "Obstacles avant gauche / droite — événements Detected.",
    speech: "Sonars. Deux ultrasons à l’avant pour détecter les obstacles proches à gauche et à droite.",
  },
  {
    id: "tactile",
    name: "Tactiles",
    tech: "Capacitifs tête + mains",
    desc: "Front, Middle, Rear sur la tête ; touchés de mains.",
    speech: "Capteurs tactiles. Trois zones sur la tête et des zones sur les mains pour l’interaction.",
  },
  {
    id: "bumper",
    name: "Bumpers ×2",
    tech: "Contacteurs pieds",
    desc: "Collision basse lors de la marche.",
    speech: "Bumpers. Contacteurs mécaniques sous les pieds pour détecter une collision basse.",
  },
  {
    id: "imu",
    name: "IMU",
    tech: "Gyro 2 axes + accéléro 3 axes",
    desc: "Équilibre et détection de chute.",
    speech: "I.M.U. Gyroscope et accéléromètre pour l’équilibre et la détection de chute.",
  },
  {
    id: "fsr",
    name: "FSR",
    tech: "Pression 4× / pied",
    desc: "Répartition d’appui au sol.",
    speech: "F.S.R. Capteurs de force résistifs sous chaque pied pour mesurer l’appui au sol.",
  },
];

export const NAO_DOF = {
  head: 2,
  arm: 5,
  leg: 6,
  totalRoom: 24,
  note: "2 + 2×5 + 2×6 = 24 ddl (releve salle) ; doc H25 cite parfois 25.",
};

export const NAO_MODULES = [
  { id: "board", label: "Tableau de bord" },
  { id: "dof", label: "Architecture / DDL" },
  { id: "postures", label: "Postures Stand*" },
  { id: "limits", label: "Limites articulaires" },
  { id: "sensors", label: "Capteurs" },
  { id: "sonar", label: "Sonar" },
  { id: "mgd", label: "MGD bras" },
  { id: "mgi", label: "MGI / symétrie" },
  { id: "pepper", label: "Extension Pepper" },
  { id: "console", label: "Console" },
];

const deg = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** MGD bras droit simplifié (position main relative torse). */
export function naoRightArmMGD(q) {
  const o = NAO_OFFSETS;
  const sp = deg(q.RShoulderPitch);
  const sr = deg(q.RShoulderRoll);
  const ey = deg(q.RElbowYaw);
  const er = deg(q.RElbowRoll);
  const wy = deg(q.RWristYaw);

  let x = 0;
  let y = o.ShoulderOffsetY;
  let z = o.ShoulderOffsetZ;

  const ux = o.UpperArmLength * Math.sin(sp) * Math.cos(sr);
  const uy = o.UpperArmLength * Math.sin(sr);
  const uz = -o.UpperArmLength * Math.cos(sp) * Math.cos(sr);
  x += ux;
  y += uy;
  z += uz;

  const lx =
    o.LowerArmLength * Math.sin(sp + er * 0.2) * Math.cos(sr) +
    o.ElbowOffsetY * Math.sin(ey) * 0.15;
  const ly = o.LowerArmLength * Math.sin(sr + er * 0.35) + o.ElbowOffsetY;
  const lz = -o.LowerArmLength * Math.cos(sp) * Math.cos(er * 0.5);
  x += lx * 0.55 + o.HandOffsetX * Math.cos(wy) * 0.2;
  y += ly * 0.45;
  z += lz * 0.55 + o.HandOffsetZ;

  const shoulder = { x: 0, y: o.ShoulderOffsetY, z: o.ShoulderOffsetZ };
  const elbow = {
    x: shoulder.x + ux,
    y: shoulder.y + uy,
    z: shoulder.z + uz,
  };
  const hand = { x, y, z };

  return {
    shoulder,
    elbow,
    hand,
    reach: Math.hypot(x, y - o.ShoulderOffsetY, z - o.ShoulderOffsetZ),
  };
}

/** Miroir sagittal du bras droit → estimation bras gauche. */
export function naoLeftArmFromRight(mgdRight) {
  return {
    shoulder: { x: mgdRight.shoulder.x, y: -mgdRight.shoulder.y, z: mgdRight.shoulder.z },
    elbow: { x: mgdRight.elbow.x, y: -mgdRight.elbow.y, z: mgdRight.elbow.z },
    hand: { x: mgdRight.hand.x, y: -mgdRight.hand.y, z: mgdRight.hand.z },
  };
}

/**
 * MGI numérique pédagogique (position main) — moindres carrés amortis.
 * WristYaw fixé (sous-contraint).
 */
export function naoRightArmMGI(target, seed = NAO_DEFAULT) {
  const { x, y, z } = target;
  let q = { ...seed };
  let best = { err: Infinity, q: { ...q } };
  const keys = ["RShoulderPitch", "RShoulderRoll", "RElbowYaw", "RElbowRoll"];
  const lambda = 0.12;

  for (let iter = 0; iter < 60; iter++) {
    const g = naoRightArmMGD(q).hand;
    const e = [x - g.x, y - g.y, z - g.z];
    const err = Math.hypot(e[0], e[1], e[2]);
    if (err < best.err) best = { err, q: { ...q } };
    if (err < 0.8) break;

    const J = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const h = 0.35;
    for (let j = 0; j < 4; j++) {
      const qp = { ...q, [keys[j]]: q[keys[j]] + h };
      const gp = naoRightArmMGD(qp).hand;
      J[0][j] = (gp.x - g.x) / h;
      J[1][j] = (gp.y - g.y) / h;
      J[2][j] = (gp.z - g.z) / h;
    }

    const G = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += J[i][k] * J[j][k];
        G[i][j] = s;
      }
      G[i][i] += lambda * lambda * (1 + err);
    }
    const dp = solve3(G, e);
    if (!dp) break;
    for (let k = 0; k < 4; k++) {
      const dq = J[0][k] * dp[0] + J[1][k] * dp[1] + J[2][k] * dp[2];
      const key = keys[k];
      const lim = NAO_ARM_LIMITS[key];
      q[key] = clamp(q[key] + dq, lim.min, lim.max);
    }
  }

  q.RWristYaw = seed.RWristYaw ?? 0;
  const reached = naoRightArmMGD(q).hand;
  return {
    ok: best.err < 25,
    q: {
      RShoulderPitch: +q.RShoulderPitch.toFixed(1),
      RShoulderRoll: +q.RShoulderRoll.toFixed(1),
      RElbowYaw: +q.RElbowYaw.toFixed(1),
      RElbowRoll: +q.RElbowRoll.toFixed(1),
      RWristYaw: +q.RWristYaw.toFixed(1),
    },
    residual: Math.hypot(reached.x - x, reached.y - y, reached.z - z),
    reached,
    message:
      best.err < 25
        ? `OK — résidu ≈ ${Math.hypot(reached.x - x, reached.y - y, reached.z - z).toFixed(1)} mm (WristYaw fixé).`
        : "Convergence partielle — cible difficile pour le modèle simplifié.",
  };
}

function solve3(A, b) {
  const M = [
    [A[0][0], A[0][1], A[0][2], b[0]],
    [A[1][0], A[1][1], A[1][2], b[1]],
    [A[2][0], A[2][1], A[2][2], b[2]],
  ];
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-14) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const div = M[col][col];
    for (let j = col; j < 4; j++) M[col][j] /= div;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j < 4; j++) M[r][j] -= f * M[col][j];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}
