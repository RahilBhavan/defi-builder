import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomChange,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoomLevel + 10, 160));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoomLevel - 10, 40));
  };

  return (
    <div
      className="fixed bottom-12 right-12 z-40"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div
        className={`flex items-center gap-0 transition-opacity duration-300 shadow-sm ${
          isVisible ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white border border-gray-300 hover:border-ink transition-colors flex items-center justify-center"
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
        <div className="w-16 h-8 bg-white border-y border-gray-300 flex items-center justify-center text-xs font-mono font-bold">
          {Math.round(zoomLevel)}%
        </div>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white border border-gray-300 hover:border-ink transition-colors flex items-center justify-center"
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
