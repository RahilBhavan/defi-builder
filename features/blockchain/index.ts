/**
 * Blockchain Feature
 * 
 * All components, services, hooks, and types related to blockchain integration
 */

// Components
export { NetworkBadge } from './components/NetworkBadge';
export { ExecuteButton } from './components/ExecuteButton';

// Services
export * from './services/web3/config';
export * from './services/web3/transactionSimulator';
export * from './services/execution';

// Hooks
export { useWallet } from './hooks/useWallet';
export { useNetwork } from './hooks/useNetwork';

