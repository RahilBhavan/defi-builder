# Sepolia Testnet Support

This document describes the comprehensive Sepolia testnet support implemented in the DeFi Builder application.

## Overview

Sepolia is the default testnet for Ethereum development. This implementation provides full-fledged support for Sepolia, including contract addresses, RPC endpoints, token information, and UI components.

## Features

### 1. Sepolia Configuration (`services/sepolia.ts`)

Comprehensive Sepolia configuration including:

- **RPC Endpoints**: Multiple RPC endpoints with automatic fallback
- **Contract Addresses**: All major DeFi protocol contracts on Sepolia
- **Token Information**: Common testnet tokens (WETH, USDC, DAI, USDT)
- **Block Explorer**: Sepolia Etherscan integration
- **Faucet Links**: Multiple faucet options for getting testnet ETH
- **Gas Configuration**: Sepolia-specific gas settings

### 2. Contract Addresses

All major DeFi protocols are configured:

- **Uniswap V2**: Router and Factory addresses
- **Uniswap V3**: Router, Factory, Quoter, and Position Manager
- **Aave V3**: Pool, Addresses Provider, and WETH Gateway
- **Compound V3**: USDC and Comet addresses
- **Chainlink**: Price feed oracles
- **WETH**: Wrapped Ethereum address

### 3. RPC Endpoints with Fallback

Multiple RPC endpoints are configured for reliability:

1. `https://rpc.sepolia.org` (Primary)
2. `https://sepolia.infura.io/v3/...` (Infura)
3. `https://ethereum-sepolia-rpc.publicnode.com` (PublicNode)
4. `https://rpc2.sepolia.org` (Secondary public)
5. `https://sepolia.gateway.tenderly.co` (Tenderly)

The wagmi config uses `fallback` transport to automatically switch between endpoints if one fails.

### 4. Default Chain Configuration

Sepolia is set as the default testnet:

- Listed first in the chains array
- Default chain ID: `11155111`
- Default for development and testing

### 5. UI Components

#### SepoliaFaucetLink Component

A React component that provides easy access to Sepolia faucets:

```tsx
import { SepoliaFaucetLink } from '@/features/blockchain';

// Link variant (default)
<SepoliaFaucetLink />

// Button variant
<SepoliaFaucetLink variant="button" />

// Dropdown with all faucets
<SepoliaFaucetLink variant="dropdown" />
```

### 6. Helper Functions

Utility functions for Sepolia operations:

- `getSepoliaRpcUrl()` - Get RPC URL with fallback
- `getSepoliaContractAddress()` - Get protocol contract address
- `getSepoliaToken()` - Get token information
- `getSepoliaExplorerUrl()` - Get block explorer URL
- `formatSepoliaTxUrl()` - Format transaction URL
- `formatSepoliaAddressUrl()` - Format address URL
- `isSepoliaContract()` - Check if address is a known contract

## Usage Examples

### Getting Sepolia Contract Addresses

```typescript
import { getSepoliaContractAddress, SEPOLIA_CONTRACTS } from '@/features/blockchain';

// Get Uniswap V3 router address
const uniswapRouter = getSepoliaContractAddress('UNISWAP_V3_ROUTER');

// Or use the constant directly
const aavePool = SEPOLIA_CONTRACTS.AAVE_POOL;
```

### Getting Token Information

```typescript
import { getSepoliaToken, SEPOLIA_TOKENS } from '@/features/blockchain';

// Get USDC token info
const usdc = getSepoliaToken('USDC');
console.log(usdc.symbol); // 'USDC'
console.log(usdc.decimals); // 6
console.log(usdc.address); // Sepolia USDC address
```

### Creating Explorer Links

```typescript
import { formatSepoliaTxUrl, formatSepoliaAddressUrl } from '@/features/blockchain';

// Transaction link
const txUrl = formatSepoliaTxUrl('0x123...');
// Returns: https://sepolia.etherscan.io/tx/0x123...

// Address link
const addressUrl = formatSepoliaAddressUrl('0xabc...');
// Returns: https://sepolia.etherscan.io/address/0xabc...
```

### Checking if Chain is Sepolia

```typescript
import { isSepolia, DEFAULT_CHAIN_ID } from '@/features/blockchain';

const chainId = 11155111;
if (isSepolia(chainId)) {
  console.log('Connected to Sepolia');
}

// Default chain ID is Sepolia
console.log(DEFAULT_CHAIN_ID); // 11155111
```

## Faucets

Multiple faucet options are available:

1. **Alchemy Sepolia Faucet** - https://sepoliafaucet.com
2. **Infura Sepolia Faucet** - https://www.infura.io/faucet/sepolia
3. **QuickNode Sepolia Faucet** - https://faucet.quicknode.com/ethereum/sepolia
4. **PoW Faucet** - https://sepolia-faucet.pk910.de (no account required)

## Gas Configuration

Sepolia-specific gas settings:

- Default Gas Price: 2 gwei
- Max Gas Price: 50 gwei
- Min Gas Price: 1 gwei
- Max Fee Per Gas: 30 gwei
- Max Priority Fee Per Gas: 2 gwei
- Block Time: 12 seconds

## Protocol Support

All major protocols are supported on Sepolia:

- ✅ Uniswap V2/V3
- ✅ Aave V3
- ✅ Compound V3
- ✅ Chainlink Price Feeds
- ⚠️ Curve (not typically on testnets)
- ⚠️ Balancer (not typically on testnets)

## Integration Points

### Web3 Config

The wagmi configuration automatically uses Sepolia as the default:

```typescript
import { wagmiConfig, DEFAULT_CHAIN_ID } from '@/features/blockchain';

// wagmiConfig is pre-configured with Sepolia
// DEFAULT_CHAIN_ID is 11155111 (Sepolia)
```

### Network Hook

The `useNetwork` hook includes Sepolia support:

```typescript
import { useNetwork } from '@/features/blockchain';

const { chainId, chainName, isSupported } = useNetwork();
// If connected to Sepolia: chainId = 11155111, chainName = 'Sepolia'
```

## Testing

When testing on Sepolia:

1. Get testnet ETH from a faucet
2. Connect your wallet to Sepolia network
3. Use the contract addresses from `SEPOLIA_CONTRACTS`
4. Monitor transactions on Sepolia Etherscan

## Notes

- Sepolia is a proof-of-stake testnet (unlike Goerli which was PoW)
- Sepolia has faster block times (~12 seconds)
- Sepolia is the recommended testnet for new projects
- Contract addresses may change if protocols redeploy

## Resources

- [Sepolia Etherscan](https://sepolia.etherscan.io)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Ethereum Testnets](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets)

