import React from 'react';
import { LegoBlock } from '../types';
import { Block } from './Block';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface SpineProps {
  blocks: LegoBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onOpenSuggester: () => void;
}

export const Spine: React.FC<SpineProps> = ({ 
  blocks, 
  selectedBlockId, 
  onSelectBlock, 
  onDeleteBlock,
  onOpenSuggester
}) => {
  return (
    <div 
      className="w-full min-h-full flex flex-col items-center py-24 px-4"
      onClick={() => onSelectBlock(null)}
    >
      <div className="w-full max-w-[600px] flex flex-col gap-6">
        
        {/* Empty State */}
        {blocks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-64 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-white/50"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSuggester();
            }}
          >
            <span className="text-4xl mb-4 text-gray-300 font-thin">+</span>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Add Your First Block</p>
            <p className="text-xs text-gray-400 font-mono mt-2">Click to open AI Palette</p>
          </motion.div>
        )}

        <AnimatePresence>
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Connector */}
              {index > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 40, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-px bg-success-green mx-auto relative flex items-center justify-center"
                >
                    <div className="bg-canvas border border-success-green text-success-green p-1 rounded-full z-10">
                        <ArrowDown size={12} />
                    </div>
                </motion.div>
              )}
              
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <Block 
                  block={block} 
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              </motion.div>
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Add Button at bottom if blocks exist */}
        {blocks.length > 0 && (
           <motion.div 
             layout
             className="mx-auto mt-8"
           >
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenSuggester();
                }}
                className="w-12 h-12 bg-white border border-gray-300 hover:border-ink hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-ink transition-all shadow-sm group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">+</span>
              </button>
           </motion.div>
        )}
      </div>
      
      {/* Bottom padding for scrolling */}
      <div className="h-48 flex-shrink-0" />
    </div>
  );
};
