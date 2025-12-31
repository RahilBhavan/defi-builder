import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCategory, Protocol } from '../../types';
import { Block } from '../Block';
import type { LegoBlock } from '../../types';

describe('Block', () => {
  const mockBlock: LegoBlock = {
    id: '1',
    type: 'uniswap_swap',
    label: 'UNISWAP SWAP',
    description: 'Swap tokens on Uniswap',
    category: BlockCategory.PROTOCOL,
    protocol: Protocol.UNISWAP,
    icon: 'swap',
    params: {
      inputToken: 'ETH',
      outputToken: 'USDC',
      amount: 1.0,
    },
  };

  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();

  it('renders block with correct label', () => {
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    expect(screen.getByText('UNISWAP SWAP')).toBeInTheDocument();
  });

  it('renders block description', () => {
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    expect(screen.getByText('Swap tokens on Uniswap')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    
    const blockElement = screen.getByRole('button');
    await user.click(blockElement);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    
    const blockElement = screen.getByRole('button');
    blockElement.focus();
    await user.keyboard('{Enter}');
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Space key is pressed', async () => {
    const user = userEvent.setup();
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    
    const blockElement = screen.getByRole('button');
    blockElement.focus();
    await user.keyboard(' ');
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('shows selected state when isSelected is true', () => {
    render(<Block block={mockBlock} isSelected={true} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    const blockElement = screen.getByRole('button');
    expect(blockElement).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows unselected state when isSelected is false', () => {
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    const blockElement = screen.getByRole('button');
    expect(blockElement).toHaveAttribute('aria-pressed', 'false');
  });

  it('displays block parameters', () => {
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    expect(screen.getByText(/ETH/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC/i)).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<Block block={mockBlock} isSelected={false} onSelect={mockOnSelect} onDelete={mockOnDelete} />);
    const blockElement = screen.getByRole('button');
    expect(blockElement).toHaveAttribute('aria-label', 'UNISWAP SWAP block, PROTOCOL category');
    expect(blockElement).toHaveAttribute('tabIndex', '0');
  });
});

