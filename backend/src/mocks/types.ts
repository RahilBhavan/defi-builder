/**
 * Type definitions for the Mock API Server
 */

export interface MockRoute {
  method: string;
  path: string;
  response: MockResponseTemplate;
  conditions?: Array<{
    match: Record<string, any>;
    response: MockResponseTemplate;
  }>;
  sequence?: {
    name: string;
    steps: Array<MockResponseTemplate>;
  };
  priority?: number;
  times?: number; // How many times this stub should match (-1 for unlimited)
  delay?: number; // Additional delay in ms
  matchers?: MockMatcher[];
}

export interface MockResponseTemplate {
  status: number;
  headers?: Record<string, string>;
  body?: any;
  transformations?: Array<{
    type: 'delay' | 'error_rate' | 'paginate';
    params: any;
  }>;
}

export interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface MockMatcher {
  type: 'path_params' | 'query_params' | 'headers' | 'body';
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
  matchType?: 'exact' | 'partial' | 'regex';
}

export interface MockRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface TrackedRequest extends MockRequest {
  timestamp: Date;
}

export interface MockScenario {
  name: string;
  description: string;
  initialState?: MockState;
  stubs?: MockRoute[];
  sequences?: Array<{
    name: string;
    steps: Array<{
      repeat?: number;
      response: MockResponseTemplate;
    }>;
  }>;
  conditions?: Array<{
    type: string;
    params: any;
  }>;
}

export interface MockState {
  [key: string]: any;
}

export interface SequenceState {
  currentStep: number;
  count: number;
}

export interface PriceData {
  token: string;
  price: number;
  timestamp: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number;
  apy: number;
  tvl: number;
}

export interface BacktestData {
  strategyId: string;
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };
  trades: Array<{
    timestamp: number;
    type: 'buy' | 'sell';
    token: string;
    amount: number;
    price: number;
    pnl: number;
  }>;
  equity: Array<{
    timestamp: number;
    value: number;
  }>;
}

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  nonce: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
}

export interface DataGeneratorSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, DataGeneratorSchema>;
  items?: DataGeneratorSchema;
  format?: string;
  generator?: string;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  count?: number;
}
