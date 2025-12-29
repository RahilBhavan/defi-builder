import type { LegoBlock } from '../../types';
import type { ParameterDefinition } from './types';

export class ParameterExtractor {
  /**
   * Extract optimizable parameters from strategy blocks
   */
  extract(blocks: LegoBlock[]): ParameterDefinition[] {
    const parameters: ParameterDefinition[] = [];

    for (const block of blocks) {
      const blockParams = this.extractBlockParameters(block);
      parameters.push(...blockParams);
    }

    // Limit to 10 most important parameters
    return this.prioritizeParameters(parameters).slice(0, 10);
  }

  /**
   * Extract parameters from a single block
   */
  private extractBlockParameters(block: LegoBlock): ParameterDefinition[] {
    const extractors: Record<string, (block: LegoBlock) => ParameterDefinition[]> = {
      uniswap_swap: this.extractSwapParams.bind(this),
      aave_supply: this.extractSupplyParams.bind(this),
      price_trigger: this.extractTriggerParams.bind(this),
      stop_loss: this.extractStopLossParams.bind(this),
      // Mapped from constant types
      UNISWAP_SWAP: this.extractSwapParams.bind(this),
      AAVE_SUPPLY: this.extractSupplyParams.bind(this),
      PRICE_TRIGGER: this.extractTriggerParams.bind(this),
      STOP_LOSS: this.extractStopLossParams.bind(this),
    };

    const extractor = extractors[block.type];
    return extractor ? extractor(block) : [];
  }

  private extractSwapParams(block: LegoBlock): ParameterDefinition[] {
    const params: ParameterDefinition[] = [];
    if (block.params?.slippage !== undefined) {
      params.push({
        blockId: block.id,
        blockType: block.type,
        paramName: 'slippage',
        type: 'continuous',
        min: 0.1,
        max: 2.0,
        defaultValue: Number(block.params.slippage),
      });
    }
    if (block.params?.amount !== undefined) {
      params.push({
        blockId: block.id,
        blockType: block.type,
        paramName: 'amount',
        type: 'continuous',
        min: Number(block.params.amount) * 0.5,
        max: Number(block.params.amount) * 1.5,
        defaultValue: Number(block.params.amount),
      });
    }
    return params;
  }

  private extractSupplyParams(block: LegoBlock): ParameterDefinition[] {
    if (block.params?.amount === undefined) return [];
    return [
      {
        blockId: block.id,
        blockType: block.type,
        paramName: 'amount',
        type: 'continuous',
        min: Number(block.params.amount) * 0.5,
        max: Number(block.params.amount) * 1.5,
        defaultValue: Number(block.params.amount),
      },
    ];
  }

  private extractTriggerParams(block: LegoBlock): ParameterDefinition[] {
    if (block.params?.targetPrice === undefined) return [];
    return [
      {
        blockId: block.id,
        blockType: block.type,
        paramName: 'targetPrice',
        type: 'continuous',
        min: Number(block.params.targetPrice) * 0.8,
        max: Number(block.params.targetPrice) * 1.2,
        defaultValue: Number(block.params.targetPrice),
      },
    ];
  }

  private extractStopLossParams(block: LegoBlock): ParameterDefinition[] {
    if (block.params?.percentage === undefined) return [];
    return [
      {
        blockId: block.id,
        blockType: block.type,
        paramName: 'percentage',
        type: 'percentage',
        min: 1,
        max: 20,
        defaultValue: Number(block.params.percentage),
      },
    ];
  }

  private prioritizeParameters(parameters: ParameterDefinition[]): ParameterDefinition[] {
    const priorityMap: Record<string, number> = {
      percentage: 1, // Stop loss
      targetPrice: 2, // Entry
      slippage: 3,
      amount: 4,
    };

    return parameters.sort((a, b) => {
      const priorityA = priorityMap[a.paramName] || 10;
      const priorityB = priorityMap[b.paramName] || 10;
      return priorityA - priorityB;
    });
  }
}

export const parameterExtractor = new ParameterExtractor();
