# Smart Contract Deployment Guide

This guide explains how to deploy the DeFi Builder smart contracts to various networks.

## Prerequisites

1. **Foundry Installation**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Dependencies**
   ```bash
   cd contracts
   forge install OpenZeppelin/openzeppelin-contracts
   ```

3. **Environment Variables**
   Create a `.env` file in the `contracts` directory:
   ```bash
   PRIVATE_KEY=your_private_key_here
   MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ETHERSCAN_API_KEY=your_etherscan_key
   
   # Protocol Addresses (Mainnet)
   UNISWAP_V2_ROUTER=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
   UNISWAP_V3_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
   CURVE_REGISTRY=0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5
   BALANCER_VAULT=0xBA12222222228d8Ba445958a75a0704d566BF2C8
   AAVE_LENDING_POOL=0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   SUSHISWAP_ROUTER=0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F
   VAULT_ASSET=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  # USDC
   LENDING_PROTOCOL=0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9  # Aave
   ```

## Deployment Steps

### 1. Compile Contracts

```bash
cd contracts
forge build
```

### 2. Run Tests

```bash
forge test
forge test -vvv  # Verbose output
forge test --gas-report  # Gas usage report
```

### 3. Deploy to Sepolia (Testnet)

```bash
# Set network
export FOUNDRY_PROFILE=sepolia

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 4. Deploy to Mainnet

⚠️ **WARNING: Only deploy to mainnet after thorough testing and security audits!**

```bash
# Set network
export FOUNDRY_PROFILE=mainnet

# Deploy (use --slow flag for mainnet)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --slow
```

## Contract Addresses

After deployment, save the contract addresses:

```bash
# Example output
StrategyExecutor: 0x...
MultiProtocolRouter: 0x...
YieldOptimizerVault: 0x...
FlashLoanArbitrage: 0x...
PositionManager: 0x...
```

## Verification

Verify contracts on Etherscan:

```bash
forge verify-contract \
  --chain-id 1 \
  --num-of-optimizations 200 \
  --watch \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --compiler-version v0.8.28+commit.0e5c0b0 \
  0xYourContractAddress \
  src/StrategyExecutor.sol:StrategyExecutor
```

## Integration with Frontend

Update your frontend Web3 config to use deployed contracts:

```typescript
// services/web3/config.ts
export const DEPLOYED_CONTRACTS = {
  SEPOLIA: {
    StrategyExecutor: "0x...",
    MultiProtocolRouter: "0x...",
    YieldOptimizerVault: "0x...",
    FlashLoanArbitrage: "0x...",
    PositionManager: "0x...",
  },
  MAINNET: {
    // ... mainnet addresses
  },
};
```

## Security Checklist

Before deploying to mainnet:

- [ ] All tests passing
- [ ] Gas optimization reviewed
- [ ] Security audit completed (or at least reviewed by experienced auditors)
- [ ] Access controls properly configured
- [ ] Emergency pause functionality tested
- [ ] Upgrade paths considered (if using proxies)
- [ ] Documentation updated
- [ ] Monitoring and alerting set up

## Post-Deployment

1. **Initialize Contracts**
   - Configure collateral settings in PositionManager
   - Add strategies to YieldOptimizerVault
   - Set appropriate fees and limits

2. **Monitor**
   - Set up event monitoring
   - Configure alerts for critical functions
   - Monitor gas usage

3. **Documentation**
   - Update README with deployed addresses
   - Document any initialization steps
   - Create user guides

