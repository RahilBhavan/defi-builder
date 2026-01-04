import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExecuteButton } from '../ExecuteButton';

describe('ExecuteButton', () => {
  const mockOnClick = vi.fn();

  it('renders execute button when valid and not executing', () => {
    render(<ExecuteButton isValid={true} isExecuting={false} onClick={mockOnClick} />);
    expect(screen.getByText(/execute strategy/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked and valid', async () => {
    const user = userEvent.setup();
    render(<ExecuteButton isValid={true} isExecuting={false} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when invalid', () => {
    render(<ExecuteButton isValid={false} isExecuting={false} onClick={mockOnClick} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when executing', () => {
    render(<ExecuteButton isValid={true} isExecuting={true} onClick={mockOnClick} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows executing state when isExecuting is true', () => {
    render(<ExecuteButton isValid={true} isExecuting={true} onClick={mockOnClick} />);
    expect(screen.getByText(/executing/i)).toBeInTheDocument();
  });

  it('has correct aria-label when executing', () => {
    render(<ExecuteButton isValid={true} isExecuting={true} onClick={mockOnClick} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Executing strategy');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('has correct aria-label when not executing', () => {
    render(<ExecuteButton isValid={true} isExecuting={false} onClick={mockOnClick} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Execute strategy');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });
});
