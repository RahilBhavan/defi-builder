import { Minus, Plus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ zoomLevel, onZoomChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoomLevel + 10, 160));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoomLevel - 10, 40));
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div
        className={`flex items-center gap-0 transition-all duration-300 shadow-lg rounded-lg overflow-hidden bg-white/95 backdrop-blur-sm ${
          isVisible ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 bg-white border-r border-gray-300 hover:border-ink hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
        <div className="w-16 h-9 bg-white border-y border-gray-300 flex items-center justify-center text-xs font-mono font-bold text-ink">
          {Math.round(zoomLevel)}%
        </div>
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 bg-white border-l border-gray-300 hover:border-ink hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
