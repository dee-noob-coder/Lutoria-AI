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
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  saturation: number;
  temperature: number;
  tint: number;
  // If present, these stats will drive the look
  targetStats?: ColorStats | null;
  sourceStats?: ColorStats | null;
  mix: number; // 0 to 1, how much of the target stats to apply
}