/**
 * DeFi-specific Mock Definitions
 * Pre-configured mocks for common DeFi operations
 */

import { StubBuilder } from './stubbingEngine';
import type { MockRoute } from './types';

export class DeFiMocks {
  /**
   * Price feed mocks
   */
  public static getPriceMocks(): MockRoute[] {
    return [
      // Get current price
      new StubBuilder()
        .when('GET', '/api/price/:token')
        .thenReturn(200, {
          $generate: 'price',
        })
        .build(),

      // Get historical prices
      new StubBuilder()
        .when('GET', '/api/price/:token/history')
        .thenReturn(200, {
          $generate: {
            type: 'array',
            count: 100,
            items: {
              type: 'object',
              properties: {
                timestamp: { type: 'number', min: Date.now() - 86400000, max: Date.now() },
                price: { type: 'number', min: 1000, max: 3000 },
                volume: { type: 'number', min: 1000000, max: 10000000 },
              },
            },
          },
        })
        .build(),

      // Get multiple token prices
      new StubBuilder()
        .when('POST', '/api/price/batch')
        .thenReturn(200, {
          prices: {
            ETH: { $generate: 'price' },
            USDC: { $generate: 'price' },
            DAI: { $generate: 'price' },
          },
        })
        .build(),
    ];
  }

  /**
   * Liquidity pool mocks
   */
  public static getPoolMocks(): MockRoute[] {
    return [
      // Get pool info
      new StubBuilder()
        .when('GET', '/api/pool/:address')
        .thenReturn(200, {
          $generate: 'pool',
        })
        .build(),

      // Get all pools
      new StubBuilder()
        .when('GET', '/api/pools')
        .thenReturn(200, {
          $generate: {
            type: 'array',
            count: 10,
            items: {
              type: 'string',
              generator: 'pool',
            },
          },
        })
        .build(),

      // Get pool reserves
      new StubBuilder()
        .when('GET', '/api/pool/:address/reserves')
        .thenReturn(200, {
          reserve0: '1000000000000000000000',
          reserve1: '2000000000000000000000',
          blockTimestampLast: Date.now(),
        })
        .build(),

      // Calculate swap output
      new StubBuilder()
        .when('POST', '/api/pool/:address/quote')
        .thenReturn(200, (req: any) => {
          const amountIn = req.body?.amountIn || '1000000000000000000';
          const amountOut = String((BigInt(amountIn) * BigInt(99)) / BigInt(100)); // 1% slippage
          return {
            amountIn,
            amountOut,
            priceImpact: 0.01,
            fee: String((BigInt(amountIn) * BigInt(3)) / BigInt(1000)),
          };
        })
        .build(),
    ];
  }

  /**
   * Transaction mocks
   */
  public static getTransactionMocks(): MockRoute[] {
    return [
      // Submit transaction
      new StubBuilder()
        .when('POST', '/api/transaction/submit')
        .thenReturn(200, {
          $generate: 'transaction',
        })
        .build(),

      // Get transaction status
      new StubBuilder()
        .when('GET', '/api/transaction/:hash')
        .thenReturn(200, {
          $generate: 'transaction',
        })
        .build(),

      // Get transaction history
      new StubBuilder()
        .when('GET', '/api/transactions')
        .thenReturn(200, {
          $generate: {
            type: 'array',
            count: 20,
            items: {
              type: 'string',
              generator: 'transaction',
            },
          },
        })
        .build(),

      // Simulate transaction
      new StubBuilder()
        .when('POST', '/api/transaction/simulate')
        .thenReturn(200, {
          success: true,
          gasUsed: '150000',
          gasPrice: '50000000000',
          totalCost: '0.0075',
          changes: [
            {
              type: 'balance',
              token: 'ETH',
              from: '-1.0',
              to: '0.0',
            },
            {
              type: 'balance',
              token: 'USDC',
              from: '0.0',
              to: '2000.0',
            },
          ],
        })
        .build(),
    ];
  }

  /**
   * Backtest mocks
   */
  public static getBacktestMocks(): MockRoute[] {
    return [
      // Run backtest
      new StubBuilder()
        .when('POST', '/api/backtest/run')
        .withDelay(2000) // Simulate processing time
        .thenReturn(200, {
          $generate: 'backtest',
        })
        .build(),

      // Get backtest results
      new StubBuilder()
        .when('GET', '/api/backtest/:id')
        .thenReturn(200, {
          $generate: 'backtest',
        })
        .build(),

      // List backtests
      new StubBuilder()
        .when('GET', '/api/backtests')
        .thenReturn(200, {
          $generate: {
            type: 'array',
            count: 5,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                strategyId: { type: 'string', format: 'uuid' },
                createdAt: { type: 'string', format: 'datetime' },
                metrics: {
                  type: 'object',
                  properties: {
                    totalReturn: { type: 'number', min: -50, max: 100 },
                    sharpeRatio: { type: 'number', min: -2, max: 4 },
                    maxDrawdown: { type: 'number', min: 0, max: 60 },
                  },
                },
              },
            },
          },
        })
        .build(),
    ];
  }

  /**
   * Strategy mocks
   */
  public static getStrategyMocks(): MockRoute[] {
    return [
      // Create strategy
      new StubBuilder()
        .when('POST', '/api/strategy')
        .thenReturn(201, {
          id: { $generate: { type: 'string', format: 'uuid' } },
          name: 'New Strategy',
          createdAt: new Date().toISOString(),
          blocks: [],
        })
        .build(),

      // Get strategy
      new StubBuilder()
        .when('GET', '/api/strategy/:id')
        .thenReturn(200, {
          id: '{id}',
          name: 'Test Strategy',
          description: 'A test DeFi strategy',
          blocks: [
            {
              id: 'block1',
              type: 'uniswap-swap',
              config: {
                tokenIn: 'ETH',
                tokenOut: 'USDC',
                amountIn: '1.0',
              },
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .build(),

      // List strategies
      new StubBuilder()
        .when('GET', '/api/strategies')
        .thenReturn(200, {
          strategies: [
            {
              id: 'strategy1',
              name: 'Arbitrage Bot',
              description: 'DEX arbitrage strategy',
              tags: ['arbitrage', 'automated'],
            },
            {
              id: 'strategy2',
              name: 'Yield Optimizer',
              description: 'Maximize yield across protocols',
              tags: ['yield', 'optimization'],
            },
          ],
          total: 2,
        })
        .build(),

      // Validate strategy
      new StubBuilder()
        .when('POST', '/api/strategy/:id/validate')
        .thenReturn(200, {
          valid: true,
          errors: [],
          warnings: [],
        })
        .build(),
    ];
  }

  /**
   * Gas estimation mocks
   */
  public static getGasMocks(): MockRoute[] {
    return [
      // Get gas prices
      new StubBuilder()
        .when('GET', '/api/gas/prices')
        .thenReturn(200, {
          slow: '20',
          standard: '40',
          fast: '60',
          instant: '100',
          baseFee: '30',
          priorityFee: '2',
          timestamp: Date.now(),
        })
        .build(),

      // Estimate gas
      new StubBuilder()
        .when('POST', '/api/gas/estimate')
        .thenReturn(200, {
          gasLimit: '150000',
          gasPrice: '50',
          maxFeePerGas: '60',
          maxPriorityFeePerGas: '2',
          estimatedCost: '0.0075',
        })
        .build(),
    ];
  }

  /**
   * Error scenario mocks
   */
  public static getErrorMocks(): MockRoute[] {
    return [
      // Insufficient funds
      new StubBuilder()
        .when('POST', '/api/transaction/submit')
        .withCondition(
          { body: { value: '10000000000000000000' } },
          {
            status: 400,
            body: {
              error: 'Insufficient funds',
              code: 'INSUFFICIENT_FUNDS',
              required: '10000000000000000000',
              available: '1000000000000000000',
            },
          }
        )
        .thenReturn(200, { $generate: 'transaction' })
        .build(),

      // Slippage exceeded
      new StubBuilder()
        .when('POST', '/api/pool/:address/swap')
        .withCondition(
          { body: { slippageTolerance: 0.01 } },
          {
            status: 400,
            body: {
              error: 'Slippage tolerance exceeded',
              code: 'SLIPPAGE_EXCEEDED',
              expected: 0.01,
              actual: 0.05,
            },
          }
        )
        .thenReturn(200, { success: true })
        .build(),

      // Transaction reverted
      new StubBuilder()
        .when('GET', '/api/transaction/:hash')
        .withCondition(
          { path: '/api/transaction/0xfailed' },
          {
            status: 200,
            body: {
              hash: '0xfailed',
              status: 'failed',
              error: 'Transaction reverted',
              reason: 'UniswapV2: K',
            },
          }
        )
        .thenReturn(200, { $generate: 'transaction' })
        .build(),
    ];
  }

  /**
   * Get all DeFi mocks
   */
  public static getAllMocks(): MockRoute[] {
    return [
      ...this.getPriceMocks(),
      ...this.getPoolMocks(),
      ...this.getTransactionMocks(),
      ...this.getBacktestMocks(),
      ...this.getStrategyMocks(),
      ...this.getGasMocks(),
      ...this.getErrorMocks(),
    ];
  }
}
