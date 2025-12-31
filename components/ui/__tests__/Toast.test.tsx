import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastComponent } from '../Toast';
import type { Toast } from '../../../hooks/useToast';

describe('ToastComponent', () => {
  const mockOnDismiss = vi.fn();

  const mockToast: Toast = {
    id: '1',
    type: 'success',
    message: 'Test message',
  };

  it('renders toast with message', () => {
    render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(closeButton);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('renders success toast with correct styling', () => {
    render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);
    const toast = screen.getByText('Test message').closest('div');
    expect(toast?.className).toContain('border-success-green');
  });

  it('renders error toast with correct styling', () => {
    const errorToast: Toast = { ...mockToast, type: 'error' };
    render(<ToastComponent toast={errorToast} onDismiss={mockOnDismiss} />);
    const toast = screen.getByText('Test message').closest('div');
    expect(toast?.className).toContain('border-alert-red');
  });

  it('renders warning toast with correct styling', () => {
    const warningToast: Toast = { ...mockToast, type: 'warning' };
    render(<ToastComponent toast={warningToast} onDismiss={mockOnDismiss} />);
    const toast = screen.getByText('Test message').closest('div');
    expect(toast?.className).toContain('border-orange');
  });

  it('renders info toast with correct styling', () => {
    const infoToast: Toast = { ...mockToast, type: 'info' };
    render(<ToastComponent toast={infoToast} onDismiss={mockOnDismiss} />);
    const toast = screen.getByText('Test message').closest('div');
    expect(toast?.className).toContain('border-blue-500');
  });
});

