
export interface Preset {
  id: string;
  name: string;
  desc: string;
  gradientColors: [string, string];
  defaultParams?: Partial<GradeParams>;
}

export interface ImageAnalysisResult {
  exposure: string;
  colorPalette: string;
  mood: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  stage: string; // 'analyzing', 'generating_lut', 'rendering', etc.
  progress: number; // 0 to 100
}

export enum ViewMode {
  Split = 'SPLIT',
  Toggle = 'TOGGLE',
  SideBySide = 'SIDE_BY_SIDE'
}

export interface ColorStats {
  mean: [number, number, number];
  std: [number, number, number];
}

export interface GradeParams {
  // Primary CDL
  lift: [number, number, number]; // Shadows
  gamma: [number, number, number]; // Mids
  gain: [number, number, number]; // Highlights
  
  // Basic
  saturation: number;
  temperature: number;
  tint: number;
  
  // Cinematic / Filmic Ops
  contrast: number; // S-Curve intensity
  vignette: number; // Edge darkening
  grain: number; // Film grain amount
  crosstalk: number; // Film dye coupling simulation (0.0 to 1.0)
  satRolloff: number; // Highlight desaturation (0.0 to 1.0)
  
  // Split Toning
  shadowTint: [number, number, number]; // RGB push in shadows
  highlightTint: [number, number, number]; // RGB push in highlights

  // Statistical Match
  targetStats?: ColorStats | null;
  sourceStats?: ColorStats | null;
  mix: number; // 0 to 1
}
