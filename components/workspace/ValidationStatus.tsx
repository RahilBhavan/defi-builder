import { AlertTriangle, CheckCircle } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { ValidationResult } from '../../types';

interface ValidationStatusProps {
  validationResult: ValidationResult | null;
  isValidating?: boolean;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  validationResult,
  isValidating = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isValid = validationResult?.valid ?? false;
  const errorCount = validationResult?.errors.length ?? 0;

  // Show validating state
  if (isValidating) {
    return (
      <div className="px-4 py-3 border border-gray-300 text-gray-500 bg-white text-xs font-mono font-bold uppercase flex items-center gap-2 shadow-sm whitespace-nowrap">
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        VALIDATING...
      </div>
    );
  }

  // Don't show anything if no validation result or if it's invalid but has no errors (empty strategy)
  if (!validationResult || (!isValid && errorCount === 0)) return null;

  return (
    <div className="relative">
      {/* Error details panel */}
      {showDetails && !isValid && errorCount > 0 && (
        <div className="absolute bottom-full left-0 mb-4 w-80 max-h-64 bg-white border-2 border-alert-red rounded-lg p-4 z-50 overflow-y-auto shadow-xl">
          <h3 className="text-xs font-bold uppercase mb-3 text-alert-red border-b border-red-100 pb-2">
            Validation Errors ({errorCount})
          </h3>
          <div className="space-y-3">
            {validationResult.errors.map((error, i) => (
              <div key={i} className="text-xs p-2 bg-red-50 rounded border border-red-100">
                <p className="font-mono text-ink font-semibold mb-1">
                  {i + 1}. {error.message}
                </p>
                {error.blockId && (
                  <p className="text-gray-500 mt-1 font-mono text-[10px]">
                    Block ID: {error.blockId.slice(0, 8)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className={`px-4 py-2 border rounded-lg ${
          isValid
            ? 'border-success-green text-success-green bg-success-green/5 hover:bg-success-green/10'
            : 'border-alert-red text-alert-red bg-alert-red/5 hover:bg-alert-red/10'
        } text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 shadow-sm whitespace-nowrap`}
      >
        {isValid ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
        {isValid ? 'VALID' : `${errorCount} ERROR${errorCount > 1 ? 'S' : ''}`}
      </button>
    </div>
  );
};
