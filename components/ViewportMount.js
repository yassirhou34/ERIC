"use client";

import { useEffect, useRef, useState } from "react";

/** Monte les enfants seulement quand le bloc entre dans le viewport (perf 3D). */
export default function ViewportMount({ children, rootMargin = "120px", minHeight = 320, className = "" }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {show ? children : <div className="stage-fallback">Chargement 3D…</div>}
    </div>
  );
}
