# DramaRama Pivot: MUYOM Puzzles with Invisible Scaffolding

## Files to Copy

### 1. `frontend/lib/puzzles.js` → NEW FILE
All 6 Burger puzzles hardcoded. Each has: id, number, title, full text, category, and a visual description (for future DALL-E image generation).

### 2. `frontend/app/workspace/page.jsx` → REPLACE EXISTING
Complete rewrite. Changes:
- **SetupPhase**: No more "What are you thinking about?" textarea. Now shows a 3-column grid of puzzle cards. User clicks one to start.
- **WorkingPhase**: Left panel now toggles between "The Puzzle" (showing the full puzzle text) and "Your Understanding" (the live document). Right panel is the same chat interface but cleaner — no element emojis on messages, rounded bubbles.
- **Session start**: Sends `problem_description: "PUZZLE: {title}\n\n{text}"` to backend. No backend changes needed — the existing `/session/start` endpoint works as-is.

### 3. `frontend/components/LiveDocument.jsx` → REPLACE EXISTING
Fixes raw markdown rendering. Now strips `#`, `**`, `*`, backticks, and horizontal rules. Splits into paragraphs. Animates new content fading in.

### 4. `frontend/app/page.jsx` → REPLACE EXISTING
Redesigned landing page. Clean, minimal, black/white. Shows:
- Hero: "Think through it." + one-liner description + Start button
- How It Works: 3 steps (Pick → Think → Build understanding)
- Puzzle preview grid: all 6 puzzles shown as cards
- CTA: "Ready to think?" black section

## Tailwind Config Addition
Add this to your `tailwind.config.js` under `theme.extend.animation`:
```js
animation: {
  'fade-in': 'fadeIn 0.5s ease-out forwards',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
},
```

## What You Do NOT Need to Change
- Backend: No changes. The existing `/session/start` accepts `problem_description` which now receives the puzzle text. The invisible element selection + chatbot prompt works exactly the same.
- Database: No changes. Sessions still store `problem_description`.
- Auth: No changes.
- The chatbot prompt: Already does invisible scaffolding. Already selects elements silently. Already coaches without naming elements. This is exactly what you described doing in person.

## Pages to Delete
- `frontend/app/coming-soon/page.jsx` — Remove entirely. Give people a QR code to `/login` or `/workspace` directly.

## What's NOT in These Files (Future)
- DALL-E puzzle image generation: The `visual` field in puzzles.js has prompts ready. When you want images, add a call on session start.
- Grayscale element icons on login page: Style change only, not included here.
- QR code generation: Use any QR generator pointing to your domain + `/workspace`.
