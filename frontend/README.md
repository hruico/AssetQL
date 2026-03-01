# AssetQL Frontend

Next.js 14 frontend for the AssetQL AI-powered asset production platform.

## Tech Stack

- Next.js 14 (App Router)
- React 19
- TypeScript
- TailwindCSS 4
- Amazon Cognito (Authentication)
- React Query (Server state)
- Zustand (UI state)
- Recharts (Visualization)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your AWS configuration:
   - Get Cognito User Pool ID and Client ID from Terraform outputs or AWS Console
   - Get API Gateway URL from Terraform outputs
   - Get WebSocket URL from Terraform outputs
   - Get CloudFront URL from Terraform outputs

4. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Required variables in `.env.local`:

```env
# AWS Cognito
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-api-id.execute-api.ap-south-1.amazonaws.com/dev/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-id.execute-api.ap-south-1.amazonaws.com/dev

# S3 Configuration
NEXT_PUBLIC_ASSETS_BUCKET=AssetQL-assets
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-cloudfront-id.cloudfront.net
```

## Getting Terraform Outputs

To get the required configuration values:

```bash
cd ../infra
terraform output
```

This will display:
- `api_base_url` - Use for NEXT_PUBLIC_API_BASE_URL
- `websocket_api_endpoint` - Use for NEXT_PUBLIC_WEBSOCKET_URL
- User Pool ID and Client ID (from auth module outputs)

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Home page
├── lib/
│   ├── auth/              # Cognito authentication
│   │   └── cognito.ts     # Cognito SDK wrapper
│   ├── context/           # React contexts
│   │   └── AuthContext.tsx # Auth state management
│   ├── types/             # TypeScript types
│   │   └── auth.ts        # Auth-related types
│   └── api/               # API client
│       └── client.ts      # Axios client with auth interceptor
└── .env.local             # Environment variables (not committed)
```

## Authentication

The app uses AWS Cognito for authentication. The `AuthProvider` wraps the entire app and provides:

- `user` - Current authenticated user
- `loading` - Auth loading state
- `signIn(email, password)` - Sign in user
- `signUp(email, password)` - Register new user
- `signOut()` - Sign out user
- `confirmSignUp(email, code)` - Confirm email with verification code
- `resendConfirmationCode(email)` - Resend verification code
- `forgotPassword(email)` - Initiate password reset
- `confirmPassword(email, code, newPassword)` - Complete password reset
- `getIdToken()` - Get JWT token for API calls

### Usage Example

```tsx
'use client';

import { useAuth } from '@/lib/context/AuthContext';

export default function MyComponent() {
  const { user, signIn, signOut } = useAuth();

  if (!user) {
    return <button onClick={() => signIn('email@example.com', 'password')}>
      Sign In
    </button>;
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## API Client

The `apiClient` automatically adds authentication headers to all requests:

```tsx
import { apiClient } from '@/lib/api/client';

// GET request
const sessions = await apiClient.get('/sessions');

// POST request
const newSession = await apiClient.post('/sessions', { name: 'My Session' });

// PUT request
await apiClient.put('/sessions/123/phase', { phase: 'SINGLE_ITERATION' });

// DELETE request
await apiClient.delete('/sessions/123');
```

## Development

```bash
# Run dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

## Notes

- All API calls automatically include JWT token from Cognito
- Unauthorized requests (401) redirect to `/login`
- Environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
