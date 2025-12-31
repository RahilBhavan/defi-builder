import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCategory, Protocol } from '../../types';
import { Spine } from '../Spine';
import type { LegoBlock } from '../../types';

describe('Spine', () => {
  const mockBlocks: LegoBlock[] = [
    {
      id: '1',
      type: 'price_trigger',
      label: 'PRICE TRIGGER',
      description: 'Trigger on price',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'trigger',
      params: {
        asset: 'ETH',
        targetPrice: 3000,
        condition: '>=',
      },
    },
    {
      id: '2',
      type: 'uniswap_swap',
      label: 'UNISWAP SWAP',
      description: 'Swap tokens',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.UNISWAP,
      icon: 'swap',
      params: {
        inputToken: 'ETH',
        outputToken: 'USDC',
        amount: 1.0,
      },
    },
  ];

  const mockOnSelectBlock = vi.fn();
  const mockOnDeleteBlock = vi.fn();
  const mockOnOpenSuggester = vi.fn();
  const mockOnReorderBlocks = vi.fn();
  // const mockOnAddBlock = vi.fn(); // Unused for now

  it('renders empty state when no blocks', () => {
    render(
      <Spine
        blocks={[]}
        selectedBlockId={null}
        onSelectBlock={mockOnSelectBlock}
        onDeleteBlock={mockOnDeleteBlock}
        onOpenSuggester={mockOnOpenSuggester}
        onReorderBlocks={mockOnReorderBlocks}
      />
    );
    expect(screen.getByText(/add your first block/i)).toBeInTheDocument();
  });

  it('renders all blocks', () => {
    render(
      <Spine
        blocks={mockBlocks}
        selectedBlockId={null}
        onSelectBlock={mockOnSelectBlock}
        onDeleteBlock={mockOnDeleteBlock}
        onOpenSuggester={mockOnOpenSuggester}
        onReorderBlocks={mockOnReorderBlocks}
      />
    );
    expect(screen.getByText('PRICE TRIGGER')).toBeInTheDocument();
    expect(screen.getByText('UNISWAP SWAP')).toBeInTheDocument();
  });

  it('calls onOpenSuggester when empty state button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Spine
        blocks={[]}
        selectedBlockId={null}
        onSelectBlock={mockOnSelectBlock}
        onDeleteBlock={mockOnDeleteBlock}
        onOpenSuggester={mockOnOpenSuggester}
        onReorderBlocks={mockOnReorderBlocks}
      />
    );
    
    const addButton = screen.getByRole('button', { name: /add block/i });
    await user.click(addButton);
    
    expect(mockOnOpenSuggester).toHaveBeenCalledTimes(1);
  });

  it('highlights selected block', () => {
    render(
      <Spine
        blocks={mockBlocks}
        selectedBlockId="1"
        onSelectBlock={mockOnSelectBlock}
        onDeleteBlock={mockOnDeleteBlock}
        onOpenSuggester={mockOnOpenSuggester}
        onReorderBlocks={mockOnReorderBlocks}
      />
    );
    
    const firstBlock = screen.getByText('PRICE TRIGGER').closest('[aria-pressed]');
    expect(firstBlock).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders connectors between blocks', () => {
    render(
      <Spine
        blocks={mockBlocks}
        selectedBlockId={null}
        onSelectBlock={mockOnSelectBlock}
        onDeleteBlock={mockOnDeleteBlock}
        onOpenSuggester={mockOnOpenSuggester}
        onReorderBlocks={mockOnReorderBlocks}
      />
    );
    
    // Should have at least one connector (arrow) between blocks
    const connectors = screen.getAllByRole('img', { hidden: true });
    expect(connectors.length).toBeGreaterThan(0);
  });
});

