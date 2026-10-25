"use client";

import { useEffect, useRef, useState } from "react";

/** Interpolation fluide des angles pour une visualisation réactive (60fps). */
export function useSmoothJoints(target, speed = 12) {
  const [smooth, setSmooth] = useState(target);
  const targetRef = useRef(target);
  const smoothRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    let raf;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = targetRef.current;
      const s = { ...smoothRef.current };
      let changed = false;
      Object.keys(t).forEach((k) => {
        const next = s[k] + (t[k] - s[k]) * Math.min(1, speed * dt);
        if (Math.abs(next - s[k]) > 0.001) changed = true;
        s[k] = next;
      });
      if (changed) {
        smoothRef.current = s;
        setSmooth(s);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  return smooth;
}
