
import { Preset } from './types';

// Cinematic Presets calibrated for the ACES pipeline with specific film emulation
export const PRESETS: Preset[] = [
  { 
    id: 'dune_arrakis', 
    name: 'Dune (Arrakis)', 
    desc: 'Desert heat. Golden highlights, muted cyan shadows, soft rolloff. High dynamic range.', 
    gradientColors: ['#ad8a58', '#425861'],
    defaultParams: {
        lift: [-0.02, 0.0, 0.02], // Teal-ish deep blacks
        gamma: [1.0, 1.0, 1.0],
        gain: [1.15, 1.08, 0.9], // Strong Gold/Amber highlights
        saturation: 0.85, // Muted overall
        temperature: 0.15, // Very Warm
        tint: 0.0,
        contrast: 0.15, // Soft film contrast
        vignette: 0.3,
        grain: 0.35, // Sand texture
        crosstalk: 0.25, // Analog feel
        satRolloff: 0.6, // Strong desaturation in brights
        shadowTint: [0.0, 0.04, 0.06], // Cyan shadows
        highlightTint: [0.08, 0.04, 0.0] // Amber highs
    }
  },
  { 
    id: 'nolan_classic', 
    name: 'Tenet', 
    desc: 'Blockbuster Teal & Orange. Deep clean blacks, amber highlights, sharp contrast.', 
    gradientColors: ['#0f3945', '#ea8635'],
    defaultParams: {
        lift: [-0.04, -0.02, 0.0],
        gamma: [0.98, 0.98, 0.98],
        gain: [1.05, 1.02, 0.95], // Amber
        saturation: 1.1, // Rich
        temperature: 0.0,
        tint: 0.0,
        contrast: 0.2, // Cinematic pop
        vignette: 0.25,
        grain: 0.2, // Clean 35mm
        crosstalk: 0.15,
        satRolloff: 0.4,
        shadowTint: [0.0, 0.05, 0.1], // Teal
        highlightTint: [0.1, 0.08, 0.0] // Orange
    }
  },
  { 
    id: 'joker_2019', 
    name: 'Joker', 
    desc: 'Psychological thriller. Unsettling greens, industrial lighting, dirty shadows.', 
    gradientColors: ['#2b4a3b', '#d1b06b'],
    defaultParams: {
        lift: [-0.03, -0.01, -0.03], // Crushed blacks
        gamma: [0.95, 1.02, 0.95], // Greenish mids
        gain: [1.05, 1.02, 0.9], // Tungsten yellow highs
        saturation: 0.9,
        temperature: -0.05,
        tint: -0.25, // Heavy Green/Cyan shift
        contrast: 0.25, // Gritty contrast
        vignette: 0.45, // Heavy focus
        grain: 0.5, // 16mm vibe
        crosstalk: 0.4,
        satRolloff: 0.2,
        shadowTint: [0.0, 0.08, 0.06], // Sickly Green shadows
        highlightTint: [0.05, 0.05, 0.0] // Dirty yellow highs
    }
  },
  { 
    id: 'the_batman', 
    name: 'The Batman', 
    desc: 'Noir Gothic. Deep blacks, muted colors, red-toned highlights. Stylized and dark.', 
    gradientColors: ['#0a0a0a', '#7f1d1d'],
    defaultParams: {
        lift: [-0.05, -0.05, -0.02], // Blue/Black shadows
        gamma: [0.95, 0.95, 0.95],
        gain: [1.1, 0.9, 0.9], // Red push in highs
        saturation: 0.7, // Heavy desaturation
        temperature: 0.0,
        tint: 0.1, // Slight magenta/red bias
        contrast: 0.4, // High Drama
        vignette: 0.5,
        grain: 0.6,
        crosstalk: 0.1,
        satRolloff: 0.8,
        shadowTint: [0.0, 0.0, 0.1], // Deep Blue shadows
        highlightTint: [0.15, 0.0, 0.0] // Blood Red highs
    }
  },
  { 
    id: 'golden_hour', 
    name: 'Golden Hour', 
    desc: 'Magic Hour. Rich oranges, soft shadows, bloom simulation.', 
    gradientColors: ['#7c2d12', '#fcd34d'],
    defaultParams: {
        lift: [0.0, 0.0, 0.0],
        gamma: [1.05, 1.0, 0.95],
        gain: [1.2, 1.1, 0.9], // Heavy Gold
        saturation: 1.3,
        temperature: 0.2,
        tint: 0.0,
        contrast: 0.1,
        vignette: 0.3,
        grain: 0.2,
        crosstalk: 0.2,
        satRolloff: 0.9, // Glowing sun
        shadowTint: [0.05, 0.02, 0.0], // Warm shadows too
        highlightTint: [0.2, 0.1, 0.0] // Intense sun
    }
  }
];

export const MOCK_IMAGE = "https://picsum.photos/1920/1080";
