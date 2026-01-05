# Documentation Guide

This guide explains how to maintain and update the DeFi Builder documentation.

## Documentation Structure

```
docs/
├── README.md                 # Documentation index
├── GETTING_STARTED.md        # Setup and installation
├── ARCHITECTURE.md           # System architecture
├── API.md                    # API reference
├── COMPONENTS.md             # Component library
├── CONTRIBUTING.md           # Contribution guidelines
├── DEPLOYMENT.md             # Deployment guide
├── FEATURES.md               # Features overview
├── QUICK_REFERENCE.md        # Quick reference
├── testing.md                # Testing guide
├── MOCK_API_*.md            # Mock API documentation
├── OPTIMIZATION_*.md        # Optimization docs
└── archive/                  # Archived documentation
    └── old-docs/            # Old status/report files
```

## Writing Documentation

### Style Guidelines

1. **Be Clear and Concise**
   - Use simple, direct language
   - Avoid jargon when possible
   - Explain technical terms

2. **Use Examples**
   - Include code examples
   - Show before/after comparisons
   - Provide real-world use cases

3. **Structure Content**
   - Use clear headings
   - Organize with tables of contents
   - Break up long sections

4. **Keep It Updated**
   - Update docs when code changes
   - Remove outdated information
   - Add new features to docs

### Markdown Best Practices

- Use proper heading hierarchy (H1 → H2 → H3)
- Format code blocks with language tags
- Use tables for structured data
- Include links to related docs
- Add "Last Updated" dates

### Code Examples

```typescript
// ✅ Good: Clear, commented example
import { trpc } from './lib/api/trpc';

// Get all strategies
const strategies = await trpc.strategies.getAll.query();
console.log(`Found ${strategies.length} strategies`);
```

```typescript
// ❌ Bad: Unclear, no context
const s = await trpc.s.getAll.query();
```

## Documentation Types

### Getting Started Guides
- Step-by-step instructions
- Prerequisites clearly listed
- Troubleshooting section
- Next steps included

### API Documentation
- Endpoint descriptions
- Request/response examples
- Error handling
- Authentication requirements

### Architecture Documentation
- System diagrams
- Design decisions
- Technology choices
- Future considerations

### Component Documentation
- Props interfaces
- Usage examples
- Styling guidelines
- Accessibility notes

## Updating Documentation

### When to Update

- Adding new features
- Changing APIs
- Modifying architecture
- Fixing bugs that affect usage
- Deprecating features

### How to Update

1. **Find the relevant doc file**
2. **Update the content**
3. **Update "Last Updated" date**
4. **Check links still work**
5. **Review for clarity**

### Version Control

- Commit docs with related code changes
- Use descriptive commit messages
- Include docs in PR reviews

## Documentation Review Checklist

- [ ] Content is accurate and up-to-date
- [ ] Examples work and are tested
- [ ] Links are valid
- [ ] Code examples are formatted correctly
- [ ] Spelling and grammar checked
- [ ] Structure is logical
- [ ] Related docs are cross-referenced

## Tools

### Markdown Linting
```bash
# Check markdown files
npm install -g markdownlint-cli
markdownlint docs/**/*.md
```

### Link Checking
```bash
# Check for broken links
npm install -g markdown-link-check
markdown-link-check docs/**/*.md
```

## Questions?

- Check existing documentation first
- Follow the style of existing docs
- Ask maintainers for guidance
- Open an issue for documentation bugs


