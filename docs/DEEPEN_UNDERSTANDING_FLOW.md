# Deepen Understanding — Full Technical Flow

This document describes exactly how the "Deepen Understanding" feature works, from the moment the user types their thoughts to the moment the understanding document is updated and displayed.

---

## 1. User Interaction (Frontend)

**Component:** `frontend/components/ThinkingPanel.jsx`

The user sees a white panel at the bottom of the screen with:
- A **textarea** where they type their thoughts about the puzzle
- A **"Deepen Understanding"** button that submits their text
- A **"View Understanding"** button that opens the current understanding document

When the user clicks "Deepen Understanding":
1. `ThinkingPanel.handleSubmit()` trims the draft text
2. Calls `onSubmit(trimmedText)` — which is `sendThought` in `CinematicExperience.jsx`
3. Clears the textarea

---

## 2. Frontend API Call

**Component:** `frontend/components/CinematicExperience.jsx` → `sendThought(text)`

```javascript
async function sendThought(text) {
  setSending(true);
  const token = await getToken();
  const res = await fetch(`/api/backend-api/session/${sessionId}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_message: text }),
  });
  const data = await res.json();
  // data = { element, response, understanding }
}
```

**What gets sent:**
- `user_message`: The exact text the user typed in the textarea

**What comes back:**
- `element`: One of `"earth"`, `"fire"`, `"air"`, `"water"`, `"change"` — determines the background tint
- `response`: A short coaching question/nudge from the AI (10-25 words) — **currently not displayed** (coach whisper was removed)
- `understanding`: The updated understanding document text, OR `"__no_insights__"` if the user's input was too vague

**Frontend handling of the response:**
- If `understanding === "__no_insights__"` → shows a "no insights" popup for 4 seconds
- If `understanding` has content → updates `documentText` state and increments `understandingVersion` (triggers flicker on "View Understanding" button)
- Increments `deepenCount` (used to gate hint requests: 1 hint allowed per deepen)

---

## 3. Frontend Proxy

**File:** `frontend/app/api/backend-api/[...path]/route.js`

The Next.js app proxies `/api/backend-api/*` to the Python backend at `BACKEND_URL` (default: `http://localhost:8000`). It forwards:
- The HTTP method, headers, and body
- The Authorization header (Bearer token from Clerk)

The upstream URL becomes: `http://localhost:8000/api/session/{session_id}/chat`

---

## 4. Backend Route

**File:** `backend/app/api/routes.py` → `POST /session/{session_id}/chat`

### Step-by-step:

1. **Authentication:** Validates the JWT token via Clerk JWKS, looks up (or creates) the user in the database.

2. **Rate limiting:** Checks `rate_limit_user(user.id, "llm_calls")`.

3. **Load session:** Fetches the session from Supabase by `session_id`. Verifies the user owns it.

4. **Save user message:** Creates an `ElementMessage` record in the `element_messages` table:
   ```python
   ElementMessage(
       session_id=session_id,
       prompt_index=0,
       role="user",
       message_text=user_message,
   )
   ```

5. **Fetch conversation history:** Gets ALL `ElementMessage` records for this session (including the one just saved). Formats them as:
   ```python
   [{"role": "user", "message_text": "..."}, {"role": "assistant", "message_text": "..."}, ...]
   ```

6. **Build the prompt:** Calls `build_batched_chat_prompt()` with:
   - `problem_description`: The full puzzle text (stored on the session)
   - `conversation_history`: All messages so far
   - `user_message`: The user's latest input
   - `existing_document`: The current understanding document (from `session.understanding_document`)

7. **Call the LLM:** `llm_client.generate_text(prompt, max_tokens=1800)` — sends the prompt to Claude/the configured LLM.

8. **Parse JSON response:** Extracts `element`, `response`, and `understanding` from the LLM's JSON output.

9. **Save assistant response:** Creates another `ElementMessage` record with `role="assistant"` and the coaching response.

10. **Update understanding document:** If `understanding` is not `"__no_insights__"`, updates `session.understanding_document` in the database.

11. **Return:** `{ element, response, understanding }`

---

## 5. The Exact Prompt

**File:** `backend/app/domain/services.py` → `build_batched_chat_prompt()`

This is the **exact prompt** sent to the LLM. Variables are filled in at runtime:

```
You are helping someone think through a puzzle. Read the conversation and do three things at once.

PUZZLE: {problem_description}

CONVERSATION SO FAR:
{history_text}

USER'S LATEST MESSAGE: {user_message}

EXISTING UNDERSTANDING DOCUMENT:
{existing_document or "(none yet)"}

Return ONLY a JSON object with these three fields:
{
  "element": "one of: earth, fire, air, water, change",
  "response": "your coaching question or nudge",
  "understanding": "updated understanding document"
}

ELEMENT — pick the one that best serves the user right now:
- earth: missing fundamentals, needs to simplify or ground the problem
- fire: stuck or overthinking, needs to try something and fail forward
- air: needs to question assumptions, may be solving the wrong problem
- water: needs to see connections, map approaches, follow an idea further
- change: significant thinking shift has occurred, time to reflect on how understanding evolved

RESPONSE rules:
- ONE question or short observation. 10-25 words. Casual, direct, like a curious friend.
- No encouragement or validation. No "great thinking!" Just ask the next question.
- Never mention elements, frameworks, or methodology.
- If they're shallow or vague, push harder: "why?" or "how do you know that?"
- Never reveal the puzzle answer.

UNDERSTANDING rules:
- This document is the user's scratch paper. Write it exactly as if someone were jotting notes to themselves while working through a puzzle on a napkin.
- Use SHORT, direct statements. Like: "At least one is lying." or "If black-hair tells truth → he's math major → red-hair must be lying about being philosophy major."
- NO person references at all. Not "you", not "I", not "the user", not "they." Just the observations.
- REFINE, don't just append. If the user's latest thinking contradicts or supersedes something in the existing document, REMOVE or REPLACE the old note. The document always reflects CURRENT understanding, not a history.
- If the user was wrong earlier but has now corrected themselves, remove the wrong note entirely.
- Only include things the user has actually reasoned through or noticed. Never add observations they haven't made.
- NEVER evaluate, assess, or judge. No "hasn't considered X yet" or "needs to think about Y" or "this is correct."
- NEVER give advice or direction. This is a mirror, not a coach.
- If the user's input is vague, off-topic, or contains no concrete reasoning, return exactly: __no_insights__
- No markdown headers. No bold. No bullets. Just plain short sentences or fragments, separated by newlines.
- Keep it concise. Don't pad.

Output ONLY the JSON. No markdown fences. No extra text.
```

### Variable values at runtime:

| Variable | Source | Example |
|---|---|---|
| `problem_description` | `session.problem_description` | `"PUZZLE: A Top 10 List\n\nFor each of the following ten statements..."` |
| `history_text` | All `ElementMessage` records for the session, formatted as `"User: ...\nCoach: ...\n"` | `"User: I think all statements are false\nCoach: What happens if exactly one statement is true?\n"` |
| `user_message` | The text the user just typed | `"I think all statements are false"` |
| `existing_document` | `session.understanding_document` (or `"(none yet)"` if empty) | `"All ten statements cannot be true simultaneously. Each statement contradicts every other."` |

---

## 6. The Understanding Document — Mental Model

### What it is:
The user's **scratch paper**. If they were sitting at a table with the puzzle on a card, this is what they'd scribble on a napkin next to it.

### Key behaviors:
- **Refines, not grows.** When new thinking contradicts an earlier note, the old note is removed or replaced. The document is always a clean snapshot of current understanding.
- **No evaluation.** Never "hasn't considered X" or "needs to think about Y." Just raw reasoning.
- **No person references.** No "you", "I", "the user", "they." Just observations.
- **Concise.** 3 sentences is fine if that's all there is. No padding.

### Example — good output:
```
At least one student is lying.
If black-hair tells truth → he's the math major.
Then red-hair saying "I'm philosophy" would also be true → nobody lying → contradicts premise.
So black-hair must be lying.
Math major has red hair.
```

### Example — bad output (what we fixed):
```
Claims all ten statements are false. Has not worked through what this means
for the individual statements, particularly the logical contradiction it creates.
```
↑ This is evaluative third-person assessment. The prompt now explicitly forbids this pattern.

---

## 7. Hint Request Flow

When the user clicks "New Hint", the frontend sends the **same** `/session/{session_id}/chat` endpoint but with a fixed message:

```javascript
body: JSON.stringify({ user_message: "(Please give me a hint)" })
```

This goes through the exact same pipeline — the LLM sees "(Please give me a hint)" as the user message and responds accordingly. The hint response is displayed in a modal.

### Hint gating:
- `deepenCount` tracks how many times the user has clicked "Deepen Understanding"
- `hintCount` tracks how many hints have been requested
- A new hint is only allowed when `deepenCount > hintCount` (1 hint per deepen)
- If the user hasn't deepened yet, clicking "New Hint" shows: "Write your thoughts and deepen your understanding first."

---

## 8. Data Model

### `sessions` table:
- `id` (UUID, PK)
- `user_id` (text, FK → users)
- `problem_description` (text) — the full puzzle text
- `understanding_document` (text) — the cumulative understanding doc, updated after each deepen
- `status` (text) — `"in_progress"` | `"completed"` | `"abandoned"`
- `puzzle_id` (UUID, FK → puzzles, nullable) — currently unused for frontend puzzles

### `element_messages` table:
- `id` (UUID, PK)
- `session_id` (UUID, FK → sessions)
- `prompt_index` (int) — always 0 for the batched chat flow
- `role` (text) — `"user"` or `"assistant"`
- `message_text` (text) — the message content
- `element_applied` (text, nullable) — the element chosen by the LLM (only on assistant messages)
- `created_at` (timestamp)

---

## 9. Sequence Diagram

```
User types thoughts → clicks "Deepen Understanding"
    │
    ▼
ThinkingPanel.handleSubmit()
    │ calls onSubmit(text)
    ▼
CinematicExperience.sendThought(text)
    │ POST /api/backend-api/session/{id}/chat
    │ body: { user_message: text }
    ▼
Next.js Proxy → http://localhost:8000/api/session/{id}/chat
    │
    ▼
Backend routes.py: batched_chat()
    │
    ├─ Save user message to element_messages
    ├─ Fetch all conversation history
    ├─ Build prompt with: puzzle + history + user_message + existing_document
    ├─ Call LLM (Claude) → get JSON { element, response, understanding }
    ├─ Save assistant message to element_messages
    ├─ Update session.understanding_document (if not __no_insights__)
    │
    ▼
Return { element, response, understanding }
    │
    ▼
CinematicExperience receives response
    ├─ Sets element (background tint changes)
    ├─ If __no_insights__ → show "no insights" popup
    ├─ If has understanding → update documentText + flicker "View Understanding"
    └─ Increment deepenCount (unlocks 1 hint request)
```
