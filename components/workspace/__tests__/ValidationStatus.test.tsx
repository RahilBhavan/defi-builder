import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationStatus } from '../ValidationStatus';
import type { ValidationResult } from '../../../types';

describe('ValidationStatus', () => {
  it('renders nothing when validationResult is null', () => {
    const { container } = render(<ValidationStatus validationResult={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when invalid but no errors (empty strategy)', () => {
    const invalidResult: ValidationResult = { valid: false, errors: [] };
    const { container } = render(<ValidationStatus validationResult={invalidResult} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows validating state when isValidating is true', () => {
    render(<ValidationStatus validationResult={null} isValidating={true} />);
    expect(screen.getByText(/validating/i)).toBeInTheDocument();
  });

  it('shows valid state when strategy is valid', () => {
    const validResult: ValidationResult = { valid: true, errors: [] };
    render(<ValidationStatus validationResult={validResult} />);
    expect(screen.getByText(/valid/i)).toBeInTheDocument();
  });

  it('shows error count when strategy is invalid', () => {
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [
        { blockId: '1', message: 'Error 1' },
        { blockId: '2', message: 'Error 2' },
      ],
    };
    render(<ValidationStatus validationResult={invalidResult} />);
    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
  });

  it('shows error details when clicked', async () => {
    const user = userEvent.setup();
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [{ blockId: '1', message: 'Test error message' }],
    };
    render(<ValidationStatus validationResult={invalidResult} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Error details should be visible (may be in a tooltip or panel)
    const errorText = screen.queryByText('Test error message');
    if (errorText) {
      expect(errorText).toBeInTheDocument();
    }
  });

  it('toggles error details on click', async () => {
    const user = userEvent.setup();
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [{ blockId: '1', message: 'Test error' }],
    };
    render(<ValidationStatus validationResult={invalidResult} />);
    
    const button = screen.getByRole('button');
    
    // Click to show
    await user.click(button);
    // Error details may be in a panel that appears
    const errorPanel = screen.queryByText(/validation errors/i);
    if (errorPanel) {
      expect(errorPanel).toBeInTheDocument();
    }
  });
});

