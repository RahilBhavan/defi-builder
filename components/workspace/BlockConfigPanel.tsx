import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronDown, Info, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { validateJsonObject, validateNumberRange, validateStringLength } from '../../utils/validation';
import { PROTOCOL_COLORS } from '../../constants';
import type { BlockParams, LegoBlock } from '../../types';
import { Button } from '../ui/Button';

interface BlockConfigPanelProps {
  isOpen: boolean;
  block: LegoBlock | null;
  onClose: () => void;
  onUpdate: (blockId: string, newParams: BlockParams) => void;
  onDelete: (blockId: string) => void;
}

// Configuration for specific parameters
const FIELD_DEFINITIONS: Record<
  string,
  {
    label: string;
    type: 'select' | 'number' | 'text' | 'boolean';
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    placeholder?: string;
    description?: string;
  }
> = {
  // Swap Params
  inputToken: {
    label: 'Input Token',
    type: 'select',
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'Token to sell',
  },
  outputToken: {
    label: 'Output Token',
    type: 'select',
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'Token to buy',
  },
  amount: {
    label: 'Amount',
    type: 'number',
    min: 0,
    placeholder: '0.00',
  },
  slippage: {
    label: 'Max Slippage',
    type: 'number',
    min: 0.01,
    max: 50,
    step: 0.1,
    suffix: '%',
    description: 'Transaction reverts if price changes more than this',
  },

  // Trigger Params
  targetPrice: {
    label: 'Target Price',
    type: 'number',
    min: 0,
    placeholder: '0.00',
    suffix: '$',
  },
  condition: {
    label: 'Trigger Condition',
    type: 'select',
    options: ['>=', '<=', '=='],
  },

  // Stop Loss Params
  percentage: {
    label: 'Drawdown Limit',
    type: 'number',
    min: 0.1,
    max: 100,
    step: 0.1,
    suffix: '%',
  },

  // Supply/Generic Params
  asset: {
    label: 'Asset',
    type: 'select',
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK', 'UNI'],
  },
  collateral: {
    label: 'Use As Collateral',
    type: 'boolean',
  },

  // Time Trigger Params
  schedule: {
    label: 'Schedule (Cron)',
    type: 'text',
    placeholder: '0 9 * * *',
    description: 'Cron expression (e.g., "0 9 * * *" for 9 AM daily)',
  },
  timezone: {
    label: 'Timezone',
    type: 'select',
    options: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'],
    description: 'Timezone for schedule',
  },

  // Volume Trigger Params
  minVolume: {
    label: 'Minimum Volume',
    type: 'number',
    min: 0,
    placeholder: '1000000',
    description: 'Minimum trading volume to trigger',
  },
  timeframe: {
    label: 'Timeframe',
    type: 'select',
    options: ['1h', '4h', '24h', '7d'],
    description: 'Time period for volume calculation',
  },

  // Technical Indicator Params
  indicator: {
    label: 'Indicator',
    type: 'select',
    options: ['RSI', 'MACD', 'BB', 'MA'],
    description: 'Technical indicator to use',
  },
  value: {
    label: 'Target Value',
    type: 'number',
    placeholder: '0.00',
    description: 'Target value for indicator',
  },
  period: {
    label: 'Period',
    type: 'number',
    min: 1,
    max: 200,
    placeholder: '14',
    description: 'Period for indicator calculation',
  },

  // Aave Borrow/Repay Params
  interestRateMode: {
    label: 'Interest Rate Mode',
    type: 'select',
    options: ['stable', 'variable'],
    description: 'Stable or variable interest rate',
  },

  // Uniswap V3 Liquidity Params
  token0: {
    label: 'Token 0',
    type: 'select',
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'First token in pair',
  },
  token1: {
    label: 'Token 1',
    type: 'select',
    options: ['ETH', 'USDC', 'DAI', 'WBTC', 'AAVE', 'LINK'],
    description: 'Second token in pair',
  },
  amount0: {
    label: 'Amount 0',
    type: 'number',
    min: 0,
    placeholder: '0.00',
  },
  amount1: {
    label: 'Amount 1',
    type: 'number',
    min: 0,
    placeholder: '0.00',
  },
  feeTier: {
    label: 'Fee Tier',
    type: 'select',
    options: ['500', '3000', '10000'],
    description: 'Fee tier: 0.05%, 0.3%, or 1%',
  },
  tickLower: {
    label: 'Tick Lower',
    type: 'number',
    placeholder: 'Optional',
  },
  tickUpper: {
    label: 'Tick Upper',
    type: 'number',
    placeholder: 'Optional',
  },

  // Curve/Balancer Swap Params
  pool: {
    label: 'Pool (Optional)',
    type: 'text',
    placeholder: 'Pool address or name',
  },

  // Flash Loan Params
  protocol: {
    label: 'Protocol',
    type: 'select',
    options: ['aave'],
    description: 'Protocol for flash loan',
  },

  // Staking Params
  stakingType: {
    label: 'Staking Type',
    type: 'select',
    options: ['eth2', 'token', 'liquidity'],
    description: 'Type of staking',
  },

  // Take Profit Params (percentage already defined)

  // Time Exit Params
  duration: {
    label: 'Duration',
    type: 'number',
    min: 0,
    placeholder: '86400000',
    description: 'Duration in milliseconds (e.g., 86400000 = 24 hours)',
  },
  from: {
    label: 'Start From',
    type: 'select',
    options: ['entry', 'position'],
    description: 'When to start counting duration',
  },

  // Conditional Exit Params (mapped from 'condition' for conditional_exit blocks)
  exitCondition: {
    label: 'Condition',
    type: 'text',
    placeholder: 'profit > 1000',
    description: 'Expression to evaluate (e.g., "profit > 1000")',
  },

  // Position Sizing Params
  method: {
    label: 'Sizing Method',
    type: 'select',
    options: ['fixed', 'percentage', 'kelly', 'risk_based'],
    description: 'Method for calculating position size',
  },
  maxPosition: {
    label: 'Max Position Size',
    type: 'number',
    min: 0,
    max: 100,
    suffix: '%',
    description: 'Maximum position size as percentage of portfolio',
  },

  // Risk Limits Params
  maxDrawdown: {
    label: 'Max Drawdown',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    suffix: '%',
    description: 'Maximum allowed drawdown',
  },
  maxPositionSize: {
    label: 'Max Position Size',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    suffix: '%',
    description: 'Maximum position size',
  },
  maxLeverage: {
    label: 'Max Leverage',
    type: 'number',
    min: 1,
    max: 100,
    step: 0.1,
    description: 'Maximum leverage allowed',
  },
  maxDailyLoss: {
    label: 'Max Daily Loss',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    suffix: '%',
    description: 'Maximum daily loss allowed',
  },

  // Rebalancing Params
  targetAllocation: {
    label: 'Target Allocation',
    type: 'text',
    placeholder: '{"ETH": 40, "USDC": 30, "WBTC": 30}',
    description: 'JSON object with token allocations (percentages)',
  },
  threshold: {
    label: 'Rebalance Threshold',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    suffix: '%',
    description: 'Rebalance when deviation exceeds this',
  },
};

interface ParamFieldProps {
  name: string;
  value: string | number | boolean;
  onChange: (val: string | number | boolean) => void;
  definition?: (typeof FIELD_DEFINITIONS)[string];
}

const ParamField: React.FC<ParamFieldProps> = ({ name, value, onChange, definition }) => {
  const def = definition || { label: name, type: 'text' };
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = (val: string | number | boolean): string | null => {
    // Number validation using utility function
    if (def.type === 'number') {
      const error = validateNumberRange(val, def.min, def.max, def.label || name);
      if (error) {
        // Add suffix if provided
        return def.suffix ? `${error}${def.suffix}` : error;
      }
    }

    // Text validation
    if (def.type === 'text') {
      const strVal = String(val);
      
      // JSON validation for targetAllocation using utility function
      if (name === 'targetAllocation') {
        const jsonError = validateJsonObject(strVal, {
          required: true,
          fieldName: 'Target Allocation',
          validateValues: (value) => {
            if (typeof value !== 'number') return false;
            return value >= 0 && value <= 100;
          },
        });
        if (jsonError) {
          // Provide more specific error message for JSON format
          return jsonError.includes('required')
            ? jsonError
            : 'Invalid JSON format. Example: {"ETH": 40, "USDC": 30, "WBTC": 30}';
        }
      }

      // Length validation using utility function
      const lengthError = validateStringLength(strVal, undefined, def.maxLength || 500, def.label || name);
      if (lengthError) return lengthError;
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newVal: string | number | boolean = e.target.value;

    // Real-time validation (only show errors if field has been touched)
    if (touched) {
      const validationError = validate(newVal);
      setError(validationError);
    }

    onChange(newVal);
  };

  const handleBlur = () => {
    setTouched(true);
    const validationError = validate(value);
    setError(validationError);
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
            onBlur={handleBlur}
            className={`w-full h-12 px-4 border ${error ? 'border-alert-red focus:border-alert-red' : 'border-gray-300 focus:border-ink'} bg-white font-mono text-sm outline-none appearance-none rounded-none transition-colors cursor-pointer`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            {def.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-4 pointer-events-none text-gray-500">
            <ChevronDown size={14} />
          </div>
          {error && (
            <div id={`${name}-error`} className="sr-only" role="alert">
              {error}
            </div>
          )}
        </div>
      ) : def.type === 'boolean' ? (
        <div className="flex items-center gap-4" role="group" aria-label={def.label}>
          <button
            onClick={() => handleBooleanChange(true)}
            aria-pressed={value === true || value === 'true'}
            className={`flex-1 h-10 border text-xs font-bold uppercase ${value === true || value === 'true' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-gray-300'}`}
          >
            Yes
          </button>
          <button
            onClick={() => handleBooleanChange(false)}
            aria-pressed={value === false || value === 'false'}
            className={`flex-1 h-10 border text-xs font-bold uppercase ${value === false || value === 'false' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-gray-300'}`}
          >
            No
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type={def.type === 'number' ? 'number' : 'text'}
            value={String(value ?? '')}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={def.placeholder}
            min={def.min}
            max={def.max}
            step={def.step}
            className={`w-full h-12 px-4 border ${error ? 'border-alert-red focus:border-alert-red text-alert-red' : 'border-gray-300 focus:border-ink'} outline-none font-mono text-sm bg-white transition-colors`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
          />
          {def.suffix && (
            <div className="absolute right-4 top-3.5 text-gray-400 font-mono text-xs font-bold pointer-events-none">
              {def.suffix}
            </div>
          )}
          {error && (
            <div id={`${name}-error`} className="sr-only" role="alert">
              {error}
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
  onDelete,
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
    if (!block) return;

    // Validate all fields before saving
    let hasErrors = false;
    const paramKeys = Object.keys(params);
    
    for (const key of paramKeys) {
      const def = FIELD_DEFINITIONS[key];
      if (def) {
        const value = params[key];
        // Basic validation - check required fields
        if (def.type === 'number' && (value === '' || value === null || value === undefined)) {
          hasErrors = true;
          break;
        }
        if (def.type === 'text' && key === 'targetAllocation') {
          const jsonError = validateJsonObject(String(value), { required: true });
          if (jsonError) {
            hasErrors = true;
            break;
          }
        }
      }
    }

    if (hasErrors) {
      // Show error message - validation errors should be visible in the UI
      return;
    }

    onUpdate(block.id, params);
    onClose();
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
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[400px] bg-canvas border-l border-ink z-50 flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-config-title"
          >
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-8 border-b border-gray-300 bg-white relative overflow-hidden shrink-0">
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />

              <div className="pl-2">
                <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-1" aria-hidden="true">
                  {block.protocol}
                </div>
                <h2 id="block-config-title" className="text-sm font-bold uppercase tracking-wide">
                  {block.label} Configuration
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDelete(block.id)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-alert-red transition-colors"
                  aria-label={`Delete ${block.label} block`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-ink transition-colors"
                  aria-label="Close block configuration panel"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-canvas">
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-xs font-bold uppercase text-ink tracking-wider">
                    Parameters
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    ID: {block.id.slice(0, 8)}
                  </span>
                </div>

                <div className="space-y-6">
                  {Object.keys(params).map((key) => {
                    // Handle duplicate 'condition' key: use different definitions based on block type
                    let definitionKey = key;
                    if (key === 'condition' && block.type === 'conditional_exit') {
                      definitionKey = 'exitCondition';
                    }

                    return (
                      <ParamField
                        key={key}
                        name={key}
                        value={params[key] ?? ''}
                        onChange={(val) => handleChange(key, val)}
                        definition={FIELD_DEFINITIONS[definitionKey]}
                      />
                    );
                  })}
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
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
