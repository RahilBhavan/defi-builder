import React, { useState } from 'react';
import { ValidationResult } from '../../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ValidationStatusProps {
  validationResult: ValidationResult | null;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  validationResult,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isValid = validationResult?.valid ?? false;
  const errorCount = validationResult?.errors.length ?? 0;

  // Don't show anything if no validation result or if it's invalid but has no errors (empty strategy)
  if (!validationResult || (!isValid && errorCount === 0)) return null;

  return (
    <div className="relative">
      {/* Error details panel */}
      {showDetails && !isValid && errorCount > 0 && (
        <div className="absolute bottom-full left-0 mb-4 w-80 max-h-64 bg-white border-2 border-alert-red p-4 z-50 overflow-y-auto shadow-xl">
          <h3 className="text-xs font-bold uppercase mb-3 text-alert-red border-b border-red-100 pb-2">
            Validation Errors
          </h3>
          <div className="space-y-3">
            {validationResult.errors.map((error, i) => (
              <div key={i} className="text-xs">
                <p className="font-mono text-ink font-medium">ERROR {i+1}: {error.message}</p>
                {error.blockId && (
                  <p className="text-gray-400 mt-1 font-mono text-[10px]">ID: {error.blockId.slice(0,8)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails(prev => !prev)}
        className={`px-4 py-3 border ${
          isValid ? 'border-success-green text-success-green bg-white' : 'border-alert-red text-alert-red bg-white'
        } text-xs font-mono font-bold uppercase hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap`}
      >
        {isValid ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
        {isValid ? 'VALID STRATEGY' : `${errorCount} ERROR${errorCount > 1 ? 'S' : ''}`}
      </button>
    </div>
  );
};
