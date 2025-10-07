# GitHub Secrets Configuration

This document describes the required GitHub secrets for the CI/CD pipeline.

## Required Secrets

### AWS Configuration
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key for deployment

### Environment URLs
- `STAGING_BASE_URL`: Base URL for staging environment (e.g., `https://staging.sts-clearance.com`)
- `PRODUCTION_BASE_URL`: Base URL for production environment (e.g., `https://sts-clearance.com`)

### API Keys
- `STAGING_API_KEY`: API key for staging environment testing

### Notifications
- `SLACK_WEBHOOK`: Slack webhook URL for deployment notifications

## How to Configure Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Environment-Specific Secrets

Some secrets are environment-specific and should be configured in the respective environments:

### Staging Environment
- Configure in **Settings** → **Environments** → **staging**
- Add environment-specific secrets if needed

### Production Environment
- Configure in **Settings** → **Environments** → **production**
- Add environment-specific secrets if needed

## Security Best Practices

1. **Rotate secrets regularly**: Update AWS keys and API keys periodically
2. **Use least privilege**: Ensure AWS keys have minimal required permissions
3. **Monitor usage**: Review secret usage in Actions logs
4. **Environment separation**: Use different keys for staging and production

## Troubleshooting

If you see warnings about "Context access might be invalid", these are usually false positives from the GitHub Actions linter. The secrets are properly configured if:

1. They exist in the repository secrets
2. They are referenced correctly in the workflow
3. The workflow runs without authentication errors

## Testing Secret Configuration

You can test if secrets are properly configured by:

1. Running the workflow manually
2. Checking the workflow logs for authentication errors
3. Verifying that deployments complete successfully