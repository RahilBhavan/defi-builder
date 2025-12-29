import type { OptimizationObjective, ParameterDefinition, ParameterSet } from '../types';

interface Individual {
  parameters: ParameterSet;
  fitness: number;
}

export class GeneticOptimizer {
  private population: Individual[] = [];
  private generation = 0;

  constructor(
    private parameters: ParameterDefinition[],
    private objectives: OptimizationObjective[],
    private populationSize = 30
  ) {
    this.initializePopulation();
  }

  private initializePopulation(): void {
    for (let i = 0; i < this.populationSize; i++) {
      const individual: Individual = {
        parameters: this.generateRandomParameters(),
        fitness: 0,
      };
      this.population.push(individual);
    }
  }

  private generateRandomParameters(): ParameterSet {
    const params: ParameterSet = {};

    for (const param of this.parameters) {
      if (!params[param.blockId]) {
        params[param.blockId] = {};
      }

      if (param.type === 'discrete') {
        const values = param.values || [];
        const randomIndex = Math.floor(Math.random() * values.length);
        params[param.blockId][param.paramName] = values[randomIndex];
      } else {
        const min = param.min || 0;
        const max = param.max || 100;
        params[param.blockId][param.paramName] = min + Math.random() * (max - min);
      }
    }

    return params;
  }

  crossover(parent1: ParameterSet, parent2: ParameterSet): ParameterSet {
    const child: ParameterSet = {};

    for (const param of this.parameters) {
      if (!child[param.blockId]) {
        child[param.blockId] = {};
      }

      const value1 = parent1[param.blockId]?.[param.paramName];
      const value2 = parent2[param.blockId]?.[param.paramName];

      if (value1 === undefined || value2 === undefined) continue;

      if (param.type === 'discrete') {
        child[param.blockId][param.paramName] = Math.random() < 0.5 ? value1 : value2;
      } else {
        const alpha = Math.random();
        child[param.blockId][param.paramName] = value1 * alpha + value2 * (1 - alpha);
      }
    }

    return child;
  }

  mutate(individual: ParameterSet, mutationRate = 0.2): ParameterSet {
    const mutated: ParameterSet = JSON.parse(JSON.stringify(individual));

    for (const param of this.parameters) {
      if (Math.random() > mutationRate) continue;

      if (param.type === 'discrete') {
        const values = param.values || [];
        const randomIndex = Math.floor(Math.random() * values.length);
        mutated[param.blockId][param.paramName] = values[randomIndex];
      } else {
        const min = param.min || 0;
        const max = param.max || 100;
        const range = max - min;

        const current = mutated[param.blockId][param.paramName];
        const noise = (Math.random() - 0.5) * range * 0.2;
        const newValue = Math.max(min, Math.min(max, current + noise));

        mutated[param.blockId][param.paramName] = newValue;
      }
    }

    return mutated;
  }

  select(count: number): ParameterSet[] {
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    return sorted.slice(0, count).map((ind) => ind.parameters);
  }

  setFitness(parameters: ParameterSet, fitness: number): void {
    const individual = this.population.find(
      (ind) => JSON.stringify(ind.parameters) === JSON.stringify(parameters)
    );

    if (individual) {
      individual.fitness = fitness;
    }
  }

  getPopulation(): ParameterSet[] {
    return this.population.map((ind) => ind.parameters);
  }

  evolve(): void {
    const parentCount = Math.floor(this.populationSize / 2);
    const parents = this.select(parentCount);
    const offspring: Individual[] = [];

    for (let i = 0; i < this.populationSize - parentCount; i++) {
      const parent1 = parents[Math.floor(Math.random() * parents.length)];
      const parent2 = parents[Math.floor(Math.random() * parents.length)];

      let child = this.crossover(parent1, parent2);
      child = this.mutate(child);

      offspring.push({
        parameters: child,
        fitness: 0,
      });
    }

    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    this.population = [...sorted.slice(0, parentCount), ...offspring];
    this.generation++;
  }
}
