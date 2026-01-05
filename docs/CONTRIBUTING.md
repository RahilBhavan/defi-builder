# Contributing to DeFi Builder

Thank you for your interest in contributing to DeFi Builder! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/defi-builder.git
   cd defi-builder
   ```
3. **Set up development environment**
   - Follow the [Getting Started Guide](GETTING_STARTED.md)
   - Ensure all tests pass: `bun run test`
4. **Create a branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test additions/updates

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(workspace): add drag-and-drop block reordering

Implement drag-and-drop functionality for reordering blocks in the strategy spine.
Includes visual drop zone indicators and undo/redo support.

Closes #123
```

```
fix(backtest): fix equity curve data generation

The backtest engine was returning empty equity curves. Now properly generates
historical data points based on strategy execution.

Fixes #456
```

### Code Style

- **TypeScript**: Use strict mode, prefer interfaces over types
- **React**: Use functional components with hooks
- **Formatting**: Run `bun run lint:fix` before committing
- **Imports**: Organize imports (external → internal → relative)

### Testing

- Write tests for new features
- Ensure all tests pass: `bun run test`
- Aim for 80%+ coverage on critical paths
- Update tests when modifying existing code

### Pull Request Process

1. **Update your branch**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run checks**
   ```bash
   bun run lint
   bun run type-check
   bun run test
   ```

3. **Create Pull Request**
   - Use a clear, descriptive title
   - Describe what changes were made and why
   - Reference related issues
   - Include screenshots for UI changes

4. **Review Process**
   - Address review comments
   - Keep PRs focused and small when possible
   - Update PR description if scope changes

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): User | null {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### React Components

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

// ❌ Bad
export const Button = ({ label, onClick, disabled }) => {
  // ...
};
```

### File Organization

- One component per file
- Co-locate related files (component + test + styles)
- Use index files for clean imports

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for public APIs
- Update relevant documentation files
- Include examples in documentation

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Ask questions in issue discussions

Thank you for contributing! 🎉

