# Component Documentation

This document provides an overview of the UI components available in DeFi Builder. For interactive component documentation, see [Storybook](#storybook).

## UI Components

### Button

A versatile button component with multiple variants and sizes.

**Location**: `components/ui/Button.tsx`

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { Button } from './components/ui/Button';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

### Modal

A reusable modal dialog component.

**Location**: `components/ui/Modal.tsx`

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}
```

### VirtualList

Efficiently renders large lists by only rendering visible items.

**Location**: `components/ui/VirtualList.tsx`

**Props**:
```typescript
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}
```

### VirtualTable

Efficiently renders large table rows by only rendering visible items.

**Location**: `components/ui/VirtualTable.tsx`

**Usage**:
```tsx
<VirtualTableContainer height={500}>
  <table>
    <thead>...</thead>
    <tbody>
      <VirtualTable
        items={trades}
        rowHeight={60}
        containerHeight={500}
        renderRow={(trade) => <tr>...</tr>}
      />
    </tbody>
  </table>
</VirtualTableContainer>
```

## Feature Components

### Workspace

Main workspace component for building strategies.

**Location**: `components/Workspace.tsx` or `features/strategy-builder/components/Workspace.tsx`

**Features**:
- Drag-and-drop block interface
- Real-time validation
- Undo/redo functionality
- Strategy execution

### BacktestModal

Modal for displaying backtest results.

**Location**: `components/modals/BacktestModal.tsx`

**Features**:
- Equity curve visualization
- Trade history table
- Metrics display
- CSV export

### OptimizationPanel

Panel for strategy optimization.

**Location**: `components/OptimizationPanel.tsx`

**Features**:
- Multi-objective optimization
- Pareto frontier visualization
- Parameter configuration

## Storybook

Interactive component documentation is available via Storybook.

### Running Storybook

```bash
npm run storybook
```

Then open `http://localhost:6006` in your browser.

### Available Stories

- **Button**: All variants and states
- **Modal**: Open/close behavior
- **VirtualList**: Large list rendering
- **VirtualTable**: Large table rendering

### Adding New Stories

Create a `*.stories.tsx` file next to your component:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    // component props
  },
};
```

---

For interactive examples, run Storybook and explore components in the browser.

