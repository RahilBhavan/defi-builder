import { WalkForwardWindow, ObjectiveScores } from './types';

export class WalkForwardValidator {
  private readonly TRAIN_WINDOW_DAYS = 90;
  private readonly TEST_WINDOW_DAYS = 30;
  private readonly STEP_SIZE_DAYS = 30;
  private readonly OVERFIT_THRESHOLD = 60; // 60% degradation

  generateWindows(startDate: Date, endDate: Date): WalkForwardWindow[] {
    const windows: WalkForwardWindow[] = [];
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays < this.TRAIN_WINDOW_DAYS + this.TEST_WINDOW_DAYS) {
        // Fallback for short ranges: just one window
        const midPoint = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) * 0.7);
        return [{
            trainStart: startDate,
            trainEnd: midPoint,
            testStart: midPoint,
            testEnd: endDate
        }];
    }

    let currentStart = new Date(startDate);

    while (true) {
      const trainStart = new Date(currentStart);
      const trainEnd = this.addDays(trainStart, this.TRAIN_WINDOW_DAYS);
      const testStart = new Date(trainEnd);
      const testEnd = this.addDays(testStart, this.TEST_WINDOW_DAYS);

      if (testEnd > endDate) {
        break;
      }

      windows.push({
        trainStart,
        trainEnd,
        testStart,
        testEnd,
      });

      currentStart = this.addDays(currentStart, this.STEP_SIZE_DAYS);
    }

    return windows;
  }

  calculateDegradation(inSample: ObjectiveScores, outOfSample: ObjectiveScores): number {
    const degradations: number[] = [];

    if (inSample.sharpeRatio && outOfSample.sharpeRatio) {
      const deg = ((inSample.sharpeRatio - outOfSample.sharpeRatio) / inSample.sharpeRatio) * 100;
      degradations.push(Math.max(0, deg));
    }

    if (inSample.totalReturn && outOfSample.totalReturn) {
      const deg = ((inSample.totalReturn - outOfSample.totalReturn) / inSample.totalReturn) * 100;
      degradations.push(Math.max(0, deg));
    }

    return degradations.length > 0
      ? degradations.reduce((a, b) => a + b, 0) / degradations.length
      : 0;
  }

  isOverfit(degradation: number): boolean {
    return degradation > this.OVERFIT_THRESHOLD;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

export const walkForwardValidator = new WalkForwardValidator();
