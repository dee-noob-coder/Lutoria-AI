import { Preset } from './types';

export const PRESETS: Preset[] = [
  { 
    id: 'teal_orange', 
    name: 'Teal & Orange', 
    desc: 'Blockbuster Standard. Push shadows to teal, highlights to orange.', 
    gradientColors: ['#2C737E', '#FF9933'],
    defaultParams: {
        lift: [-0.05, -0.02, 0.05], // Teal shadows
        gamma: [1.0, 1.0, 1.0],
        gain: [1.1, 1.0, 0.9], // Orange highlights
        saturation: 1.2,
        temperature: 0.05,
        tint: 0
    }
  },
  { 
    id: 'joker', 
    name: 'Psychological', 
    desc: 'Unsettling greens and sickly yellows. High contrast.', 
    gradientColors: ['#4D9438', '#A52A2A'],
    defaultParams: {
        lift: [-0.02, 0.0, -0.02],
        gamma: [0.9, 1.1, 0.9], // Greenish mids
        gain: [1.0, 1.05, 0.9],
        saturation: 0.8,
        temperature: -0.05,
        tint: -0.1 // Green tint
    }
  },
  { 
    id: 'dune', 
    name: 'Arid Desert', 
    desc: 'Monochromatic warm sands. High dynamic range.', 
    gradientColors: ['#C4B47C', '#4A3D2D'],
    defaultParams: {
        lift: [0.0, 0.0, 0.0],
        gamma: [1.1, 1.0, 0.9],
        gain: [1.1, 1.0, 0.8], // Yellow/Warm
        saturation: 0.6, // Desaturated
        temperature: 0.15,
        tint: 0
    }
  },
  { 
    id: 'batman', 
    name: 'Noir City', 
    desc: 'Deep blacks, crushed shadows, sodium vapor orange.', 
    gradientColors: ['#1a1a1a', '#ca8a04'],
    defaultParams: {
        lift: [-0.1, -0.1, -0.1], // Crushed blacks
        gamma: [0.9, 0.9, 0.9],
        gain: [1.0, 0.9, 0.8],
        saturation: 1.1,
        temperature: 0.1,
        tint: 0
    }
  },
  { 
    id: 'matrix', 
    name: 'Cyber System', 
    desc: 'Distinctive green tint. Digital atmosphere.', 
    gradientColors: ['#003b00', '#00ff41'],
    defaultParams: {
        lift: [-0.05, 0.0, -0.05],
        gamma: [0.8, 1.2, 0.8], // Heavy green gamma
        gain: [0.9, 1.1, 0.9],
        saturation: 0.9,
        temperature: 0,
        tint: -0.15
    }
  },
  { 
    id: 'wes', 
    name: 'Pastel Symmetry', 
    desc: 'Soft pastel colors, warm yellows and pinks.', 
    gradientColors: ['#fca5a5', '#fde047'],
    defaultParams: {
        lift: [0.1, 0.1, 0.1], // Lifted blacks (matte)
        gamma: [1.0, 1.0, 1.0],
        gain: [1.0, 0.95, 0.9],
        saturation: 1.3,
        temperature: 0.1,
        tint: 0.05
    }
  },
];

export const MOCK_IMAGE = "https://picsum.photos/1920/1080";