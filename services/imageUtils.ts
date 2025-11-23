import { ColorStats } from "../types";

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Calculates the Mean and Standard Deviation for R, G, B channels.
 * This effectively captures the "Mood" or "Atmosphere" of an image.
 */
export const computeColorStats = (img: HTMLImageElement | HTMLCanvasElement): ColorStats => {
  const canvas = document.createElement('canvas');
  canvas.width = 100; // Downsample for speed, sufficient for stats
  canvas.height = 100 * (img.height / img.width);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not get canvas context");
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let rSum = 0, gSum = 0, bSum = 0;
  const pixelCount = data.length / 4;

  // 1. Calculate Mean
  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
  }

  const mean: [number, number, number] = [
    rSum / pixelCount / 255,
    gSum / pixelCount / 255,
    bSum / pixelCount / 255
  ];

  // 2. Calculate Variance / Std Dev
  let rVar = 0, gVar = 0, bVar = 0;
  for (let i = 0; i < data.length; i += 4) {
    rVar += Math.pow((data[i] / 255) - mean[0], 2);
    gVar += Math.pow((data[i + 1] / 255) - mean[1], 2);
    bVar += Math.pow((data[i + 2] / 255) - mean[2], 2);
  }

  const std: [number, number, number] = [
    Math.sqrt(rVar / pixelCount),
    Math.sqrt(gVar / pixelCount),
    Math.sqrt(bVar / pixelCount)
  ];

  return { mean, std };
};