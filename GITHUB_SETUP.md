# GitHub Repository Setup Guide

This guide will help you connect your local repository to GitHub and set up best practices.

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `defi-builder`
   - **Description**: "A visual, AI-powered DeFi strategy builder and workspace"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/defi-builder.git

# Rename the default branch to 'main' (if not already)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Step 3: Set Up Branch Protection (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Add a branch protection rule for `main`:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 or more)
   - ✅ Require status checks to pass before merging
     - Select: `type-check`, `lint`, `test`, `build`
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

## Step 4: Set Up GitHub Secrets (For CI/CD)

If you want CI/CD to work with API keys:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add secrets:
   - `VITE_GEMINI_API_KEY`: Your Gemini API key (optional, for CI builds)

## Step 5: Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

## Step 6: Create .env.example File

Create a `.env.example` file in the root directory:

```bash
# Gemini AI API Key (optional, for AI block suggestions)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

This file should be committed (it's a template, not actual secrets).

## Step 7: Verify Setup

1. **Check remote is set correctly:**
   ```bash
   git remote -v
   ```

2. **Verify CI/CD works:**
   - Make a small change
   - Create a PR
   - Check that GitHub Actions runs successfully

3. **Test commit guidelines:**
   - Make a feature change
   - Commit using conventional commits format
   - Push and verify it follows the guidelines

## Branch Strategy

### Main Branches

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features (optional)

### Feature Branches

- **`feat/*`**: New features
- **`fix/*`**: Bug fixes
- **`refactor/*`**: Code refactoring
- **`docs/*`**: Documentation updates
- **`test/*`**: Test additions/updates

### Example Workflow

```bash
# Start a new feature
git checkout -b feat/block-reordering

# Make changes and commit
git add .
git commit -m "feat(workspace): add drag-and-drop block reordering"

# Push to GitHub
git push origin feat/block-reordering

# Create PR on GitHub
# After PR is merged, delete the branch
git checkout main
git pull origin main
git branch -d feat/block-reordering
```

## Commit After Major Features

As per `.cursorrules`, commit after every major feature is added:

1. **Complete the feature** (fully implemented, tested, documented)
2. **Run checks:**
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```
3. **Commit with conventional format:**
   ```bash
   git add .
   git commit -m "feat(scope): description

   Detailed explanation of what was added and why.

   Closes #123"
   ```
4. **Push to your branch:**
   ```bash
   git push origin your-branch-name
   ```

## Pull Request Best Practices

1. **Use the PR template** - It's automatically loaded when creating a PR
2. **Link issues** - Use "Closes #123" in PR description
3. **Request reviews** - Tag relevant team members
4. **Keep PRs focused** - One feature/fix per PR
5. **Update documentation** - If your feature needs docs

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Best Practices](https://github.com/git/git/blob/master/Documentation/SubmittingPatches)

## Troubleshooting

### "Remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/defi-builder.git
```

### "Failed to push some refs"
```bash
git pull origin main --rebase
git push origin main
```

### "Permission denied"
- Check your GitHub credentials
- Use SSH instead: `git remote set-url origin git@github.com:YOUR_USERNAME/defi-builder.git`

## Next Steps

1. ✅ Repository is set up
2. ✅ CI/CD is configured
3. ✅ Branch protection is enabled
4. ✅ Commit guidelines are in place
5. 🚀 Start developing features!

Happy coding! 🎉

