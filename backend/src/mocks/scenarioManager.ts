/**
 * Scenario Manager for Test Scenarios
 */

import { logger } from '../utils/logger';
import type { MockResponseTemplate, MockScenario, SequenceState } from './types';

export class ScenarioManager {
  private scenarios: Map<string, MockScenario> = new Map();
  private currentScenario = 'default';
  private sequenceStates: Map<string, SequenceState> = new Map();

  constructor() {
    this.initializeDefaultScenarios();
  }

  private initializeDefaultScenarios(): void {
    // Default happy path scenario
    this.defineScenario('default', {
      name: 'default',
      description: 'Default scenario with successful responses',
      initialState: {},
      stubs: [],
    });

    // Happy path - all operations succeed
    this.defineScenario('happy_path', {
      name: 'happy_path',
      description: 'All operations succeed with optimal conditions',
      stubs: [],
    });

    // Error scenario
    this.defineScenario('error_scenario', {
      name: 'error_scenario',
      description: 'Various error conditions for testing error handling',
      sequences: [
        {
          name: 'rate_limiting',
          steps: [
            {
              repeat: 5,
              response: { status: 200, body: { success: true } },
            },
            {
              repeat: 10,
              response: {
                status: 429,
                body: { error: 'Rate limit exceeded', retry_after: 60 },
              },
            },
          ],
        },
        {
          name: 'intermittent_failures',
          steps: [
            { repeat: 2, response: { status: 200, body: { success: true } } },
            { repeat: 1, response: { status: 500, body: { error: 'Internal server error' } } },
            { repeat: 2, response: { status: 200, body: { success: true } } },
          ],
        },
      ],
    });

    // Performance degradation scenario
    this.defineScenario('slow_responses', {
      name: 'slow_responses',
      description: 'Simulate slow network and processing times',
      stubs: [],
    });

    // Market volatility scenario
    this.defineScenario('high_volatility', {
      name: 'high_volatility',
      description: 'High market volatility with rapid price changes',
      stubs: [],
    });

    // Low liquidity scenario
    this.defineScenario('low_liquidity', {
      name: 'low_liquidity',
      description: 'Low liquidity pools with high slippage',
      stubs: [],
    });

    // Flash crash scenario
    this.defineScenario('flash_crash', {
      name: 'flash_crash',
      description: 'Sudden market crash simulation',
      stubs: [],
    });

    // Network congestion
    this.defineScenario('network_congestion', {
      name: 'network_congestion',
      description: 'High gas prices and slow transaction confirmations',
      stubs: [],
    });
  }

  public defineScenario(name: string, scenario: MockScenario): void {
    this.scenarios.set(name, scenario);
    logger.info(`Defined scenario: ${name}`);
  }

  public setScenario(name: string): void {
    if (!this.scenarios.has(name)) {
      logger.warn(`Scenario not found: ${name}, using default`);
      this.currentScenario = 'default';
      return;
    }

    this.currentScenario = name;
    this.resetSequences();
    logger.info(`Switched to scenario: ${name}`);
  }

  public getCurrentScenario(): string {
    return this.currentScenario;
  }

  public getScenario(name?: string): MockScenario | undefined {
    return this.scenarios.get(name || this.currentScenario);
  }

  public listScenarios(): Array<{ name: string; description: string }> {
    return Array.from(this.scenarios.values()).map((s) => ({
      name: s.name,
      description: s.description,
    }));
  }

  public getSequenceResponse(sequenceName: string, request: any): MockResponseTemplate | null {
    const scenario = this.getScenario();
    if (!scenario?.sequences) {
      return null;
    }

    const sequence = scenario.sequences.find((s) => s.name === sequenceName);
    if (!sequence) {
      return null;
    }

    // Get or initialize sequence state
    let state = this.sequenceStates.get(sequenceName);
    if (!state) {
      state = { currentStep: 0, count: 0 };
      this.sequenceStates.set(sequenceName, state);
    }

    // Get current step
    const currentStep = sequence.steps[state.currentStep];
    const response = currentStep.response;

    // Update state
    state.count++;
    const repeatCount = currentStep.repeat || 1;

    if (state.count >= repeatCount) {
      // Move to next step (circular)
      state.currentStep = (state.currentStep + 1) % sequence.steps.length;
      state.count = 0;
    }

    return response;
  }

  public resetSequences(): void {
    this.sequenceStates.clear();
    logger.info('Reset all sequence states');
  }

  public reset(): void {
    this.currentScenario = 'default';
    this.resetSequences();
    logger.info('Reset scenario manager to default state');
  }

  /**
   * Create DeFi-specific scenarios
   */
  public createDeFiScenarios(): void {
    // Bull market scenario
    this.defineScenario('bull_market', {
      name: 'bull_market',
      description: 'Bull market with rising prices and high liquidity',
      initialState: {
        priceMultiplier: 1.5, // 50% price increase
        liquidityMultiplier: 2.0,
        volatility: 0.02,
      },
      stubs: [],
    });

    // Bear market scenario
    this.defineScenario('bear_market', {
      name: 'bear_market',
      description: 'Bear market with falling prices and reduced liquidity',
      initialState: {
        priceMultiplier: 0.7, // 30% price decrease
        liquidityMultiplier: 0.5,
        volatility: 0.05,
      },
      stubs: [],
    });

    // MEV attack scenario
    this.defineScenario('mev_attack', {
      name: 'mev_attack',
      description: 'Simulates MEV bot front-running and sandwich attacks',
      sequences: [
        {
          name: 'sandwich_attack',
          steps: [
            {
              repeat: 1,
              response: {
                status: 200,
                body: {
                  transaction: 'pending',
                  position: 'front-run',
                  estimatedSlippage: 5.2,
                },
              },
            },
            {
              repeat: 1,
              response: {
                status: 200,
                body: {
                  transaction: 'confirmed',
                  actualSlippage: 8.7,
                  mevDetected: true,
                },
              },
            },
          ],
        },
      ],
    });

    // Liquidation cascade
    this.defineScenario('liquidation_cascade', {
      name: 'liquidation_cascade',
      description: 'Mass liquidations causing price crashes',
      sequences: [
        {
          name: 'cascade_effect',
          steps: [
            {
              repeat: 1,
              response: {
                status: 200,
                body: { priceChange: -5, liquidations: 10 },
              },
            },
            {
              repeat: 1,
              response: {
                status: 200,
                body: { priceChange: -12, liquidations: 50 },
              },
            },
            {
              repeat: 1,
              response: {
                status: 200,
                body: { priceChange: -25, liquidations: 200 },
              },
            },
            {
              repeat: 1,
              response: {
                status: 200,
                body: { priceChange: -15, liquidations: 80, stabilizing: true },
              },
            },
          ],
        },
      ],
    });

    // Protocol upgrade scenario
    this.defineScenario('protocol_upgrade', {
      name: 'protocol_upgrade',
      description: 'Protocol upgrade causing temporary unavailability',
      sequences: [
        {
          name: 'upgrade_process',
          steps: [
            {
              repeat: 3,
              response: {
                status: 200,
                body: { status: 'operational' },
              },
            },
            {
              repeat: 2,
              response: {
                status: 503,
                body: { error: 'Service unavailable - upgrade in progress' },
              },
            },
            {
              repeat: 1,
              response: {
                status: 200,
                body: { status: 'operational', version: '2.0.0' },
              },
            },
          ],
        },
      ],
    });

    logger.info('Created DeFi-specific scenarios');
  }

  /**
   * Get scenario configuration for current scenario
   */
  public getScenarioConfig(): {
    name: string;
    modifiers: Record<string, any>;
  } {
    const scenario = this.getScenario();

    const modifiers: Record<string, any> = {
      priceMultiplier: 1.0,
      liquidityMultiplier: 1.0,
      volatility: 0.02,
      gasMultiplier: 1.0,
      latencyMultiplier: 1.0,
    };

    // Apply scenario-specific modifiers
    switch (this.currentScenario) {
      case 'bull_market':
        modifiers.priceMultiplier = 1.5;
        modifiers.liquidityMultiplier = 2.0;
        modifiers.volatility = 0.02;
        break;
      case 'bear_market':
        modifiers.priceMultiplier = 0.7;
        modifiers.liquidityMultiplier = 0.5;
        modifiers.volatility = 0.05;
        break;
      case 'high_volatility':
        modifiers.volatility = 0.1;
        break;
      case 'low_liquidity':
        modifiers.liquidityMultiplier = 0.2;
        break;
      case 'flash_crash':
        modifiers.priceMultiplier = 0.4;
        modifiers.volatility = 0.15;
        break;
      case 'network_congestion':
        modifiers.gasMultiplier = 5.0;
        modifiers.latencyMultiplier = 3.0;
        break;
      case 'slow_responses':
        modifiers.latencyMultiplier = 10.0;
        break;
    }

    return {
      name: this.currentScenario,
      modifiers,
    };
  }
}
