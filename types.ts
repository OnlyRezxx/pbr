export interface PBRMaps {
  albedo: string | null;
  normal: string | null;
  roughness: string | null;
  metalness: string | null;
  ao: string | null;
  height: string | null;
}

export type MapType = keyof PBRMaps;

export interface MaterialSettings {
  repeat: number;
  normalScale: number;
  roughnessIntensity: number;
  metalnessIntensity: number;
  displacementScale: number;
}

export interface Preset {
  name: string;
  icon: string;
  prompt: string;
}