import type { LegoBlock } from '../../types';
import { runDeFiBacktest } from '../defiBacktestEngine';
import type { BacktestWorkerRequest, BacktestWorkerResponse } from './types';

function applyParametersToBlocks(
  blocks: LegoBlock[],
  parameters: BacktestWorkerRequest['parameters']
): LegoBlock[] {
  return blocks.map((block) => {
    const blockParams = parameters[block.id];
    if (blockParams) {
      return {
        ...block,
        params: {
          ...block.params,
          ...blockParams,
        },
      };
    }
    return block;
  });
}

self.onmessage = async (event: MessageEvent<BacktestWorkerRequest>) => {
  const { type, id, blocks, parameters, config } = event.data;

  if (type !== 'BACKTEST') {
    return;
  }

  try {
    const updatedBlocks = applyParametersToBlocks(blocks, parameters);

    const result = await runDeFiBacktest({
      blocks: updatedBlocks,
      startDate: new Date(config.startDate),
      endDate: new Date(config.endDate),
      initialCapital: config.initialCapital,
      rebalanceInterval: config.rebalanceInterval,
    });

    const response: BacktestWorkerResponse = {
      type: 'RESULT',
      id,
      parameters,
      result,
    };

    self.postMessage(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const response: BacktestWorkerResponse = {
      type: 'ERROR',
      id,
      parameters,
      error: errorMessage,
    };

    self.postMessage(response);
  }
};
