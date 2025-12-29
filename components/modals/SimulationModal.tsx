/**
 * Simulation Modal
 * Shows transaction simulation results before execution
 */

import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, X, Zap } from 'lucide-react';
import type React from 'react';
import type { SimulationResult } from '../../services/web3/transactionSimulator';
import { Button } from '../ui/Button';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  result: SimulationResult | null;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  result,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-3xl h-[80vh] border-2 border-ink shadow-2xl relative flex flex-col z-50"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <div className="flex items-center gap-3">
            <Zap className="text-orange" size={20} />
            <h2 className="text-lg font-bold font-mono uppercase">Transaction Simulation</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-gray-500">
                Total Estimated Cost
              </span>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-ink">
                  {result.totalCostETH} ETH
                </div>
                <div className="text-xs text-gray-500">≈ ${result.totalCostUSD.toFixed(2)} USD</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Gas: {result.totalGasEstimate.toString()} units
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-alert-red" size={18} />
                <h3 className="text-sm font-bold uppercase text-alert-red">Errors</h3>
              </div>
              <ul className="space-y-2">
                {result.errors.map((error, index) => (
                  <li key={index} className="text-xs text-gray-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mb-6 p-4 bg-orange/10 border border-orange/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-orange" size={18} />
                <h3 className="text-sm font-bold uppercase text-orange">Warnings</h3>
              </div>
              <ul className="space-y-2">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="text-xs text-gray-700">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gas Estimates */}
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase text-ink mb-3 border-b border-gray-200 pb-2">
              Gas Estimates by Block
            </h3>
            <div className="space-y-2">
              {result.gasEstimates.map((estimate, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                >
                  <span className="text-xs font-mono text-gray-700">{estimate.blockType}</span>
                  <div className="text-right">
                    <div className="text-xs font-bold text-ink">
                      {estimate.estimatedCostETH} ETH
                    </div>
                    <div className="text-[10px] text-gray-500">
                      ${estimate.estimatedCostUSD.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approvals Needed */}
          {result.approvalsNeeded.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-ink mb-3 border-b border-gray-200 pb-2">
                Token Approvals Required
              </h3>
              <div className="space-y-2">
                {result.approvalsNeeded.map((approval, index) => (
                  <div key={index} className="p-3 bg-gray-50 border border-gray-200">
                    <div className="text-xs font-mono text-gray-700 mb-1">{approval.token}</div>
                    <div className="text-[10px] text-gray-500">
                      Approve {approval.amount} to {approval.spender.slice(0, 10)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance Checks */}
          {result.balanceChecks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-ink mb-3 border-b border-gray-200 pb-2">
                Balance Checks
              </h3>
              <div className="space-y-2">
                {result.balanceChecks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-3 border ${
                      check.sufficient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-700">{check.token}</span>
                      {check.sufficient ? (
                        <CheckCircle className="text-success-green" size={16} />
                      ) : (
                        <AlertCircle className="text-alert-red" size={16} />
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Required: {check.required} | Current: {check.current}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-gray-300 bg-white px-8 flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onProceed} disabled={!result.success}>
            {result.success ? 'Proceed with Execution' : 'Cannot Proceed'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
