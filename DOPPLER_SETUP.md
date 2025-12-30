# Doppler Secrets Management Setup

This guide explains how to set up and use Doppler for secure secrets management in DeFi Builder.

## What is Doppler?

Doppler is a modern secrets management platform that:
- 🔐 **Encrypts secrets** at rest and in transit
- 📝 **Provides audit logging** for all secret access
- 🔄 **Supports secret rotation** with zero downtime
- 🚀 **Integrates with CI/CD** pipelines
- 👥 **Team collaboration** with role-based access control

## Why Doppler?

### Current State (Environment Variables)
- ❌ Secrets in plain text files
- ❌ No audit trail
- ❌ Manual secret rotation
- ❌ Risk of accidental commits
- ❌ No centralized management

### With Doppler
- ✅ Encrypted secrets
- ✅ Complete audit trail
- ✅ Automated rotation
- ✅ Git-safe (no secrets in code)
- ✅ Centralized management

---

## Quick Start

### 1. Install Doppler CLI

```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Windows (PowerShell)
(New-Object Net.WebClient).DownloadString("https://cli.doppler.com/install.ps1") | powershell

# Verify installation
doppler --version
```

### 2. Authenticate

```bash
doppler login
```

This opens your browser to authenticate with Doppler.

### 3. Create Project

```bash
# Create a new project
doppler projects create defi-builder

# Or link to existing project
doppler setup
```

### 4. Add Secrets

```bash
# Set secrets via CLI
doppler secrets set DATABASE_URL="postgresql://user:pass@host:5432/db"
doppler secrets set JWT_SECRET="your-secret-key-minimum-32-characters"
doppler secrets set GEMINI_API_KEY="your-gemini-api-key"
doppler secrets set REDIS_URL="redis://host:6379"
doppler secrets set SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"

# Or use the Doppler dashboard
# Visit: https://dashboard.doppler.com
```

### 5. Configure Environments

Doppler uses **configs** to manage different environments:

```bash
# Create configs for different environments
doppler configs create dev
doppler configs create staging
doppler configs create prod

# Switch between configs
doppler configs use dev
doppler configs use prod
```

---

## Development Setup

### Option 1: Doppler CLI (Recommended for Local Dev)

Run your backend with Doppler:

```bash
cd backend
doppler run -- npm run dev
```

Doppler will inject secrets as environment variables automatically.

### Option 2: Doppler Service Token (For Production)

1. **Generate Service Token**
   ```bash
   doppler configs tokens create prod-token --config prod --project defi-builder
   ```

2. **Set Token in Environment**
   ```bash
   export DOPPLER_TOKEN="your-service-token"
   export DOPPLER_PROJECT="defi-builder"
   export DOPPLER_CONFIG="prod"
   ```

3. **Backend will auto-detect and use Doppler**

---

## Production Deployment

### Railway

1. **Add Doppler Service Token**
   - Go to Railway project settings
   - Add environment variable: `DOPPLER_TOKEN`
   - Add: `DOPPLER_PROJECT=defi-builder`
   - Add: `DOPPLER_CONFIG=prod`

2. **Install Doppler in Build**
   ```bash
   # In Railway build command or Dockerfile
   curl -Ls https://cli.doppler.com/install.sh | sh
   doppler secrets download --no-file --format env > .env
   ```

### Render

1. **Add Environment Variables**
   - `DOPPLER_TOKEN` - Your service token
   - `DOPPLER_PROJECT` - Project name
   - `DOPPLER_CONFIG` - Config name (prod)

2. **Update Start Command**
   ```bash
   doppler run -- npm start
   ```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

# Install Doppler CLI
RUN curl -Ls https://cli.doppler.com/install.sh | sh

# Copy application
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Use Doppler to inject secrets
ENTRYPOINT ["doppler", "run", "--"]
CMD ["npm", "start"]
```

### Self-Hosted

1. **Install Doppler CLI on server**
2. **Authenticate**: `doppler login`
3. **Set up service token** in environment
4. **Run with Doppler**: `doppler run -- npm start`

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v3
        with:
          token: ${{ secrets.DOPPLER_TOKEN }}
      
      - name: Run tests with secrets
        run: doppler run -- npm test
      
      - name: Build with secrets
        run: doppler run -- npm run build
```

### Environment Variables in GitHub

1. Go to Repository Settings → Secrets
2. Add: `DOPPLER_TOKEN` (service token for CI)

---

## Secret Rotation

### Manual Rotation

```bash
# Update secret
doppler secrets set JWT_SECRET="new-secret-key"

# Restart application (secrets reload automatically)
# Or use sync endpoint if implemented
```

### Automated Rotation

Doppler supports webhooks for secret changes:

1. **Set up webhook in Doppler dashboard**
2. **Configure webhook endpoint** in your application
3. **Implement secret sync** endpoint:

```typescript
// backend/src/trpc/router.ts
webhook: publicProcedure
  .post(async ({ input }) => {
    // Verify webhook signature
    // Sync secrets from Doppler
    await syncSecrets();
    return { success: true };
  })
```

---

## Migration from Environment Variables

### Step 1: Export Current Secrets

```bash
# Export all current env vars to Doppler
doppler secrets set DATABASE_URL="$DATABASE_URL"
doppler secrets set JWT_SECRET="$JWT_SECRET"
doppler secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
# ... etc
```

### Step 2: Update Application

The application already supports Doppler with fallback to env vars, so no code changes needed!

### Step 3: Test Locally

```bash
# Test with Doppler
doppler run -- npm run dev

# Verify secrets are loaded
# Check logs for "Doppler initialized successfully"
```

### Step 4: Update Production

1. Set `DOPPLER_TOKEN` in production environment
2. Set `DOPPLER_PROJECT` and `DOPPLER_CONFIG`
3. Restart application
4. Remove old `.env` files (optional, Doppler takes precedence)

---

## Security Best Practices

### 1. Use Service Tokens (Not Personal Tokens)

```bash
# Generate service token for production
doppler configs tokens create prod-token \
  --config prod \
  --project defi-builder \
  --access read
```

### 2. Rotate Tokens Regularly

```bash
# Rotate service token
doppler configs tokens delete old-token
doppler configs tokens create new-token --config prod
```

### 3. Use Least Privilege

- Service tokens should have `read` access only
- Use different tokens for different environments
- Revoke unused tokens

### 4. Audit Logging

Doppler provides audit logs for:
- Secret access
- Secret modifications
- Token usage
- User actions

View logs in Doppler dashboard.

---

## Troubleshooting

### Doppler Not Initializing

**Issue:** "Doppler not configured, using environment variables"

**Solutions:**
1. Check `DOPPLER_TOKEN` is set
2. Verify token is valid: `doppler configs tokens verify`
3. Check `DOPPLER_PROJECT` and `DOPPLER_CONFIG` are set
4. Verify token has access to the project/config

### Secrets Not Loading

**Issue:** Secrets not available in application

**Solutions:**
1. Verify secrets exist: `doppler secrets`
2. Check config is correct: `doppler configs`
3. Test with CLI: `doppler run -- env | grep DATABASE_URL`
4. Check application logs for Doppler initialization

### Fallback to Environment Variables

The application automatically falls back to environment variables if Doppler is not available. This ensures:
- ✅ Development works without Doppler setup
- ✅ Gradual migration possible
- ✅ No breaking changes

---

## Cost

### Free Tier
- ✅ Unlimited secrets
- ✅ 3 projects
- ✅ 3 configs per project
- ✅ Audit logs (30 days)
- ✅ Community support

### Paid Plans
- Team collaboration features
- Longer audit log retention
- Advanced integrations
- Priority support

**For most projects, the free tier is sufficient.**

---

## Alternative: AWS Secrets Manager

If you prefer AWS Secrets Manager:

```typescript
// backend/src/utils/secrets-aws.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString || '';
}
```

**Doppler is recommended** for:
- ✅ Easier setup
- ✅ Better developer experience
- ✅ Free tier
- ✅ Simpler CI/CD integration

---

## Resources

- [Doppler Documentation](https://docs.doppler.com)
- [Doppler CLI Reference](https://docs.doppler.com/docs/cli)
- [Doppler GitHub Actions](https://github.com/DopplerHQ/cli-action)
- [Doppler Dashboard](https://dashboard.doppler.com)

---

## Support

For issues or questions:
1. Check [Doppler Docs](https://docs.doppler.com)
2. Review application logs for Doppler initialization
3. Test with CLI: `doppler run -- npm run dev`

---

**Status:** Ready for implementation  
**Migration Path:** Gradual (fallback to env vars ensures no breaking changes)

