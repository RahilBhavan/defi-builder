import { OptimizationSolution, OptimizationObjective } from '../types';

export class ParetoFrontier {
  private readonly MAXIMIZE: OptimizationObjective[] = [
    'sharpeRatio',
    'totalReturn',
    'winRate',
  ];

  dominates(
    a: OptimizationSolution,
    b: OptimizationSolution,
    objectives: OptimizationObjective[]
  ): boolean {
    let betterInAtLeastOne = false;

    for (const objective of objectives) {
      const aValue = this.getObjectiveValue(a, objective);
      const bValue = this.getObjectiveValue(b, objective);

      if (aValue === undefined || bValue === undefined) continue;

      const isMaximize = this.MAXIMIZE.includes(objective);

      if (isMaximize) {
        if (aValue < bValue) return false;
        if (aValue > bValue) betterInAtLeastOne = true;
      } else {
        if (aValue > bValue) return false;
        if (aValue < bValue) betterInAtLeastOne = true;
      }
    }

    return betterInAtLeastOne;
  }

  extractFrontier(
    solutions: OptimizationSolution[],
    objectives: OptimizationObjective[]
  ): OptimizationSolution[] {
    const frontier: OptimizationSolution[] = [];

    for (const solution of solutions) {
      let isDominated = false;

      for (const other of solutions) {
        if (other.id === solution.id) continue;

        if (this.dominates(other, solution, objectives)) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        frontier.push({
          ...solution,
          isParetoOptimal: true,
        });
      }
    }

    return frontier;
  }

  private getObjectiveValue(
    solution: OptimizationSolution,
    objective: OptimizationObjective
  ): number | undefined {
    const scores = solution.outOfSampleScores.sharpeRatio !== undefined
      ? solution.outOfSampleScores
      : solution.inSampleScores;

    return scores[objective];
  }
}

export const paretoFrontier = new ParetoFrontier();
