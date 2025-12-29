import type {
  ObjectiveScores,
  OptimizationObjective,
  ParameterDefinition,
  ParameterSet,
} from '../types';

interface Observation {
  parameters: ParameterSet;
  scores: ObjectiveScores;
}

export class BayesianOptimizer {
  private observations: Observation[] = [];

  constructor(
    private parameters: ParameterDefinition[],
    private objectives: OptimizationObjective[]
  ) {}

  generateInitialSamples(count: number): ParameterSet[] {
    const samples: ParameterSet[] = [];

    for (let i = 0; i < count; i++) {
      const sample: ParameterSet = {};

      for (const param of this.parameters) {
        if (!sample[param.blockId]) {
          sample[param.blockId] = {};
        }

        if (param.type === 'discrete') {
          const values = param.values || [];
          const randomIndex = Math.floor(Math.random() * values.length);
          sample[param.blockId][param.paramName] = values[randomIndex];
        } else {
          const min = param.min || 0;
          const max = param.max || 100;
          const value = min + Math.random() * (max - min);
          sample[param.blockId][param.paramName] = value;
        }
      }

      samples.push(sample);
    }

    return samples;
  }

  addObservation(parameters: ParameterSet, scores: ObjectiveScores): void {
    this.observations.push({ parameters, scores });
  }

  suggestNext(): ParameterSet {
    if (this.observations.length === 0) {
      return this.generateInitialSamples(1)[0];
    }

    // Simplified Expected Improvement
    const candidates = this.generateInitialSamples(20);
    let bestCandidate = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      const score = this.evaluateCandidate(candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private evaluateCandidate(candidate: ParameterSet): number {
    const bestObservation = this.findBestObservation();
    if (!bestObservation) return Math.random();

    const distance = this.calculateDistance(candidate, bestObservation.parameters);
    const optimalDistance = 0.2;
    const distanceScore = 1 / (1 + Math.abs(distance - optimalDistance));

    return distanceScore;
  }

  private findBestObservation(): Observation | undefined {
    if (this.observations.length === 0) return undefined;
    const primaryObjective = this.objectives[0];

    return this.observations.reduce((best, current) => {
      const bestValue = best.scores[primaryObjective] || Number.NEGATIVE_INFINITY;
      const currentValue = current.scores[primaryObjective] || Number.NEGATIVE_INFINITY;
      return currentValue > bestValue ? current : best;
    });
  }

  private calculateDistance(a: ParameterSet, b: ParameterSet): number {
    let sumSquaredDiff = 0;
    let count = 0;

    for (const param of this.parameters) {
      const aValue = a[param.blockId]?.[param.paramName];
      const bValue = b[param.blockId]?.[param.paramName];

      if (aValue === undefined || bValue === undefined) continue;

      const min = param.min || 0;
      const max = param.max || 100;
      const range = max - min;

      const aNorm = (aValue - min) / range;
      const bNorm = (bValue - min) / range;

      sumSquaredDiff += Math.pow(aNorm - bNorm, 2);
      count++;
    }

    return count > 0 ? Math.sqrt(sumSquaredDiff / count) : 0;
  }
}
