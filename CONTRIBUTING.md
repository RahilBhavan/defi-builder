# Contributing to DeFi Builder

Thank you for your interest in contributing to DeFi Builder! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project
- Welcome newcomers and help them learn

## Getting Started

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/defi-builder.git
   cd defi-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Create a branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feat/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code refactoring
- `docs/*`: Documentation updates
- `test/*`: Test additions/updates

### Workflow Steps

1. **Create a feature branch** from `main` or `develop`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow the code standards
   - Add tests for new features
   - Update documentation

3. **Test your changes**
   ```bash
   npm run type-check  # Type checking
   npm run lint        # Linting
   npm test            # Run tests
   ```

4. **Commit your changes**
   - Use conventional commits (see [Commit Guidelines](#commit-guidelines))
   - Commit after every major feature completion
   - Write clear, descriptive commit messages

5. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template
   - Link related issues
   - Request review from maintainers

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, standardized commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/updates
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
feat(workspace): add drag-and-drop block reordering

Implement drag-and-drop functionality for reordering blocks in the strategy spine.
Includes visual drop zone indicators and undo/redo support.

Closes #123
```

```bash
fix(backtest): fix equity curve data generation

The backtest engine was returning empty equity curves. Now properly generates
historical data points based on strategy execution.

Fixes #456
```

### Commit Best Practices

- ✅ One logical change per commit
- ✅ Clear, descriptive messages
- ✅ Use imperative mood ("Add feature" not "Added feature")
- ✅ Reference issues in footer
- ✅ Keep commits focused

## Pull Request Process

### Before Submitting

- [ ] Code passes type checking (`npm run type-check`)
- [ ] Code passes linting (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] No console.logs or debug code
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventional commits

### PR Template

When creating a PR, include:

1. **Title**: Use conventional commit format
2. **Description**:
   - What changes were made
   - Why these changes were needed
   - How to test the changes
   - Screenshots (for UI changes)
3. **Related Issues**: Link to related issues
4. **Checklist**: Use the PR template checklist

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Thank you for contributing! 🎉

## Code Standards

### TypeScript

- Use strict TypeScript settings
- Prefer interfaces over types
- Avoid `any`, use `unknown` with type guards
- Use explicit return types for public functions
- Add JSDoc comments for public APIs

### React

- Use functional components with hooks
- Minimize `use client` directives
- Prefer React Server Components where possible
- Use proper memoization (`useMemo`, `useCallback`)
- Follow React best practices

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use design tokens from constants

### File Organization

```
src/
├── components/     # React components
├── services/       # Business logic
├── hooks/         # Custom hooks
├── types/         # TypeScript types
├── utils/         # Utility functions
└── constants/     # Constants
```

### Naming Conventions

- **Components**: PascalCase (`BlockConfigPanel.tsx`)
- **Files**: kebab-case for utilities (`strategy-validator.ts`)
- **Functions**: camelCase (`validateStrategy`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`LegoBlock`)

## Testing

### Writing Tests

- Write tests for new features
- Test edge cases and error handling
- Aim for 80%+ coverage on core logic
- Use descriptive test names

### Running Tests

```bash
npm test              # Run tests
npm run test:ui       # Run with UI
npm run test:coverage # Generate coverage report
```

### Test Structure

```typescript
describe('FeatureName', () => {
  it('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Document complex logic
- Explain "why" not just "what"
- Keep comments up to date

### README Updates

- Update README for new features
- Add examples for new functionality
- Update installation instructions if needed
- Keep feature list current

## Questions?

If you have questions:
- Open an issue for discussion
- Check existing issues and PRs
- Reach out to maintainers

Thank you for contributing to DeFi Builder! 🚀

