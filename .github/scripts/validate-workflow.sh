#!/bin/bash

# Validate GitHub Actions workflow configuration
# This script checks for common issues in the CI/CD pipeline

set -e

echo "🔍 Validating GitHub Actions workflow..."

# Check if workflow file exists
WORKFLOW_FILE=".github/workflows/ci-cd-pipeline.yml"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

echo "✅ Workflow file found"

# Check for required secrets in workflow
REQUIRED_SECRETS=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "STAGING_BASE_URL"
    "PRODUCTION_BASE_URL"
    "SLACK_WEBHOOK"
)

echo "🔑 Checking for required secrets in workflow..."
for secret in "${REQUIRED_SECRETS[@]}"; do
    if grep -q "secrets\.$secret" "$WORKFLOW_FILE"; then
        echo "✅ Secret referenced: $secret"
    else
        echo "⚠️  Secret not found in workflow: $secret"
    fi
done

# Check for common workflow issues
echo "🔧 Checking for common issues..."

# Check for deprecated actions
if grep -q "actions/checkout@v[12]" "$WORKFLOW_FILE"; then
    echo "⚠️  Found deprecated checkout action version"
fi

# Check for hardcoded versions that might need updates
if grep -q "node-version.*16" "$WORKFLOW_FILE"; then
    echo "⚠️  Found Node.js version 16, consider updating to 18+"
fi

# Check for proper environment configuration
if grep -q "environment:" "$WORKFLOW_FILE"; then
    echo "✅ Environment protection configured"
else
    echo "⚠️  No environment protection found"
fi

# Validate YAML syntax (if yq is available)
if command -v yq &> /dev/null; then
    echo "📝 Validating YAML syntax..."
    if yq eval '.' "$WORKFLOW_FILE" > /dev/null 2>&1; then
        echo "✅ YAML syntax is valid"
    else
        echo "❌ YAML syntax errors found"
        exit 1
    fi
else
    echo "⚠️  yq not available, skipping YAML validation"
fi

# Check for security best practices
echo "🛡️  Checking security best practices..."

# Check for pinned action versions
if grep -q "@master\|@main" "$WORKFLOW_FILE"; then
    echo "⚠️  Found unpinned action versions (using @master or @main)"
fi

# Check for proper permissions
if grep -q "permissions:" "$WORKFLOW_FILE"; then
    echo "✅ Explicit permissions configured"
else
    echo "⚠️  No explicit permissions found, using defaults"
fi

echo "🎉 Workflow validation completed!"
echo ""
echo "📋 Summary:"
echo "- Review any warnings above"
echo "- Ensure all required secrets are configured in GitHub"
echo "- Test the workflow with a small change"
echo ""
echo "📚 For more information, see .github/SECRETS.md"