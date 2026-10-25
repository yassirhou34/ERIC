"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const IntroScene = dynamic(() => import("./three/IntroScene"), {
  ssr: false,
  loading: () => <div className="wi3d-fallback" />,
});

const DURATION_MS = 3800;
const STORAGE_KEY = "prt-intro-seen-v2";

function unlock() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("intro-lock");
  document.documentElement.classList.add("intro-done");
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function WorldIntro() {
  const [phase, setPhase] = useState("boot"); // boot | live | exit | gone

  const endIntro = useCallback(() => {
    markSeen();
    setPhase("gone");
    unlock();
  }, []);

  const skip = useCallback(() => {
    markSeen();
    setPhase("exit");
    window.setTimeout(endIntro, 600);
  }, [endIntro]);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }

    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("gone");
      unlock();
      return;
    }

    setPhase("live");
    document.documentElement.classList.add("intro-lock");
    document.documentElement.classList.remove("intro-done");

    const tExit = window.setTimeout(() => setPhase("exit"), DURATION_MS - 650);
    const tGone = window.setTimeout(endIntro, DURATION_MS);

    return () => {
      window.clearTimeout(tExit);
      window.clearTimeout(tGone);
      document.documentElement.classList.remove("intro-lock");
    };
  }, [endIntro]);

  if (phase === "boot" || phase === "gone") return null;

  return (
    <div
      className={`world-intro world-intro-3d ${phase === "exit" ? "is-exit" : ""}`}
      role="dialog"
      aria-label="Introduction"
    >
      <div className="wi3d-stage">
        <IntroScene />
      </div>

      <div className="wi3d-overlay">
        <p className="wi3d-kicker">Polytech Marseille · Équipe 7 · Olive</p>
        <h1 className="wi3d-title">
          <span>Polytech</span>
          <span className="wi3d-red">Robotique</span>
        </h1>
        <p className="wi3d-sub">ERICC · NAO · Entrée dans les mondes</p>
        <div className="wi3d-bar" aria-hidden>
          <span />
        </div>
      </div>

      <button type="button" className="wi3d-skip" onClick={skip}>
        Passer l’intro
      </button>
    </div>
  );
}
