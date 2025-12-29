import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { LegoBlock, BlockParams } from '../../types';
import { PROTOCOL_COLORS } from '../../constants';
import { Button } from '../ui/Button';

interface BlockConfigPanelProps {
  isOpen: boolean;
  block: LegoBlock | null;
  onClose: () => void;
  onUpdate: (blockId: string, newParams: BlockParams) => void;
  onDelete: (blockId: string) => void;
}

// Configuration for specific parameters
const FIELD_DEFINITIONS: Record<string, {
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  description?: string;
}> = {
  // Swap Params
  inputToken: { 
    label: 'Input Token', 
    type: 'select', 
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'Token to sell'
  },
  outputToken: { 
    label: 'Output Token', 
    type: 'select', 
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'Token to buy'
  },
  amount: { 
    label: 'Amount', 
    type: 'number', 
    min: 0,
    placeholder: '0.00' 
  },
  slippage: { 
    label: 'Max Slippage', 
    type: 'number', 
    min: 0.01, 
    max: 50, 
    step: 0.1, 
    suffix: '%',
    description: 'Transaction reverts if price changes more than this'
  },
  
  // Trigger Params
  targetPrice: { 
    label: 'Target Price', 
    type: 'number', 
    min: 0, 
    placeholder: '0.00',
    suffix: '$' 
  },
  condition: { 
    label: 'Trigger Condition', 
    type: 'select', 
    options: ['>=', '<=', '=='] 
  },
  
  // Stop Loss Params
  percentage: { 
    label: 'Drawdown Limit', 
    type: 'number', 
    min: 0.1, 
    max: 100, 
    step: 0.1, 
    suffix: '%' 
  },
  
  // Supply/Generic Params
  asset: { 
    label: 'Asset', 
    type: 'select', 
    options: ['ETH', 'USDC', 'DAI', 'WBTC'] 
  },
  collateral: {
    label: 'Use As Collateral',
    type: 'boolean'
  }
};

interface ParamFieldProps {
  name: string;
  value: string | number | boolean;
  onChange: (val: string | number | boolean) => void;
  definition?: typeof FIELD_DEFINITIONS[string];
}

const ParamField: React.FC<ParamFieldProps> = ({
  name,
  value,
  onChange,
  definition
}) => {
  const def = definition || { label: name, type: 'text' };
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let newVal: string | number | boolean = e.target.value;
    
    // Validation Logic
    if (def.type === 'number') {
      const numVal = parseFloat(newVal);
      if (def.min !== undefined && numVal < def.min) {
        setError(`Min value is ${def.min}`);
      } else if (def.max !== undefined && numVal > def.max) {
        setError(`Max value is ${def.max}`);
      } else {
        setError(null);
      }
    }
    
    onChange(newVal);
  };

  const handleBooleanChange = (val: boolean) => {
    onChange(val);
  };

  return (
    <div className="flex flex-col gap-2 mb-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
          {def.label}
        </label>
        {error && (
          <span className="text-[10px] text-alert-red flex items-center gap-1 font-bold">
            <AlertCircle size={10} /> {error}
          </span>
        )}
      </div>

      {def.type === 'select' ? (
        <div className="relative">
          <select 
            value={String(value)}
            onChange={handleChange}
            className="w-full h-12 px-4 border border-gray-300 focus:border-ink bg-white font-mono text-sm outline-none appearance-none rounded-none transition-colors cursor-pointer"
          >
            {def.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-4 top-4 pointer-events-none text-gray-500">
            <ChevronDown size={14} />
          </div>
        </div>
      ) : def.type === 'boolean' ? (
        <div className="flex items-center gap-4">
           <button 
             onClick={() => handleBooleanChange(true)}
             className={`flex-1 h-10 border text-xs font-bold uppercase ${value === true || value === 'true' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-gray-300'}`}
           >
             Yes
           </button>
           <button 
             onClick={() => handleBooleanChange(false)}
             className={`flex-1 h-10 border text-xs font-bold uppercase ${value === false || value === 'false' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-gray-300'}`}
           >
             No
           </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type={def.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={handleChange}
            placeholder={def.placeholder}
            min={def.min}
            max={def.max}
            step={def.step}
            className={`w-full h-12 px-4 border ${error ? 'border-alert-red focus:border-alert-red text-alert-red' : 'border-gray-300 focus:border-ink'} outline-none font-mono text-sm bg-white transition-colors`}
          />
          {def.suffix && (
            <div className="absolute right-4 top-3.5 text-gray-400 font-mono text-xs font-bold pointer-events-none">
              {def.suffix}
            </div>
          )}
        </div>
      )}
      
      {def.description && (
        <p className="text-[10px] text-gray-400 flex items-start gap-1">
            <Info size={10} className="mt-0.5" /> {def.description}
        </p>
      )}
    </div>
  );
};

export const BlockConfigPanel: React.FC<BlockConfigPanelProps> = ({
  isOpen,
  block,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [params, setParams] = useState<BlockParams>({});

  useEffect(() => {
    if (block) {
      setParams({ ...block.params });
    }
  }, [block]);

  const handleChange = (key: string, value: string | number | boolean) => {
    setParams((prev: BlockParams) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (block) {
        onUpdate(block.id, params);
        onClose();
    }
  };

  if (!block) return null;

  const accentColor = PROTOCOL_COLORS[block.protocol] || '#000';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 z-40"
            />

            <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-full w-[400px] bg-canvas border-l border-ink z-50 flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-gray-300 bg-white relative overflow-hidden shrink-0">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accentColor }} />
                    
                    <div className="pl-2">
                        <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-1">{block.protocol}</div>
                        <h2 className="text-sm font-bold uppercase tracking-wide">{block.label}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onDelete(block.id)} 
                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-alert-red transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-ink transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-canvas">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <h3 className="text-xs font-bold uppercase text-ink tracking-wider">Parameters</h3>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {block.id.slice(0,8)}</span>
                        </div>

                        <div className="space-y-6">
                            {Object.keys(params).map((key) => (
                                <ParamField 
                                    key={key}
                                    name={key}
                                    value={params[key]}
                                    onChange={(val) => handleChange(key, val)}
                                    definition={FIELD_DEFINITIONS[key]}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="h-20 border-t border-gray-300 bg-white px-8 flex justify-between items-center shrink-0">
                    <button 
                        onClick={() => setParams(block.params)} 
                        className="text-xs text-gray-400 underline decoration-gray-300 hover:text-ink transition-colors"
                    >
                        Reset to Defaults
                    </button>
                    <Button onClick={handleSave}>
                        Save Changes
                    </Button>
                </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};