# DramaRama – Architecture

*Technical Design Document v3*

---

## Goals

This architecture is designed to achieve two objectives:

1. **Build DramaRama MVP** – A working product that validates the MUYOM-for-algorithms concept
2. **Learn Meta-relevant skills** – Use technologies and patterns that translate directly to Meta interviews and work

The architecture uses Supabase (PostgreSQL) for rapid development while maintaining clean code patterns that scale. AWS Lambda provides serverless compute with SSE streaming for real-time hint generation.

---

## High-Level Architecture

DramaRama consists of three main components:

1. **Browser Extension (Plugin)** – The chatbot that runs on LeetCode/HackerRank pages
2. **Backend API** – FastAPI service on AWS Lambda handling session logic, response analysis, and hint generation with SSE streaming
3. **Headquarters Dashboard** – Next.js web app for viewing progress, history, and analytics

### System Flow

**Browser Extension** → **Backend API (FastAPI on Lambda)** → **Supabase (PostgreSQL)**

**Backend API** → **Claude API** → **SSE Stream** → **Browser Extension**

**Headquarters Dashboard** → **Backend API** → **Supabase**

---

## Tech Stack

| Component | Technology | Why (Meta Relevance) |
|-----------|------------|---------------------|
| Browser Extension | Chrome Extension (Manifest V3) | Standard browser extension architecture |
| Extension UI | React + TypeScript | Meta uses React; TypeScript is industry standard |
| Backend API | FastAPI (Python) | AI/ML standard; great for LLM integration |
| Backend Hosting | AWS Lambda + API Gateway | Serverless; scales automatically; AWS experience |
| Backend Architecture | Hexagonal Architecture | Clean separation; testable; scales to microservices |
| Database | Supabase (PostgreSQL) | SQL skills transfer everywhere; fast setup; free tier |
| Real-time Streaming | Server-Sent Events (SSE) | Stream LLM responses; simpler than WebSocket for MVP |
| Dashboard Frontend | Next.js 14 + TypeScript | React-based; Meta uses React; SSR capabilities |
| Styling | Tailwind CSS | Rapid UI development; industry standard |
| Authentication | Clerk + JWT | Industry-standard auth pattern; secure by default |
| LLM Provider | Anthropic Claude API | For hint generation with streaming |
| Hosting (Dashboard) | Vercel | Free tier; optimized for Next.js |
| Infrastructure as Code | AWS SAM | Deploy Lambda + API Gateway together |

---

## What We're NOT Using (Yet)

| Technology | Why Not Needed |
|------------|----------------|
| WebSocket | SSE is sufficient for streaming hints. WebSocket for Phase 2 (dynamic coaching). |
| RAG + OpenSearch | 12 hardcoded prompts. No document retrieval needed. |
| LangChain / LangGraph | Simple LLM calls with streaming. No complex agent orchestration needed. |
| Multiple Lambda Services | Single API handles everything. Microservices are overkill for MVP. |

---

## Database Design (Supabase)

Supabase provides a hosted PostgreSQL database with a dashboard for easy management.

### Why Supabase

- **PostgreSQL:** Industry-standard SQL. Skills transfer to any company.
- **Free tier:** Generous limits for MVP development.
- **Dashboard:** Visual table editor, SQL editor, logs.
- **Fast setup:** Create tables in minutes, not hours.
- **Migration path:** Can export to AWS RDS if needed later (same PostgreSQL).

### Schema

#### Table: users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key, auto-generated |
| clerk_id | VARCHAR(255) | Clerk user ID for auth mapping |
| email | VARCHAR(255) | User email |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

#### Table: sessions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References users.id |
| algorithm_title | VARCHAR(255) | Name of the algorithm (e.g., "Two Sum") |
| algorithm_url | TEXT | LeetCode/HackerRank URL |
| started_at | TIMESTAMPTZ | Session start time |
| ended_at | TIMESTAMPTZ | Session end time (nullable) |
| status | VARCHAR(50) | in_progress, completed, abandoned |
| prompts_completed | INTEGER | Number of prompts answered (0-12) |
| created_at | TIMESTAMPTZ | Record creation time |

#### Table: responses

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| session_id | UUID (FK) | References sessions.id |
| prompt_index | INTEGER | Which prompt (0-11) |
| element | VARCHAR(50) | earth, fire, air, water |
| sub_element | VARCHAR(10) | 1.0, 2.0, 3.0 |
| response_text | TEXT | User's response |
| word_count | INTEGER | Number of words in response |
| time_spent_seconds | INTEGER | Time spent on this prompt |
| created_at | TIMESTAMPTZ | Record creation time |

#### Table: hints

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| session_id | UUID (FK) | References sessions.id |
| hint_text | TEXT | The generated hint from Claude |
| element_focus | VARCHAR(50) | Which element the hint targets |
| patterns_detected | JSONB | Analysis results (word counts, etc.) |
| user_final_response | TEXT | User's response after receiving hint |
| created_at | TIMESTAMPTZ | Record creation time |

### SQL Schema

Run this SQL in Supabase SQL Editor to create all tables:

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

-- Indexes for common queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_hints_session_id ON hints(session_id);
```

---

## AWS Lambda + API Gateway

The FastAPI application runs on AWS Lambda behind API Gateway.

### Why Lambda

- **Serverless:** No servers to manage, scales automatically
- **Cost:** Pay only for execution time (free tier: 1M requests/month)
- **AWS Experience:** Valuable skill for Meta and other companies
- **SSE Support:** Lambda Function URLs support response streaming

### SSE on Lambda

For the hint generation endpoint, we stream Claude's response tokens directly to the client using Lambda Function URLs with response streaming enabled.

**Important:** Use Lambda Function URL with response streaming, NOT API Gateway REST API (which buffers responses).

---

## Component Details

### 1. Browser Extension (Chrome)

The extension runs on LeetCode/HackerRank pages and provides the chatbot interface.

#### Structure

- **Content Script:** Injected into LeetCode pages. Scrapes algorithm text from DOM.
- **Popup/Side Panel:** React-based chatbot UI. Shows prompts, collects responses, displays streaming hints.
- **Background Script:** Manages session state. Communicates with backend API. Handles SSE connection.
- **Storage:** Chrome storage API for local session data and auth tokens.

### 2. Backend API (FastAPI on Lambda)

The backend uses **Hexagonal Architecture** for clean separation and testability.

#### Hexagonal Layers

- **Domain:** Pure business logic. Entities, Services. No external dependencies.
- **Ports:** Abstract interfaces. SessionRepository, ResponseRepository, LLMClient.
- **Adapters:** SupabaseSessionAdapter, SupabaseResponseAdapter, ClaudeStreamingAdapter.

#### Key Endpoints

- `POST /api/session/start` – Begin a new MUYOM session
- `POST /api/session/respond` – Submit response to current prompt
- `GET /api/session/analyze` – SSE endpoint: analyze responses, stream hint
- `POST /api/session/complete` – End session after user responds to hint
- `GET /api/user/sessions` – Get user's session history

### 3. Headquarters Dashboard (Next.js)

A web application where users view their progress and session history.

#### Pages

- `/` – Landing page
- `/dashboard` – Recent sessions, streaks, element breakdown chart
- `/sessions` – List of all past sessions
- `/sessions/[id]` – Session transcript and analysis
- `/reference` – The 5 Elements reference

---

## The Hint System (with SSE Streaming)

After completing 12 prompts, the system analyzes responses and streams a personalized hint.

### Flow

1. User completes prompt 12 and clicks "Get My Hint"
2. Extension opens SSE connection to /api/session/analyze
3. Backend fetches all 12 responses from Supabase
4. Backend analyzes patterns (word counts, questions asked, repeated concepts)
5. Backend builds prompt for Claude including patterns and user responses
6. Backend calls Claude API with streaming enabled
7. Backend yields tokens via SSE as they arrive
8. User sees hint typing out in real-time

### Pattern Analysis

Before calling Claude, we analyze responses for patterns:

| Pattern | What It Means |
|---------|---------------|
| Shortest responses on Earth | User rushed through fundamentals |
| Few concrete examples ([1,2,3]) | User thinking abstractly, not grounded |
| Few question marks | User not in questioning mode |
| Same word repeated 5+ times | User stuck in a loop |
| Short Water responses | User not seeing flow of ideas |

---

## Security

### Authentication Flow

1. User signs in via Clerk (in extension or dashboard)
2. Clerk issues JWT token
3. Extension/Dashboard includes JWT in Authorization header
4. Lambda validates JWT using Clerk's JWKS endpoint

### Supabase Security

- Use Supabase service role key in Lambda (not exposed to client)
- All queries filter by user_id from JWT (users only access their own data)
- Row Level Security (RLS) enabled as backup protection

---

## Infrastructure as Code (AWS SAM)

AWS resources defined in template.yaml and deployed via SAM CLI.

### Resources Defined

- **DramaRamaFunction:** Lambda function running FastAPI
- **DramaRamaFunctionUrl:** Lambda Function URL with streaming enabled
- **DramaRamaFunctionRole:** IAM role with minimal permissions

### Deployment Commands

- `sam build` – Build the Lambda package
- `sam local start-api` – Test locally
- `sam deploy --guided` – Deploy to AWS

---

## Implementation Roadmap

### Week 1-2: Foundation

- Set up Supabase project and create tables
- Set up AWS account and SAM CLI
- Deploy FastAPI to Lambda with hexagonal structure
- Implement session endpoints (start, respond)

### Week 3-4: Browser Extension

- Create Chrome extension with Manifest V3
- Build content script for LeetCode scraping
- Build React chatbot UI
- Connect to Lambda API

### Week 5-6: Hint System + SSE

- Implement response analysis logic
- Integrate Claude API with streaming
- Set up Lambda Function URL with streaming
- Connect SSE to extension UI

### Week 7-8: Dashboard + Auth + Polish

- Build Next.js dashboard
- Integrate Clerk authentication
- User testing and bug fixes
- Launch MVP

---

## Future Enhancements (Phase 2)

- **Dynamic Coaching Mode:** WebSocket for real-time back-and-forth with the thinking coach
- **Algorithm Categories:** Different hint strategies for arrays vs graphs vs DP
- **Community Features:** See other users' thinking patterns, leaderboards
- **Mobile App:** Review sessions and progress on mobile

---

## Summary

This architecture provides:

- **AWS experience:** Lambda, API Gateway, SAM
- **SQL skills:** Supabase (PostgreSQL) – transfers everywhere
- **Modern frontend:** React, TypeScript, Next.js
- **Real-time UX:** SSE streaming for hint generation
- **Clean code:** Hexagonal architecture, testable, maintainable
- **Fast development:** Supabase dashboard for easy data management
- **Migration path:** Can move to AWS RDS later (same PostgreSQL)

**Build it. Ship it. Learn from users. Then scale.**