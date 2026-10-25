"use client";

export default function JointPanel({ limits, values, onChange, onReset, accentNote }) {
  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3>Paramètres articulaires</h3>
        <span className="badge">LIVE</span>
      </div>
      <p className="lead">{accentNote || "Ajuste les angles et observe le modèle en temps réel."}</p>
      {Object.keys(limits).map((key) => {
        const lim = limits[key];
        const v = values[key];
        return (
          <div className="slider-row" key={key}>
            <label>
              <span>{lim.label}</span>
              <strong>
                {typeof v === "number" ? v.toFixed(1) : v}
                {key === "grip" ? " mm" : "°"}
              </strong>
            </label>
            <input
              type="range"
              min={lim.min}
              max={lim.max}
              step={key === "grip" ? 1 : 0.5}
              value={v}
              onChange={(e) => onChange(key, Number(e.target.value))}
            />
          </div>
        );
      })}
      {onReset && (
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={onReset} type="button">
          Réinitialiser
        </button>
      )}
    </div>
  );
}
