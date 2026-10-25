"use client";

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";

export function SceneFX({ intensity = 0.55 }) {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
        intensity={intensity}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <Vignette offset={0.25} darkness={0.55} />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.0006, 0.0008)}
        radialModulation
        modulationOffset={0.35}
      />
    </EffectComposer>
  );
}
