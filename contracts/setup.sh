#!/bin/bash

# DeFi Builder Smart Contracts Setup Script

set -e

echo "🚀 Setting up DeFi Builder Smart Contracts..."

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry is not installed. Installing now..."
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo "✅ Foundry installed"

# Install OpenZeppelin contracts
echo "📦 Installing OpenZeppelin contracts..."
forge install OpenZeppelin/openzeppelin-contracts --no-commit

echo "✅ Dependencies installed"

# Build contracts
echo "🔨 Building contracts..."
forge build

echo "✅ Contracts built successfully"

# Run tests
echo "🧪 Running tests..."
forge test

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a .env file with your configuration (see DEPLOYMENT.md)"
echo "2. Run 'forge test' to run all tests"
echo "3. Run 'forge script script/Deploy.s.sol' to deploy"
echo ""
echo "For more information, see:"
echo "- README.md - Contract overview"
echo "- PORTFOLIO_GUIDE.md - How to present these contracts"
echo "- DEPLOYMENT.md - Deployment instructions"

