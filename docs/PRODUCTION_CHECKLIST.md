# Production Deployment Checklist

## 1. Image Storage Fix

Your `SUPABASE_SERVICE_KEY` in `.env` appears truncated. Supabase service keys are long JWT tokens (200+ characters).

### Get the correct key:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. Update your `.env`:
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (full key)
```

### Create the storage bucket:
Run this in Supabase SQL Editor:
```sql
-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'generated-images');

-- Allow service role to upload
CREATE POLICY "Service Upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'generated-images');
```

---

## 2. Security Audit ✅

All session endpoints properly check `session.user_id != user.id`:
- `/session/{session_id}/chat` ✅
- `/session/complete` ✅
- `/session/cancel` ✅
- `/user/sessions/{session_id}` ✅
- `/user/sessions/{session_id}` (DELETE) ✅
- `/session/{session_id}/element-messages` ✅
- `/session/{session_id}/extract-understanding` ✅
- `/session/{session_id}/deep-understanding` ✅

User-specific endpoints only access `current_user["db_user"]`:
- `/user/stats` ✅
- `/user/sessions` ✅
- `/user/regenerate-avatar` ✅

---

## 3. Create Test Client User

Run this SQL in Supabase SQL Editor to create a test user:

```sql
-- Create a test client user (Clerk will create the actual auth)
-- This just creates the database record for testing
INSERT INTO users (id, clerk_user_id, email, created_at)
VALUES (
  gen_random_uuid(),
  'test_client_user_001',
  'testclient@example.com',
  NOW()
)
ON CONFLICT (clerk_user_id) DO NOTHING;
```

**Note**: For actual testing, create a real account via Clerk sign-up on your app. The database user is auto-created on first login.

---

## 4. QR Code for Your Website

### Option A: Free Online Generator
Go to https://www.qr-code-generator.com/ and enter your production URL.

### Option B: Generate via command line
```bash
# Install qrencode (macOS)
brew install qrencode

# Generate QR code PNG
qrencode -o website-qr.png -s 10 "https://your-production-url.com"

# Or generate SVG
qrencode -o website-qr.svg -t SVG "https://your-production-url.com"
```

### Option C: Add to your app (React component)
```jsx
// npm install qrcode.react
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG value="https://your-production-url.com" size={256} />
```

---

## 5. Mobile Responsiveness Checklist

Test these pages on mobile:
- [ ] Home page (`/`)
- [ ] Framework page (`/framework`)
- [ ] Profile page (`/profile`)
- [ ] Workspace page (`/workspace`)
- [ ] Elements page (`/elements`)

Use Chrome DevTools (F12 → Toggle device toolbar) to test:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)

---

## 6. Token Rate Limiting

See `backend/app/core/rate_limiter.py` for implementation.

Limits:
- **Anonymous**: 5 requests/minute
- **Authenticated**: 20 requests/minute  
- **LLM calls**: 10 calls/minute per user
- **Image generation**: 3 calls/hour per user

---

## Environment Variables Checklist

Make sure these are set in production:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (FULL service_role key)
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional
FRONTEND_URL=https://your-production-url.com
DEV_EMAIL=your@email.com
```
