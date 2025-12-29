export enum BlockCategory {
  ENTRY = 'ENTRY',
  PROTOCOL = 'PROTOCOL',
  EXIT = 'EXIT',
  RISK = 'RISK',
}

export enum Protocol {
  UNISWAP = 'Uniswap',
  AAVE = 'Aave',
  COMPOUND = 'Compound',
  CURVE = 'Curve',
  BALANCER = 'Balancer',
  ONEINCH = '1inch',
  GENERIC = 'Generic',
}

export interface BlockParams {
  [key: string]: string | number | boolean;
}

export interface LegoBlock {
  id: string;
  type: string;
  label: string;
  description: string;
  category: BlockCategory;
  protocol: Protocol;
  icon: string;
  params: BlockParams;
}

export interface Strategy {
  id: string;
  name: string;
  blocks: LegoBlock[];
  createdAt: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: { blockId: string; message: string }[];
}

export type ViewState = 'landing' | 'workspace';
export type ModalType = 'backtest' | 'portfolio' | 'settings' | 'library' | null;
