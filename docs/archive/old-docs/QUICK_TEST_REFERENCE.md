# Quick Test Reference

## 🚀 Quick Commands

### Frontend Tests
```bash
# Run all frontend tests
npm test

# Run once (no watch)
npm test -- --run

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

### Backend Tests
```bash
# Run all backend tests
cd backend && npm test

# Run once (no watch)
cd backend && npm test -- --run

# With coverage
cd backend && npm test -- --coverage
```

### Run Both
```bash
# Run frontend and backend tests sequentially
npm run test:all
```

## 📊 Current Test Status

### Frontend
- ✅ Test infrastructure: Working
- ✅ 9 tests passing
- ⚠️ 4 tests failing (test logic issues, not infrastructure)

### Backend
- ✅ Test infrastructure: Working
- ✅ 2 tests passing (example tests)

## 📁 Test Locations

**Frontend:**
- `hooks/__tests__/` - React hooks tests
- `services/__tests__/` - Service layer tests
- `services/backtest/__tests__/` - Backtest engine tests

**Backend:**
- `backend/src/__tests__/` - Backend tests

## 🛠️ Adding New Tests

### Frontend Test Example
```typescript
// hooks/__tests__/myHook.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should work correctly', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```

### Backend Test Example
```typescript
// backend/src/__tests__/myService.test.ts
import { describe, it, expect } from 'vitest';
import { myService } from '../services/myService';

describe('myService', () => {
  it('should work correctly', () => {
    const result = myService.doSomething();
    expect(result).toBeDefined();
  });
});
```

## 🔍 Debugging

### Run specific test file
```bash
# Frontend
npm test -- useDebounce.test.ts

# Backend
cd backend && npm test -- example.test.ts
```

### Run tests matching pattern
```bash
# Frontend
npm test -- --grep "useDebounce"

# Backend
cd backend && npm test -- --grep "example"
```

## 📈 Coverage Reports

After running coverage:
```bash
# Frontend
open coverage/index.html

# Backend
open backend/coverage/index.html
```

