# DramaRama - Mental Gym for Algorithms

DramaRama helps you apply the **5 Elements of Effective Thinking** to algorithm problems, transforming how you solve them.

## 🏗️ Architecture

```
DramaRama/
├── frontend/          # Next.js dashboard (Headquarters)
├── backend/           # FastAPI API server
└── extension/         # Chrome extension
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase account (free tier works)
- A Clerk account (free tier works)
- An Anthropic API key (for Claude)

### 1. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run this schema:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  algorithm_title VARCHAR(255) NOT NULL,
  algorithm_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'in_progress',
  prompts_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  prompt_index INTEGER NOT NULL,
  element VARCHAR(50) NOT NULL,
  sub_element VARCHAR(10) NOT NULL,
  response_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hints table
CREATE TABLE hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  hint_text TEXT NOT NULL,
  element_focus VARCHAR(50),
  patterns_detected JSONB,
  user_final_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_hints_session_id ON hints(session_id);
```

3. Get your Supabase URL and Service Key from Project Settings > API

### 2. Set Up Clerk Authentication

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your keys from Dashboard > API Keys:
   - Publishable Key (for frontend)
   - Secret Key (for frontend)
   - JWKS URL: `https://YOUR_CLERK_DOMAIN/.well-known/jwks.json`

### 3. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp env.example .env
# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - CLERK_JWKS_URL
# - ANTHROPIC_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 4. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp env.example .env.local
# Edit .env.local with your Clerk keys:
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY

# Run the dev server
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### 5. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. The DramaRama icon should appear in your extensions

### 6. Connect Extension to Your Account

#### Recommended (no copy/paste)

1. Start the HQ: `cd frontend && npm run dev`
2. Sign in at `http://localhost:3000/login`
3. In the HQ, click **Start New Session** (or open `http://localhost:3000/go/leetcode`)
4. You’ll be redirected to LeetCode with a `#dramarama_token=...` fragment
5. The extension auto-ingests it and you’re connected

#### Optional: JWT template (prevents mid-session expiry)

Create a Clerk **JWT template** named `dramarama-extension` (or any name you choose) and configure a longer lifetime.
Then set in `frontend/.env.local`:

- `NEXT_PUBLIC_CLERK_EXTENSION_JWT_TEMPLATE=dramarama-extension`

Restart the frontend dev server.

#### Notes

- If you see “Token expired” while answering prompts, the extension will automatically open a background tab to refresh your token (HQ must be running on `http://localhost:3000`), then you can click **Submit Response** again.
- After updating the extension code/manifest, go to `chrome://extensions/` and click **Reload** on the DramaRama extension.

## 🎯 Using DramaRama

### On LeetCode/HackerRank:

1. Navigate to any problem page
2. Click the 🎭 DramaRama button (bottom right)
3. Click "Start Session"
4. Answer all 12 prompts (one for each sub-element)
5. Receive your personalized "nudge" from the AI
6. View your progress in the Dashboard

### The 5 Elements:

| Element | Emoji | Focus |
|---------|-------|-------|
| Earth | 🌳 | Deep Understanding - master the basics |
| Fire | 🔥 | Embrace Failure - fail fast, learn faster |
| Air | 💨 | Create Questions - be your own Socrates |
| Water | 🌊 | Flow of Ideas - see connections |
| Change | 🪨 | The result of applying all elements |

## 📁 Project Structure

### Backend (`backend/`)

```
app/
├── main.py              # FastAPI app entry point
├── core/
│   ├── config.py        # Settings and configuration
│   └── security.py      # JWT validation with Clerk
├── domain/
│   ├── entities.py      # Business entities (Session, Response, etc.)
│   └── services.py      # Business logic (analysis, hint generation)
├── ports/
│   ├── repositories.py  # Abstract repository interfaces
│   └── llm.py          # Abstract LLM interface
├── adapters/
│   ├── supabase_adapter.py  # Supabase implementation
│   └── claude_adapter.py    # Claude LLM implementation
└── api/
    ├── routes.py        # HTTP endpoints
    └── schemas.py       # Request/Response models
```

### Frontend (`frontend/`)

Standard Next.js 14 app with:
- Clerk authentication
- Dashboard with session history
- Elements reference page
- Session detail views

### Extension (`extension/`)

Chrome Manifest V3 extension with:
- Content script for LeetCode/HackerRank
- Background service worker for API communication
- Popup for quick status and navigation

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session/start` | Start a new session |
| POST | `/api/session/respond` | Submit a response |
| GET | `/api/session/{id}/analyze` | Get AI hint (SSE) |
| POST | `/api/session/complete` | Complete session |
| GET | `/api/user/sessions` | List user sessions |
| GET | `/api/user/sessions/{id}` | Get session detail |
| GET | `/api/user/stats` | Get dashboard stats |
| GET | `/api/prompts` | Get all 12 prompts |

## 🧪 Development Tips

### Testing the Backend

```bash
# Health check
curl http://localhost:8000/health

# Get prompts (no auth required)
curl http://localhost:8000/api/prompts
```

### Testing with Mock Auth

In development mode without Clerk configured, the backend accepts any Bearer token and uses a mock user.

### Hot Reload

- Frontend: Automatic with Next.js
- Backend: Use `--reload` flag with uvicorn
- Extension: Click "Reload" in chrome://extensions after changes

## 📝 License

MIT

