"use client";

export function EriccSilhouette({ accent = "#c8102e" }) {
  return (
    <svg
      viewBox="0 0 360 300"
      fill="none"
      aria-hidden
      style={{ width: "100%", height: "auto", filter: "drop-shadow(0 18px 40px rgba(200,16,46,0.18))" }}
    >
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#b08d57" />
        </linearGradient>
      </defs>
      <rect x="148" y="228" width="64" height="20" rx="5" stroke="url(#eg)" strokeWidth="2.5" fill="#fff" />
      <path d="M180 228 V162" stroke="url(#eg)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="180" cy="162" r="10" stroke={accent} strokeWidth="2.5" fill="#fff" />
      <path d="M180 162 L118 98" stroke="url(#eg)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="118" cy="98" r="9" stroke="#b08d57" strokeWidth="2.5" fill="#fff" />
      <path d="M118 98 L214 70" stroke="url(#eg)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="214" cy="70" r="8" stroke={accent} strokeWidth="2.5" fill="#fff" />
      <path d="M214 70 L262 92" stroke="#5c5852" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M262 84 L286 78 M262 100 L286 106" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="180" cy="162" r="52" stroke={accent} strokeOpacity="0.15" />
      <circle cx="180" cy="162" r="78" stroke="#b08d57" strokeOpacity="0.25" strokeDasharray="4 10" />
    </svg>
  );
}

export function NaoSilhouette({ accent = "#0b3d2e" }) {
  return (
    <svg
      viewBox="0 0 300 320"
      fill="none"
      aria-hidden
      style={{ width: "100%", height: "auto", filter: "drop-shadow(0 18px 40px rgba(11,61,46,0.16))" }}
    >
      <ellipse cx="150" cy="62" rx="36" ry="40" stroke={accent} strokeWidth="3.2" fill="#fff" />
      <circle cx="136" cy="58" r="4.5" fill={accent} />
      <circle cx="164" cy="58" r="4.5" fill={accent} />
      <path d="M150 102 V158" stroke={accent} strokeWidth="11" strokeLinecap="round" />
      <path d="M150 118 L82 160" stroke={accent} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M150 118 L218 160" stroke={accent} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M82 160 L64 214" stroke="#5c5852" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M218 160 L236 214" stroke="#5c5852" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M150 158 L118 248" stroke={accent} strokeWidth="7.5" strokeLinecap="round" />
      <path d="M150 158 L182 248" stroke={accent} strokeWidth="7.5" strokeLinecap="round" />
      <path d="M118 248 L104 290" stroke="#c8102e" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M182 248 L196 290" stroke="#c8102e" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="150" cy="158" r="82" stroke="#b08d57" strokeOpacity="0.35" strokeDasharray="5 12" />
    </svg>
  );
}
