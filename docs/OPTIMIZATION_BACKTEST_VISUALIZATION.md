# Optimization Backtest Visualization Feature

## Overview

This feature allows users to visualize backtest results for optimization solutions, helping them understand how different parameter sets perform over time and compare multiple solutions side-by-side.

## Features

### 1. **Single Solution View**
- Displays the equity curve for the selected solution
- Shows key metrics (Total Return, Sharpe Ratio, Max Drawdown, Win Rate)
- Area chart with gradient fill for visual appeal
- Interactive tooltips showing exact equity values

### 2. **Compare Mode**
- Compare up to 6 solutions simultaneously
- Select solutions via clickable buttons
- Color-coded lines for easy differentiation
- Side-by-side comparison of performance

### 3. **Top 5 Solutions View**
- Automatically displays the top 5 solutions by Sharpe Ratio
- Quick overview of best-performing solutions
- Color-coded legend with Sharpe ratios

## Implementation Details

### Component Structure

```
components/optimization/BacktestVisualization.tsx
├── View Mode Selector (Single/Compare/Top 5)
├── Chart Area (Recharts LineChart/AreaChart)
├── Solution Selector (for Compare mode)
└── Metrics Summary (for Single mode)
```

### Data Flow

1. **Optimization Engine** (`services/optimization/optimizationEngine.ts`)
   - Stores representative backtest result in each `OptimizationSolution`
   - Uses the last successful out-of-sample window result
   - Includes full `equityCurve` data for visualization

2. **Optimization Panel** (`components/OptimizationPanel.tsx`)
   - Adds "Backtests" tab to view selector
   - Passes solutions and selected solution to visualization component
   - Handles solution selection updates

3. **Backtest Visualization** (`components/optimization/BacktestVisualization.tsx`)
   - Filters solutions with available backtest data
   - Prepares chart data for different view modes
   - Renders interactive charts using Recharts

## Usage

### Accessing the Visualization

1. Run an optimization
2. Once complete, click the **"Backtests"** tab in the center visualization area
3. Select a view mode:
   - **Single**: View one solution's equity curve
   - **Compare**: Select multiple solutions to compare
   - **Top 5**: View top 5 solutions automatically

### Comparing Solutions

1. Switch to **Compare** mode
2. Click solution buttons to select/deselect (up to 6)
3. Charts update automatically to show selected solutions
4. Hover over chart to see exact values

## Technical Details

### Data Storage

- Each `OptimizationSolution` now includes `backtestResult?: DeFiBacktestResult`
- Contains:
  - `equityCurve`: Array of `{ date: string; equity: number }`
  - `metrics`: Performance metrics
  - `trades`: Trade history
  - `startDate`, `endDate`, `initialCapital`

### Performance Considerations

- Only stores one representative backtest per solution (not all walk-forward windows)
- Uses the last successful out-of-sample window result
- Chart data is memoized to prevent unnecessary recalculations
- Virtual scrolling for solution selector in compare mode

### Chart Library

- Uses **Recharts** (already in dependencies)
- Responsive containers for different screen sizes
- Custom styling to match app design system
- IBM Plex Mono font for consistency

## Future Enhancements

### Potential Improvements

1. **Full Walk-Forward Visualization**
   - Show all train/test windows for a solution
   - Toggle between in-sample and out-of-sample curves

2. **Drawdown Visualization**
   - Add drawdown chart below equity curve
   - Highlight max drawdown periods

3. **Trade Analysis**
   - Show individual trades on the chart
   - Filter trades by type/token
   - Trade statistics overlay

4. **Export Functionality**
   - Export equity curves to CSV
   - Export chart as image
   - Share comparison views

5. **Interactive Features**
   - Zoom/pan on charts
   - Date range filtering
   - Custom metric selection

6. **Benchmark Comparison**
   - Compare against HODL strategy
   - Compare against market indices
   - Relative performance metrics

## Code Examples

### Using the Component

```tsx
<BacktestVisualization
  solutions={paretoFrontier}
  selectedSolutionId={selectedSolution?.id}
  onSelectSolution={(id) => setSelectedSolution(findSolution(id))}
  initialCapital={10000}
/>
```

### Accessing Backtest Data

```typescript
const solution = optimizationResult.paretoFrontier[0];
if (solution.backtestResult) {
  const equityCurve = solution.backtestResult.equityCurve;
  const metrics = solution.backtestResult.metrics;
  // Use data for visualization
}
```

## Benefits

1. **Better Decision Making**: Visual comparison helps users choose the best solution
2. **Performance Understanding**: See how strategies perform over time, not just final metrics
3. **Risk Assessment**: Identify drawdown periods and volatility patterns
4. **Parameter Insights**: Understand which parameter sets lead to smoother equity curves
5. **Validation**: Verify that optimization results are realistic and not overfitted

## Related Components

- `ConvergenceGraph.tsx`: Shows optimization progress over iterations
- `SolutionComparison.tsx`: Compares solution metrics in table format
- `BacktestModal.tsx`: Full backtest visualization for single strategy runs

