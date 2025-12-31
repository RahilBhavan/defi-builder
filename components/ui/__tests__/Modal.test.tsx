import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  const mockOnClose = vi.fn();

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked and closeOnOverlayClick is true', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" closeOnOverlayClick={true}>
        <p>Modal content</p>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" closeOnOverlayClick={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test" size="sm">
        Content
      </Modal>
    );
    let dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-w-md');

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Test" size="lg">
        Content
      </Modal>
    );
    dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-w-4xl');
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" aria-labelledby="custom-title">
        <p>Modal content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'custom-title');
  });
});

