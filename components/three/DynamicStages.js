"use client";

import dynamic from "next/dynamic";

const loading = () => <div className="stage-fallback">Chargement 3D…</div>;

export const LandingEriccStage = dynamic(
  () => import("./SceneStage").then((m) => m.LandingEriccStage),
  { ssr: false, loading }
);

export const LandingNaoStage = dynamic(
  () => import("./SceneStage").then((m) => m.LandingNaoStage),
  { ssr: false, loading }
);

export const EriccLabStage = dynamic(
  () => import("./SceneStage").then((m) => m.EriccLabStage),
  { ssr: false, loading }
);

export const EriccArchStage = dynamic(
  () => import("./SceneStage").then((m) => m.EriccArchStage),
  { ssr: false, loading }
);

export const EriccSensorsStage = dynamic(
  () => import("./SceneStage").then((m) => m.EriccSensorsStage),
  { ssr: false, loading }
);

export const NaoLabStage = dynamic(
  () => import("./SceneStage").then((m) => m.NaoLabStage),
  { ssr: false, loading }
);

export const WristCoupleStage = dynamic(() => import("./WristCouple3D"), {
  ssr: false,
  loading,
});
