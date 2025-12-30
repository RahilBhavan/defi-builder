import { Activity, ArrowRightLeft, Box, Landmark, MoreHorizontal, Shield } from 'lucide-react';
import React from 'react';
import { PROTOCOL_COLORS } from '../constants';
import { type LegoBlock, Protocol } from '../types';

interface BlockProps {
  block: LegoBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'swap':
      return <ArrowRightLeft size={20} />;
    case 'supply':
      return <Landmark size={20} />;
    case 'trigger':
      return <Activity size={20} />;
    case 'shield':
      return <Shield size={20} />;
    default:
      return <Box size={20} />;
  }
};

export const Block: React.FC<BlockProps> = React.memo(
  ({ block, isSelected, onSelect, onDelete }) => {
    const accentColor = PROTOCOL_COLORS[block.protocol] || PROTOCOL_COLORS[Protocol.GENERIC];

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onSelect();
          }
        }}
        role="button"
        tabIndex={0}
        className={`
        relative w-full max-w-[700px] bg-white border rounded-lg p-4 sm:p-6
        transition-all duration-200 cursor-grab active:cursor-grabbing group shadow-md hover:shadow-lg
        touch-manipulation
        ${isSelected ? 'border-2 ring-2 ring-offset-2' : 'border border-gray-300 hover:border-gray-400'}
        hover:scale-[1.01] active:scale-[0.99]
        sm:hover:scale-[1.01] sm:active:scale-[0.99]
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

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div
              className="text-gray-800 p-3 bg-gray-50 border border-gray-200 rounded-lg"
              style={{
                backgroundColor: isSelected ? `${accentColor}10` : undefined,
                borderColor: isSelected ? accentColor : undefined,
              }}
            >
              {getIcon(block.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-mono uppercase px-2 py-1 border rounded"
                  style={{
                    color: accentColor,
                    borderColor: isSelected ? accentColor : '#e5e7eb',
                    backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                  }}
                >
                  {block.protocol}
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink uppercase tracking-wide">{block.label}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-alert-red hover:bg-red-50 transition-all p-2 rounded-lg"
            aria-label={`Delete ${block.label} block`}
            title="Delete block"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Params Preview */}
        {Object.keys(block.params).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {Object.entries(block.params).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-mono font-bold mb-1.5 tracking-wider">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm text-ink font-mono font-semibold truncate bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.block.id === nextProps.block.id &&
      prevProps.block.params === nextProps.block.params &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);
