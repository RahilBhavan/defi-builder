import React from 'react';
import { LegoBlock, Protocol } from '../types';
import { PROTOCOL_COLORS } from '../constants';
import { MoreHorizontal, ArrowRightLeft, Landmark, Activity, Shield, Box } from 'lucide-react';

interface BlockProps {
  block: LegoBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'swap': return <ArrowRightLeft size={20} />;
    case 'supply': return <Landmark size={20} />;
    case 'trigger': return <Activity size={20} />;
    case 'shield': return <Shield size={20} />;
    default: return <Box size={20} />;
  }
};

export const Block: React.FC<BlockProps> = React.memo(({ block, isSelected, onSelect, onDelete }) => {
  const accentColor = PROTOCOL_COLORS[block.protocol] || PROTOCOL_COLORS[Protocol.GENERIC];
  
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`
        relative w-full max-w-[600px] bg-white border p-6
        transition-all duration-200 cursor-pointer group shadow-sm
        ${isSelected ? 'border-2' : 'border border-gray-300 hover:border-ink hover:border-2'}
      `}
      style={{ 
        borderColor: isSelected ? accentColor : undefined,
      }}
    >
      {/* Selection Indicator Line */}
      {isSelected && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ backgroundColor: accentColor }}
          />
      )}

      {/* Hover Indicator Line (thinner) */}
      {!isSelected && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: accentColor }}
          />
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-gray-800 p-2 bg-gray-50 border border-gray-100">{getIcon(block.icon)}</div>
          <div>
            <div className="flex items-center gap-2">
                <span 
                    className="text-[10px] font-mono uppercase px-1.5 py-0.5 border"
                    style={{ 
                        color: accentColor, 
                        borderColor: isSelected ? accentColor : '#e5e7eb',
                        backgroundColor: isSelected ? `${accentColor}10` : 'transparent'
                    }}
                >
                    {block.protocol}
                </span>
            </div>
            <h3 className="text-base font-bold text-ink uppercase mt-1 tracking-wide">{block.label}</h3>
          </div>
        </div>
        
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onDelete();
            }}
            className="text-gray-300 hover:text-alert-red transition-colors p-2"
            aria-label={`Delete ${block.label} block`}
        >
            <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Params Preview */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-y-4 gap-x-8">
        {Object.entries(block.params).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-mono font-bold mb-1 tracking-wider">{key}</span>
            <span className="text-sm text-ink font-mono font-medium truncate">
                {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.params === nextProps.block.params &&
    prevProps.isSelected === nextProps.isSelected
  );
});
