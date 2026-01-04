import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardSkeleton, ChartSkeleton, Skeleton, TableRowSkeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders skeleton with default props', () => {
    render(<Skeleton />);
    const skeleton = screen.getByLabelText('Loading...');
    expect(skeleton).toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    render(<Skeleton width={100} height={50} />);
    const skeleton = screen.getByLabelText('Loading...');
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' });
  });

  it('applies text variant', () => {
    render(<Skeleton variant="text" />);
    const skeleton = screen.getByLabelText('Loading...');
    expect(skeleton.className).toContain('h-4');
  });

  it('applies circular variant', () => {
    render(<Skeleton variant="circular" />);
    const skeleton = screen.getByLabelText('Loading...');
    expect(skeleton.className).toContain('rounded-full');
  });

  it('applies rounded class when rounded is true', () => {
    render(<Skeleton rounded={true} />);
    const skeleton = screen.getByLabelText('Loading...');
    expect(skeleton.className).toContain('rounded');
  });
});

describe('TableRowSkeleton', () => {
  it('renders table row skeleton with default columns', () => {
    render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>
    );
    const cells = document.querySelectorAll('td');
    expect(cells.length).toBe(5); // Default 5 columns
  });

  it('renders table row skeleton with custom columns', () => {
    render(
      <table>
        <tbody>
          <TableRowSkeleton columns={3} />
        </tbody>
      </table>
    );
    const cells = document.querySelectorAll('td');
    expect(cells.length).toBe(3);
  });
});

describe('CardSkeleton', () => {
  it('renders card skeleton', () => {
    render(<CardSkeleton />);
    const card = document.querySelector('.p-4.bg-white');
    expect(card).toBeInTheDocument();
  });
});

describe('ChartSkeleton', () => {
  it('renders chart skeleton', () => {
    render(<ChartSkeleton />);
    const chart = document.querySelector('.w-full.h-64');
    expect(chart).toBeInTheDocument();
  });
});
