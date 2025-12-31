/**
 * Real Gas Estimation Service
 * Fetches actual gas prices from the network and estimates transaction costs
 */

import { type Address, type PublicClient, createPublicClient, formatUnits, http } from 'viem';
import { arbitrum, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';

export interface GasPriceData {
  slow: bigint; // Gas price for slow transactions (gwei)
  standard: bigint; // Gas price for standard transactions (gwei)
  fast: bigint; // Gas price for fast transactions (gwei)
  instant: bigint; // Gas price for instant transactions (gwei)
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint; // For EIP-1559
  maxPriorityFeePerGas?: bigint; // For EIP-1559
  estimatedCost: string; // Cost in ETH
  estimatedCostUSD: number; // Cost in USD
}

/**
 * Get public client for a chain
 */
function getPublicClient(chainId: number): PublicClient {
  const chains = { [sepolia.id]: sepolia, [mainnet.id]: mainnet, [polygon.id]: polygon, [arbitrum.id]: arbitrum, [optimism.id]: optimism };
  const chain = chains[chainId as keyof typeof chains];
  
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
}

/**
 * Get current gas prices from the network
 */
export async function getGasPrices(chainId: number): Promise<GasPriceData> {
  try {
    const publicClient = getPublicClient(chainId);

    // Get fee data (EIP-1559)
    const feeData = await publicClient.estimateFeesPerGas();
    
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 network
      const baseFee = feeData.maxFeePerGas - feeData.maxPriorityFeePerGas;
      const priorityFee = feeData.maxPriorityFeePerGas;
      
      return {
        slow: baseFee + priorityFee, // 1x priority
        standard: baseFee + (priorityFee * 3n) / 2n, // 1.5x priority
        fast: baseFee + priorityFee * 2n, // 2x priority
        instant: baseFee + priorityFee * 3n, // 3x priority
      };
    } else {
      // Legacy network
      const gasPrice = await publicClient.getGasPrice();
      return {
        slow: gasPrice * 8n / 10n, // 80% of current
        standard: gasPrice,
        fast: gasPrice * 12n / 10n, // 120% of current
        instant: gasPrice * 15n / 10n, // 150% of current
      };
    }
  } catch (error) {
    // Fallback to default estimates
    const defaultGwei = 20n;
    const defaultWei = defaultGwei * 10n ** 9n;
    
    return {
      slow: defaultWei * 8n / 10n,
      standard: defaultWei,
      fast: defaultWei * 12n / 10n,
      instant: defaultWei * 15n / 10n,
    };
  }
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  chainId: number,
  transaction: {
    to?: Address;
    from?: Address;
    data?: `0x${string}`;
    value?: bigint;
  },
  speed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard'
): Promise<GasEstimate> {
  try {
    const publicClient = getPublicClient(chainId);

    // Estimate gas limit
    const gasLimit = await publicClient.estimateGas({
      account: transaction.from,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
    });

    // Get gas prices
    const gasPrices = await getGasPrices(chainId);
    const gasPrice = gasPrices[speed];

    // Get ETH price for USD conversion (would fetch from oracle in production)
    const ethPriceUSD = await getETHPriceUSD();

    // Calculate cost
    const totalCost = gasLimit * gasPrice;
    const costETH = formatUnits(totalCost, 18);
    const costUSD = Number.parseFloat(costETH) * ethPriceUSD;

    // Get fee data for EIP-1559
    const feeData = await publicClient.estimateFeesPerGas();
    
    return {
      gasLimit,
      gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      estimatedCost: costETH,
      estimatedCostUSD: costUSD,
    };
  } catch (error) {
    // Fallback estimation
    const defaultGasLimit = 210000n; // Standard transaction
    const gasPrices = await getGasPrices(chainId);
    const gasPrice = gasPrices[speed];
    const totalCost = defaultGasLimit * gasPrice;
    const costETH = formatUnits(totalCost, 18);
    const ethPriceUSD = await getETHPriceUSD();
    const costUSD = Number.parseFloat(costETH) * ethPriceUSD;

    return {
      gasLimit: defaultGasLimit,
      gasPrice,
      estimatedCost: costETH,
      estimatedCostUSD: costUSD,
    };
  }
}

/**
 * Get ETH price in USD (simplified - would use oracle in production)
 */
async function getETHPriceUSD(): Promise<number> {
  try {
    // In production, fetch from CoinGecko or Chainlink oracle
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json() as { ethereum?: { usd?: number } };
    return data.ethereum?.usd || 3000;
  } catch {
    return 3000; // Fallback price
  }
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = gasPrice / 10n ** 9n;
  return `${gwei.toString()} gwei`;
}

