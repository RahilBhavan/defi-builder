#!/bin/bash
# Security Audit Script
# Runs dependency scanning and security checks

set -e

echo "🔒 Running Security Audit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Frontend dependency audit
echo "📦 Frontend Dependency Audit..."
cd "$(dirname "$0")/.."
if bun pm audit; then
    echo -e "${GREEN}✓ Frontend dependencies are secure${NC}"
else
    echo -e "${YELLOW}⚠ Frontend has some vulnerabilities${NC}"
    echo "Run 'bun pm audit --fix' to attempt automatic fixes"
fi
echo ""

# Backend dependency audit
echo "📦 Backend Dependency Audit..."
cd backend
if bun pm audit; then
    echo -e "${GREEN}✓ Backend dependencies are secure${NC}"
else
    echo -e "${YELLOW}⚠ Backend has some vulnerabilities${NC}"
    echo "Run 'bun pm audit --fix' to attempt automatic fixes"
fi
echo ""

# Check for outdated packages
echo "📊 Checking for outdated packages..."
cd ..
echo "Frontend outdated packages:"
bun outdated || echo "All frontend packages are up to date"
echo ""

cd backend
echo "Backend outdated packages:"
bun outdated || echo "All backend packages are up to date"
echo ""

# Summary
echo -e "${GREEN}✅ Security audit complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review any vulnerabilities found"
echo "2. Run 'bun pm audit --fix' to attempt automatic fixes"
echo "3. Update outdated packages if needed"
echo "4. Consider using Snyk or GitHub Dependabot for continuous monitoring"

