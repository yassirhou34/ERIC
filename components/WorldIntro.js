"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const IntroScene = dynamic(() => import("./three/IntroScene"), { ssr: false });

const DURATION_MS = 4000;

export default function WorldIntro() {
  const [phase, setPhase] = useState("live"); // live | exit | gone

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("gone");
      return;
    }
    document.documentElement.classList.add("intro-lock");
    const tExit = setTimeout(() => setPhase("exit"), DURATION_MS - 750);
    const tGone = setTimeout(() => {
      setPhase("gone");
      document.documentElement.classList.remove("intro-lock");
    }, DURATION_MS);
    return () => {
      clearTimeout(tExit);
      clearTimeout(tGone);
      document.documentElement.classList.remove("intro-lock");
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`world-intro world-intro-3d ${phase === "exit" ? "is-exit" : ""}`} role="presentation">
      <div className="wi3d-stage">
        <IntroScene />
      </div>

      <div className="wi3d-overlay">
        <p className="wi3d-kicker">Polytech Marseille · Olive</p>
        <h1 className="wi3d-title">
          <span>Robotique</span>
          <span className="wi3d-red">3D Live</span>
        </h1>
        <p className="wi3d-sub">Entrée dans les mondes</p>
        <div className="wi3d-bar" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
