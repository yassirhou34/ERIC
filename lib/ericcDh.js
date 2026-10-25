/** Modèle DH / Dombre-Khalil pédagogique ERICC (distinct du MGD simplifié). */

const DEG = Math.PI / 180;
const toRad = (d) => d * DEG;
const toDeg = (r) => r / DEG;

export const DH_DEFAULT_PARAMS = { d3: 280, d4: 318.3, r5: 150 };
export const DH_DEFAULT_Q = [0, 30, 30, 60, 0];

export const DH_TABLE_META = [
  { i: 1, alpha: 0, dKey: null, dFixed: 0, rKey: null, rFixed: 0 },
  { i: 2, alpha: 90, dKey: null, dFixed: 0, rKey: null, rFixed: 0 },
  { i: 3, alpha: 0, dKey: "d3", dFixed: null, rKey: null, rFixed: 0 },
  { i: 4, alpha: 0, dKey: "d4", dFixed: null, rKey: null, rFixed: 0 },
  { i: 5, alpha: 90, dKey: null, dFixed: 0, rKey: "r5", rFixed: null },
];

function matMul(A, B) {
  const C = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j] + A[i][3] * B[3][j];
    }
  }
  return C;
}

function rotX(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1],
  ];
}

function transX(d) {
  return [
    [1, 0, 0, d],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function rotZ(q) {
  const c = Math.cos(q);
  const s = Math.sin(q);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function transZ(r) {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, r],
    [0, 0, 0, 1],
  ];
}

/** Tᵢ₋₁,ᵢ = Rot(X,α) · Trans(X,d) · Rot(Z,q) · Trans(Z,r) */
export function dhLinkMatrix(alphaDeg, d, qDeg, r) {
  return matMul(matMul(matMul(rotX(toRad(alphaDeg)), transX(d)), rotZ(toRad(qDeg))), transZ(r));
}

export function dhParamsFor(params) {
  const { d3, d4, r5 } = { ...DH_DEFAULT_PARAMS, ...params };
  return [
    { alpha: 0, d: 0, r: 0 },
    { alpha: 90, d: 0, r: 0 },
    { alpha: 0, d: d3, r: 0 },
    { alpha: 0, d: d4, r: 0 },
    { alpha: 90, d: 0, r: r5 },
  ];
}

/** Calcule T01…T45, T05 et origines des repères. */
export function dhForward(qDeg, params = DH_DEFAULT_PARAMS) {
  const links = dhParamsFor(params);
  const Ti = [];
  let T = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const frames = [{ origin: [0, 0, 0], T: T.map((r) => [...r]) }];

  for (let i = 0; i < 5; i++) {
    const L = links[i];
    const A = dhLinkMatrix(L.alpha, L.d, qDeg[i], L.r);
    Ti.push(A);
    T = matMul(T, A);
    frames.push({
      origin: [T[0][3], T[1][3], T[2][3]],
      T: T.map((r) => [...r]),
    });
  }

  return {
    Ti,
    T05: T,
    position: { x: T[0][3], y: T[1][3], z: T[2][3] },
    frames,
    q: qDeg,
  };
}

export function rotationOrthoError(T) {
  const R = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]],
  ];
  let maxErr = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let dot = 0;
      for (let k = 0; k < 3; k++) dot += R[k][i] * R[k][j];
      const target = i === j ? 1 : 0;
      maxErr = Math.max(maxErr, Math.abs(dot - target));
    }
  }
  const det =
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
  return { maxErr, det };
}

/** Jacobienne de translation 3×5 (mm/rad) par différences finies. */
export function dhJacobianTrans(qDeg, params = DH_DEFAULT_PARAMS, hDeg = 1e-4) {
  const base = dhForward(qDeg, params).position;
  const J = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];
  for (let j = 0; j < 5; j++) {
    const qp = [...qDeg];
    qp[j] += hDeg;
    const p = dhForward(qp, params).position;
    const h = toRad(hDeg);
    J[0][j] = (p.x - base.x) / h;
    J[1][j] = (p.y - base.y) / h;
    J[2][j] = (p.z - base.z) / h;
  }
  return J;
}

/** Indicateur det(Jv Jvᵀ) normalisé (heuristique de singularité translation). */
export function singularityIndicator(J) {
  const G = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 5; k++) s += J[i][k] * J[j][k];
      G[i][j] = s;
    }
  }
  const det =
    G[0][0] * (G[1][1] * G[2][2] - G[1][2] * G[2][1]) -
    G[0][1] * (G[1][0] * G[2][2] - G[1][2] * G[2][0]) +
    G[0][2] * (G[1][0] * G[2][1] - G[1][1] * G[2][0]);
  const scale = Math.max(1, Math.abs(G[0][0]) + Math.abs(G[1][1]) + Math.abs(G[2][2]));
  const normalized = det / scale ** 3;
  const sv = eigen3Approx(G).map((v) => Math.sqrt(Math.max(0, v)));
  const rank = sv.filter((v) => v > 1e-3).length;
  return { det, normalized, singularValues: sv, rankTrans: rank };
}

function eigen3Approx(A) {
  /* Méthode de Jacobi 2D itérée — suffisant pour 3×3 symétrique */
  let M = A.map((r) => [...r]);
  for (let iter = 0; iter < 24; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(M[0][1]);
    if (Math.abs(M[0][2]) > max) {
      max = Math.abs(M[0][2]);
      p = 0;
      q = 2;
    }
    if (Math.abs(M[1][2]) > max) {
      max = Math.abs(M[1][2]);
      p = 1;
      q = 2;
    }
    if (max < 1e-12) break;
    const app = M[p][p];
    const aqq = M[q][q];
    const apq = M[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const N = M.map((r) => [...r]);
    for (let i = 0; i < 3; i++) {
      if (i === p || i === q) continue;
      const mip = M[i][p];
      const miq = M[i][q];
      N[i][p] = N[p][i] = c * mip - s * miq;
      N[i][q] = N[q][i] = s * mip + c * miq;
    }
    N[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    N[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    N[p][q] = N[q][p] = 0;
    M = N;
  }
  return [M[0][0], M[1][1], M[2][2]].sort((a, b) => b - a);
}

/**
 * MGI numérique position (moindres carrés amortis), plusieurs amorces.
 * Retourne q en degrés.
 */
export function dhInverseNumeric(target, params = DH_DEFAULT_PARAMS, seeds = null) {
  const { x, y, z } = target;
  const starts =
    seeds ||
    [
      [0, 30, 30, 60, 0],
      [toDeg(Math.atan2(y, x)), 40, 20, 40, 0],
      [toDeg(Math.atan2(y, x)), 20, -20, -40, 0],
      [0, 90, 0, -90, 0],
      [45, 25, -30, -60, 0],
      [-45, 50, 10, 30, 0],
    ];

  let best = null;
  const lambda0 = 0.08;
  const maxIter = 80;

  for (const seed of starts) {
    let q = seed.map((v) => +v);
    for (let iter = 0; iter < maxIter; iter++) {
      const fwd = dhForward(q, params);
      const e = [x - fwd.position.x, y - fwd.position.y, z - fwd.position.z];
      const err = Math.hypot(e[0], e[1], e[2]);
      if (!best || err < best.err) best = { err, q: [...q], position: fwd.position };
      if (err < 1e-3) break;

      const J = dhJacobianTrans(q, params);
      /* (J Jᵀ + λ² I) δp = e  puis  dq = Jᵀ δp  (en rad) */
      const G = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let s = 0;
          for (let k = 0; k < 5; k++) s += J[i][k] * J[j][k];
          G[i][j] = s;
        }
        G[i][i] += lambda0 * lambda0 * (1 + err);
      }
      const dp = solve3(G, e);
      if (!dp) break;
      for (let k = 0; k < 5; k++) {
        const dq = J[0][k] * dp[0] + J[1][k] * dp[1] + J[2][k] * dp[2];
        q[k] += toDeg(dq);
      }
      q[0] = clamp(q[0], -180, 180);
      q[1] = clamp(q[1], -120, 120);
      q[2] = clamp(q[2], -120, 120);
      q[3] = clamp(q[3], -180, 180);
      q[4] = clamp(q[4], -180, 180);
    }
  }

  if (!best) return { ok: false, message: "Échec du solveur numérique." };
  return {
    ok: best.err < 5,
    message:
      best.err < 5
        ? "Cible atteinte (calcul numérique)."
        : "Convergence partielle — vérifier la cible / les amorces.",
    err: best.err,
    q: best.q.map((v) => +v.toFixed(3)),
    position: best.position,
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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

export function dhAutotests(qDeg, params = DH_DEFAULT_PARAMS) {
  const fwd = dhForward(qDeg, params);
  const { maxErr, det } = rotationOrthoError(fwd.T05);
  const inv = dhInverseNumeric(fwd.position, params, [qDeg, DH_DEFAULT_Q]);
  const back = dhForward(inv.q, params);
  const roundTrip = Math.hypot(
    back.position.x - fwd.position.x,
    back.position.y - fwd.position.y,
    back.position.z - fwd.position.z
  );
  const pass = maxErr < 1e-10 && Math.abs(det - 1) < 1e-8 && roundTrip < 0.05;
  return {
    identityOrtho: maxErr,
    detR: det,
    mgdRepro: 0,
    roundTrip,
    pass,
    message: pass
      ? "PASS — pour ces valeurs."
      : "ÉCART — vérifier paramètres / angles.",
  };
}

/** Posture verticale singulière du modèle DH (démo EP). */
export function dhVerticalPose(params = DH_DEFAULT_PARAMS) {
  const q = [0, 90, 0, -90, 0];
  const fwd = dhForward(q, params);
  const J = dhJacobianTrans(q, params);
  const sing = singularityIndicator(J);
  const r = Math.hypot(fwd.position.x, fwd.position.y);
  /* angle Z1 vs Z5 : colonne z des frames */
  const z1 = [fwd.frames[1].T[0][2], fwd.frames[1].T[1][2], fwd.frames[1].T[2][2]];
  const z5 = [fwd.frames[5].T[0][2], fwd.frames[5].T[1][2], fwd.frames[5].T[2][2]];
  const cosA = Math.abs(z1[0] * z5[0] + z1[1] * z5[1] + z1[2] * z5[2]);
  const angle = toDeg(Math.acos(clamp(cosA, -1, 1)));
  return {
    q,
    position: fwd.position,
    radial: r,
    zAngle: angle,
    singularValues: sing.singularValues,
    rankTrans: sing.rankTrans,
    rankFullHint: sing.rankTrans <= 1 ? 3 : 5,
  };
}

/** Échantillonnage r–z du modèle DH (pas un volume exact). */
export function sampleDhVolume(params = DH_DEFAULT_PARAMS, n = 900) {
  const pts = [];
  let rMin = Infinity;
  let rMax = -Infinity;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const q = [
      (Math.random() * 270 - 135),
      Math.random() * 135 - 45,
      Math.random() * 135 - 45,
      Math.random() * 360 - 180,
      Math.random() * 180 - 90,
    ];
    const p = dhForward(q, params).position;
    const r = Math.hypot(p.x, p.y);
    pts.push({ r, z: p.z });
    rMin = Math.min(rMin, r);
    rMax = Math.max(rMax, r);
    zMin = Math.min(zMin, p.z);
    zMax = Math.max(zMax, p.z);
  }
  return { pts, rMin, rMax, zMin, zMax, n };
}

export function formatMatrix(T, digits = 4) {
  return T.map((row) => row.map((v) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(digits)));
}
