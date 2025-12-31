/**
 * Convergence Graph Component
 * Shows optimization progress over iterations
 */

import type React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ConvergenceDataPoint {
  iteration: number;
  [objective: string]: number | string; // Dynamic objectives
}

interface ConvergenceGraphProps {
  data: ConvergenceDataPoint[];
  objectives: string[];
  colors?: Record<string, string>;
}

export const ConvergenceGraph: React.FC<ConvergenceGraphProps> = ({
  data,
  objectives,
  colors = {
    sharpeRatio: '#00D395',
    totalReturn: '#FF5500',
    maxDrawdown: '#FF0000',
    winRate: '#3465A4',
    gasCosts: '#9B59B6',
  },
}) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p className="text-sm font-mono uppercase">No convergence data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="iteration"
          tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }}
          label={{
            value: 'Iteration',
            position: 'insideBottom',
            offset: -5,
            style: { fontFamily: 'IBM Plex Mono', fontSize: 12 },
          }}
        />
        <YAxis
          tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }}
          label={{
            value: 'Objective Value',
            angle: -90,
            position: 'insideLeft',
            style: { fontFamily: 'IBM Plex Mono', fontSize: 12 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #000',
            borderRadius: '0px',
            fontFamily: 'IBM Plex Mono',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '12px' }} />
        {objectives.map((objective) => (
          <Line
            key={objective}
            type="monotone"
            dataKey={objective}
            stroke={colors[objective] || '#000'}
            strokeWidth={2}
            dot={false}
            name={objective.replace(/([A-Z])/g, ' $1').trim()}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
