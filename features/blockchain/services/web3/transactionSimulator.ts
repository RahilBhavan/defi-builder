/**
 * Transaction simulator for strategy execution
 * Estimates gas costs, checks approvals, validates balances
 */

import { type Address, formatUnits } from 'viem';
import type { LegoBlock } from '../../types';

export interface ApprovalRequirement {
  token: string;
  spender: string; // Contract address that needs approval
  amount: string; // Amount to approve
}

export interface BalanceCheck {
  token: string;
  required: string;
  current: string;
  sufficient: boolean;
}

export interface GasEstimate {
  blockType: string;
  estimatedGas: bigint;
  estimatedCostETH: string;
  estimatedCostUSD: number; // Assuming ETH price
}

export interface SimulationResult {
  success: boolean;
  totalGasEstimate: bigint;
  totalCostETH: string;
  totalCostUSD: number;
  gasEstimates: GasEstimate[];
  approvalsNeeded: ApprovalRequirement[];
  balanceChecks: BalanceCheck[];
  warnings: string[];
  errors: string[];
}

// Approximate gas costs per block type (in gas units)
const GAS_ESTIMATES: Record<string, bigint> = {
  uniswap_swap: 150000n,
  aave_supply: 200000n,
  aave_borrow: 250000n,
  aave_repay: 180000n,
  aave_withdraw: 150000n,
  uniswap_v3_liquidity: 400000n,
  compound_supply: 200000n,
  compound_borrow: 250000n,
  curve_swap: 180000n,
  balancer_swap: 200000n,
  oneinch_swap: 200000n,
  flash_loan: 300000n,
  staking: 150000n,
  default: 100000n,
};

// Contract addresses that need approvals (simplified)
const APPROVAL_CONTRACTS: Record<string, string> = {
  uniswap_swap: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Router
  aave_supply: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave Pool
  compound_supply: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', // Compound Comptroller
  curve_swap: '0x81C46fECa27B31F3ADC2b91eE4be9717d1cd3DD7', // Curve Router
  balancer_swap: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Balancer Vault
  oneinch_swap: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch Router
};

// ETH price for USD conversion (would be fetched from oracle in production)
const ETH_PRICE_USD = 3000;

/**
 * Simulate strategy execution
 * Estimates gas, checks approvals, validates balances
 */
export async function simulateStrategyExecution(
  blocks: LegoBlock[],
  userAddress: Address | undefined,
  userBalances: Map<string, string> = new Map()
): Promise<SimulationResult> {
  const gasEstimates: GasEstimate[] = [];
  const approvalsNeeded: ApprovalRequirement[] = [];
  const balanceChecks: BalanceCheck[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!userAddress) {
    return {
      success: false,
      totalGasEstimate: 0n,
      totalCostETH: '0',
      totalCostUSD: 0,
      gasEstimates: [],
      approvalsNeeded: [],
      balanceChecks: [],
      warnings: [],
      errors: ['Wallet not connected'],
    };
  }

  let totalGas = 0n;
  const processedTokens = new Set<string>();

  for (const block of blocks) {
    // Estimate gas for this block
    const blockGas = GAS_ESTIMATES[block.type] ?? GAS_ESTIMATES.default;
    totalGas += blockGas;

    // Estimate cost (assuming 20 gwei gas price)
    const gasPrice = 20n * 10n ** 9n; // 20 gwei
    const costWei = blockGas * gasPrice;
    const costETH = formatUnits(costWei, 18);
    const costUSD = Number.parseFloat(costETH) * ETH_PRICE_USD;

    gasEstimates.push({
      blockType: block.type,
      estimatedGas: blockGas,
      estimatedCostETH: costETH,
      estimatedCostUSD: costUSD,
    });

    // Check approvals needed
    const approvalContract = APPROVAL_CONTRACTS[block.type];
    if (approvalContract) {
      const token = getTokenFromBlock(block);
      if (token && !processedTokens.has(token)) {
        const amount = getAmountFromBlock(block);
        approvalsNeeded.push({
          token,
          spender: approvalContract,
          amount: amount || '0',
        });
        processedTokens.add(token);
      }
    }

    // Check balances
    if (block.params.amount || block.params.amount0) {
      const token = getTokenFromBlock(block);
      const required = getAmountFromBlock(block) || '0';
      const current = userBalances.get(token || '') || '0';

      if (token) {
        const sufficient = BigInt(current) >= BigInt(required);
        balanceChecks.push({
          token,
          required,
          current,
          sufficient,
        });

        if (!sufficient) {
          errors.push(
            `Insufficient balance for ${block.label}: Need ${required} ${token}, have ${current}`
          );
        }
      }
    }

    // Add warnings for risky operations
    if (block.type === 'flash_loan') {
      warnings.push('Flash loans must be repaid in the same transaction');
    }
    if (block.type === 'aave_borrow' || block.type === 'compound_borrow') {
      warnings.push('Borrowing requires sufficient collateral');
    }
  }

  // Calculate total cost
  const gasPrice = 20n * 10n ** 9n;
  const totalCostWei = totalGas * gasPrice;
  const totalCostETH = formatUnits(totalCostWei, 18);
  const totalCostUSD = Number.parseFloat(totalCostETH) * ETH_PRICE_USD;

  return {
    success: errors.length === 0,
    totalGasEstimate: totalGas,
    totalCostETH,
    totalCostUSD,
    gasEstimates,
    approvalsNeeded,
    balanceChecks,
    warnings,
    errors,
  };
}

/**
 * Extract token from block params
 */
function getTokenFromBlock(block: LegoBlock): string | null {
  if (block.params.inputToken) return String(block.params.inputToken);
  if (block.params.asset) return String(block.params.asset);
  if (block.params.token0) return String(block.params.token0);
  return null;
}

/**
 * Extract amount from block params
 */
function getAmountFromBlock(block: LegoBlock): string | null {
  if (block.params.amount) return String(block.params.amount);
  if (block.params.amount0) return String(block.params.amount0);
  return null;
}
