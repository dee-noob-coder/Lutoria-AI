import React, { useState, useRef, useEffect } from 'react';
import { Layers, ScanEye } from 'lucide-react';

interface ComparisonViewerProps {
  beforeImage: string | null;
  afterImage: string | null;
  isProcessing: boolean;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({ beforeImage, afterImage, isProcessing }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Handle drag for slider
  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, x)));
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove as any);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, []);

  if (!beforeImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg">
        <div className="p-8 rounded-full bg-zinc-900 mb-4">
          <ScanEye className="w-12 h-12 text-zinc-700" />
        </div>
        <p className="text-zinc-500 font-medium">Import footage to begin grading</p>
      </div>
    );
  }

  // If we only have before image or currently processing
  if (!afterImage || isProcessing) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg border border-zinc-800">
        <img src={beforeImage} alt="Source" className="w-full h-full object-contain" />
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-indigo-400 font-mono animate-pulse">RENDERING FINAL PRINT...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none cursor-col-resize overflow-hidden rounded-lg border border-zinc-800 bg-black"
      onMouseDown={handleMouseDown}
    >
      {/* Before Image (Background) */}
      <img 
        src={beforeImage} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
      />

      {/* After Image (Clipped Foreground) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={afterImage} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-contain max-w-none"
          // We need max-w-none + explicit width logic if purely absolute, 
          // but object-contain usually handles aspect ratio. 
          // For perfect alignment, assumption is images are same aspect ratio.
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
          <Layers className="w-4 h-4 text-black" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-indigo-600/80 backdrop-blur text-white text-xs px-2 py-1 rounded border border-indigo-400/30 pointer-events-none">
        After
      </div>
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 pointer-events-none">
        Before
      </div>
    </div>
  );
};
