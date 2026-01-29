# Test Authentication

You are tasked with testing the Simyl passwordless authentication flow using Cognito custom auth with OTP codes.

## Process

1. **Start the dev server if needed**:

   ```bash
   AWS_PROFILE=simyl_labs pnpm dev
   # or
   pnpm --filter web dev
   ```

2. **Use Puppeteer MCP to navigate**:
   - Go to `http://localhost:3000/login`
   - Enter test email (e.g., `test@simyl.ai` for admin role)
   - Submit form to trigger OTP send

3. **Retrieve OTP code from AWS CloudWatch**:

   ```bash
   AWS_PROFILE=simyl_labs aws logs filter-log-events \
     --log-group-name "/aws/lambda/AuthStack-dev-CreateAuthChallengeB2F8D873-S9SfvdRY4Vdj" \
     --start-time $(date -d '5 minutes ago' +%s)000 \
     --region us-east-1 \
     --filter-pattern "🔑"
   ```

   Look for: `🔑 [DEV-ONLY] OTP CODE FOR TESTING: XXXXXX`

4. **Complete authentication**:
   - Enter OTP code in verification form
   - Click "VERIFY & ACCESS" button
   - Verify redirect to dashboard
   - Check session establishment with Auth.js

5. **Test role-based access**:
   - Navigate to admin sections (visible for @simyl.ai emails)
   - Verify Trial/Full/Admin role assignments
   - Check that admin-only components appear correctly
   - Test access to /api/admin/\* endpoints

## Troubleshooting

- If OTP not found: Check Lambda logs are being written (may need to update log group name)
- If auth fails: Verify Cognito pool configuration (dev: us-east-1_hwv5UqMud, prod: us-east-1_6JxFpIvL5)
- If session not created: Check Auth.js configuration in packages/auth/
- For button clicking: Use JavaScript evaluation if CSS selectors fail
