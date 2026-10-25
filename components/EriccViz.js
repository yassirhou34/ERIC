"use client";

import { useEffect, useRef, useState } from "react";
import { ericcMGD } from "@/lib/ericc";

function projectProfile(p, w, h) {
  const scale = 0.32;
  const ox = 40;
  const oy = h - 36;
  return { x: ox + p.r * scale, y: oy - p.z * scale };
}

export function EriccProfile({ q }) {
  const mgd = ericcMGD(q);
  const { planar } = mgd;
  const w = 520;
  const h = 320;
  const O = projectProfile({ r: 0, z: 0 }, w, h);
  const S = projectProfile({ r: 0, z: 340 }, w, h);
  const E = projectProfile({ r: planar.rE, z: planar.zE }, w, h);
  const W = projectProfile({ r: planar.rW, z: planar.zW }, w, h);
  const G = projectProfile({ r: planar.rG, z: planar.zG }, w, h);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="viz-svg">
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(12,12,12,0.05)" />
        </pattern>
        <linearGradient id="arm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#b08d57" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="#fffcf8" />
      <rect width={w} height={h} fill="url(#grid)" />
      <line x1={O.x} y1={O.y} x2={O.x + 160} y2={O.y} stroke="rgba(12,12,12,0.12)" />
      <line x1={O.x} y1={O.y} x2={O.x} y2={O.y - 200} stroke="rgba(12,12,12,0.12)" />
      <polyline
        points={`${O.x},${O.y} ${S.x},${S.y} ${E.x},${E.y} ${W.x},${W.y} ${G.x},${G.y}`}
        fill="none"
        stroke="url(#arm)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [S, "O₂"],
        [E, "O₃"],
        [W, "W"],
        [G, "G"],
      ].map(([p, lab], i) => (
        <g key={lab}>
          <circle cx={p.x} cy={p.y} r="7" fill="#fff" stroke={i === 3 ? "#b08d57" : "#c8102e"} strokeWidth="2" />
          <text x={p.x + 10} y={p.y - 8} fill="#5c5852" fontSize="11" fontFamily="JetBrains Mono, monospace">
            {lab}
          </text>
        </g>
      ))}
      <text x="16" y="24" fill="#5c5852" fontSize="11">
        Plan XZ · θ₂={Number(q.theta2).toFixed(0)}° · θ₃={Number(q.theta3).toFixed(0)}° · θ₅={Number(q.theta5).toFixed(0)}°
      </text>
    </svg>
  );
}

export function EriccTop({ q }) {
  const mgd = ericcMGD(q);
  const w = 320;
  const h = 280;
  const cx = w / 2;
  const cy = h / 2;
  const scale = 0.22;
  const g = mgd.G;
  const px = cx + g.x * scale;
  const py = cy - g.y * scale;
  const rmax = 747.5 * scale;
  const ang = ((q.theta1 - 90) * Math.PI) / 180;

  return (
    <svg viewBox={`0 0 ${w} ${h}`}>
      <rect width={w} height={h} fill="#fffcf8" />
      <circle cx={cx} cy={cy} r={rmax} fill="none" stroke="rgba(200,16,46,0.15)" strokeDasharray="4 6" />
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(ang) * rmax}
        y2={cy + Math.sin(ang) * rmax}
        stroke="#c8102e"
        strokeWidth="3"
      />
      <circle cx={cx} cy={cy} r="5" fill="#b08d57" />
      <circle cx={px} cy={py} r="6" fill="#fff" stroke="#c8102e" strokeWidth="2" />
      <text x="12" y="22" fill="#5c5852" fontSize="11">
        θ₁ = {Number(q.theta1).toFixed(0)}°
      </text>
    </svg>
  );
}

export function Ericc3D({ q }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);
  const [view, setView] = useState({ az: 38, el: 23 });
  const mgd = ericcMGD(q);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const az = (view.az * Math.PI) / 180;
    const el = (view.el * Math.PI) / 180;
    const project = (p) => {
      const x = p.x * 0.28;
      const y = p.y * 0.28;
      const z = p.z * 0.28;
      const xr = x * Math.cos(az) - y * Math.sin(az);
      const yr = x * Math.sin(az) + y * Math.cos(az);
      const x2 = xr;
      const y2 = z * Math.cos(el) - yr * Math.sin(el);
      return { x: w / 2 + x2, y: h * 0.72 - y2 };
    };

    ctx.fillStyle = "#fffcf8";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(200,16,46,0.18)";
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const p = project({ x: Math.cos(a) * 280, y: Math.sin(a) * 280, z: 0 });
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    const pts = ["O", "S", "E", "W", "G"].map((k) => project(mgd.points[k]));
    const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[4].x, pts[4].y);
    grad.addColorStop(0, "#c8102e");
    grad.addColorStop(1, "#b08d57");
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = grad;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = i === pts.length - 1 ? "#b08d57" : "#c8102e";
      ctx.lineWidth = 2;
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [q, view, mgd]);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: "100%", minHeight: 260, cursor: "grab", touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ x: e.clientX, y: e.clientY, az: view.az, el: view.el });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        setView({
          az: drag.az + (e.clientX - drag.x) * 0.4,
          el: Math.max(-10, Math.min(80, drag.el + (e.clientY - drag.y) * 0.3)),
        });
      }}
      onPointerUp={() => setDrag(null)}
    />
  );
}
