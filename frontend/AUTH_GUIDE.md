# AssetQL Authentication Guide

Complete guide to the authentication system in AssetQL frontend.

## Overview

AssetQL uses AWS Cognito for authentication with a complete user flow including:
- Sign up with email verification
- Sign in
- Password reset
- Protected routes
- JWT token management

## Pages

### 1. Home Page (`/`)
- Landing page for unauthenticated users
- Redirects to `/dashboard` if user is already signed in
- Features overview and call-to-action buttons

### 2. Login Page (`/login`)
- Email and password sign-in
- Handles Cognito errors gracefully
- Redirects to `/verify` if email not confirmed
- Redirects to `/dashboard` on success

**Error Handling:**
- `UserNotConfirmedException` → Redirect to verification
- `NotAuthorizedException` → "Incorrect email or password"
- `UserNotFoundException` → "No account found"

### 3. Signup Page (`/signup`)
- Email and password registration
- Password validation (8+ chars, uppercase, number, special char)
- Confirm password field
- Redirects to `/verify` on success

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

### 4. Verify Email Page (`/verify`)
- Email verification with 6-digit code
- Resend code functionality
- Auto-redirects to `/login` on success
- Handles expired codes

### 5. Forgot Password Page (`/forgot-password`)
- Request password reset code
- Sends code to user's email
- Redirects to `/reset-password` on success

### 6. Reset Password Page (`/reset-password`)
- Enter reset code and new password
- Password validation
- Redirects to `/login` on success

### 7. Dashboard Page (`/dashboard`)
- Protected route (requires authentication)
- Redirects to `/login` if not authenticated
- Shows user email and sign out button
- Placeholder for main app features

## Authentication Flow

### Sign Up Flow
```
1. User fills signup form
   ↓
2. Password validation
   ↓
3. Cognito creates user (unconfirmed)
   ↓
4. Redirect to /verify?email=user@example.com
   ↓
5. User enters verification code
   ↓
6. Cognito confirms user
   ↓
7. Redirect to /login
```

### Sign In Flow
```
1. User enters credentials
   ↓
2. Cognito authenticates
   ↓
3. JWT tokens stored in browser
   ↓
4. AuthContext updates user state
   ↓
5. Redirect to /dashboard
```

### Password Reset Flow
```
1. User enters email on /forgot-password
   ↓
2. Cognito sends reset code
   ↓
3. Redirect to /reset-password?email=user@example.com
   ↓
4. User enters code and new password
   ↓
5. Cognito updates password
   ↓
6. Redirect to /login
```

## Protected Routes

To protect a route, use the pattern from `dashboard/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

export default function ProtectedPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <div>Protected content</div>;
}
```

## Using Auth Context

The `useAuth` hook provides access to authentication state and methods:

```tsx
import { useAuth } from '@/lib/context/AuthContext';

function MyComponent() {
  const {
    user,              // Current user or null
    loading,           // Auth loading state
    signIn,            // (email, password) => Promise<void>
    signUp,            // (email, password) => Promise<void>
    signOut,           // () => Promise<void>
    confirmSignUp,     // (email, code) => Promise<void>
    resendConfirmationCode, // (email) => Promise<void>
    forgotPassword,    // (email) => Promise<void>
    confirmPassword,   // (email, code, newPassword) => Promise<void>
    getIdToken,        // () => Promise<string | null>
  } = useAuth();

  // Use auth methods...
}
```

## User Object

```typescript
interface User {
  id: string;              // Cognito sub (user ID)
  email: string;           // User's email
  emailVerified: boolean;  // Email verification status
  attributes?: Record<string, string>; // Additional Cognito attributes
}
```

## Error Handling

### Common Cognito Error Codes

| Error Code | Meaning | Suggested Action |
|------------|---------|------------------|
| `UserNotConfirmedException` | Email not verified | Redirect to `/verify` |
| `NotAuthorizedException` | Wrong credentials | Show error message |
| `UserNotFoundException` | User doesn't exist | Show error message |
| `UsernameExistsException` | Email already registered | Show error message |
| `InvalidPasswordException` | Password doesn't meet requirements | Show validation error |
| `CodeMismatchException` | Wrong verification/reset code | Show error message |
| `ExpiredCodeException` | Code expired | Offer to resend |
| `LimitExceededException` | Too many attempts | Show rate limit message |

### Error Display Pattern

All auth pages use consistent error display:

```tsx
{error && (
  <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
    {error}
  </div>
)}
```

## Styling

All auth pages use consistent styling:
- Zinc color palette (zinc-50 to zinc-950)
- Dark mode support
- Responsive design
- Consistent form inputs
- Accessible focus states

### Color Scheme
- Background: `bg-zinc-50 dark:bg-zinc-950`
- Cards: `bg-white dark:bg-zinc-900`
- Borders: `border-zinc-200 dark:border-zinc-800`
- Text: `text-zinc-900 dark:text-zinc-50`
- Muted text: `text-zinc-600 dark:text-zinc-400`

### Button Styles
- Primary: `bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900`
- Secondary: `border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800`

## Security Considerations

1. **JWT Tokens**: Stored in browser memory (not localStorage)
2. **HTTPS Only**: All API calls use HTTPS in production
3. **Password Requirements**: Enforced by Cognito
4. **Rate Limiting**: Cognito handles rate limiting
5. **Session Expiry**: Tokens expire after 1 hour (configurable in Cognito)

## Testing Authentication

### Manual Testing Checklist

- [ ] Sign up with new email
- [ ] Verify email with code
- [ ] Sign in with verified account
- [ ] Access protected route (dashboard)
- [ ] Sign out
- [ ] Try to access dashboard (should redirect to login)
- [ ] Request password reset
- [ ] Reset password with code
- [ ] Sign in with new password
- [ ] Test error cases (wrong password, expired code, etc.)

### Test User Creation

To create a test user via AWS CLI:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

## Troubleshooting

### "No current user" error
- Check that Cognito User Pool ID and Client ID are correct in `.env.local`
- Verify the user pool exists in AWS Console
- Ensure the region is correct (`ap-south-1`)

### Verification code not received
- Check spam folder
- Verify email configuration in Cognito User Pool
- Use "Resend code" button
- Check Cognito email sending limits

### Password reset not working
- Ensure user exists and is confirmed
- Check that email is verified
- Verify Cognito password policy matches frontend validation

### Redirect loops
- Clear browser cache and cookies
- Check that `useEffect` dependencies are correct
- Verify `loading` state is properly handled

## Next Steps

1. Add social login (Google, GitHub)
2. Implement MFA (Multi-Factor Authentication)
3. Add "Remember me" functionality
4. Implement session timeout warnings
5. Add user profile management
6. Implement email change flow
7. Add account deletion

## Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [amazon-cognito-identity-js](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
