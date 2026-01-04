/**
 * Web3 Services
 * Exports all blockchain-related services
 */

export * from './config';
export {
  getGasPrices,
  estimateGas,
  formatGasPrice,
  type GasPriceData,
  type GasEstimate,
} from './gasEstimator';
export * from './transactionExecutor';
export * from './transactionHistory';
export {
  simulateStrategyExecution,
  type SimulationResult,
  type ApprovalRequirement,
  type BalanceCheck,
} from './transactionSimulator';
