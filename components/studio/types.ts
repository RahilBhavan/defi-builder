export interface StrategyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    blockType: string;
    [key: string]: unknown;
  };
}

export interface StrategyEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}
