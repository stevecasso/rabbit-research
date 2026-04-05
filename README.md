# Rabbit Research for Authors

A focused research tool for fiction writers. Set your novel context once, then run
targeted Research Sprints on specific topics. Each sprint produces a structured index
card covering key facts, authenticity red flags, sensory detail, and sources. Compile
everything into a single Research Report to keep beside you as you write.

Part of the AI for Authors Circle suite.

---

## What it does

1. **Set your novel context** — genre, period, setting, and an optional premise
2. **Run Research Sprints** — one focused topic at a time (e.g. "Victorian street medicine, 1870s")
3. **Get structured index cards** — key facts, research questions, authenticity red flags, sensory detail, sources
4. **Generate a Research Report** — compiles all your cards into a single formatted brief

Two research modes are available: Claude's built-in knowledge (fast, reliable for most topics)
or live web search (slower but useful for recent or obscure subjects).

---

## Project structure

```
rabbit-research/
├── api/
│   ├── sprint.js          ← Research sprint handler (direct + web search modes)
│   ├── report.js          ← Research report compiler
│   ├── auth/
│   │   ├── _utils.js      ← Shared auth utilities (token signing, allow-list check)
│   │   ├── request.js     ← Magic link email sender
│   │   └── verify.js      ← Magic link verifier, sets session token
│   └── webhooks/
│       └── wp.js          ← FluentCart webhook (grants/revokes access via Upstash)
├── public/
│   └── index.html         ← Full React frontend (loaded via CDN, no build step)
├── server.js              ← Local dev server (mirrors Vercel routing)
├── package.json
├── vercel.json
└── .env                   ← Local environment variables (never commit this)
```

---

## How access works

Access is managed via magic link email authentication — no passwords.

- Users enter their email address and receive a sign-in link
- The link is valid for 15 minutes and sets a 7-day session token
- The allow-list is stored in Upstash Redis and updated automatically when someone
  purchases via FluentCart on aiforauthorscircle.com
- Your own admin email (`ALLOWED_EMAILS`) always has access regardless of the Redis store

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Check your .env file

The `.env` file should already be present. Confirm it contains:

```
ANTHROPIC_API_KEY=your-key
AUTH_SECRET=your-secret
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@aiforauthorscircle.com
ALLOWED_EMAILS=your@email.com
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
WP_WEBHOOK_SECRET=mckenzie2026
```

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

In local dev without a real Resend key configured, the magic link prints to the
terminal instead of being emailed — copy and paste it into your browser to sign in.

---

## Deployment: Vercel

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial build: Rabbit Research for Authors"
git remote add origin https://github.com/stevecasso/rabbit-research.git
git push -u origin main
```

### 2. Create a Vercel project

Vercel dashboard → **Add New Project** → import from GitHub → select `rabbit-research`.

### 3. Add environment variables

In Vercel → your project → **Settings** → **Environment Variables**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `AUTH_SECRET` | Long random string (already set in .env) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | `noreply@aiforauthorscircle.com` |
| `ALLOWED_EMAILS` | Your admin email address |
| `UPSTASH_REDIS_REST_URL` | From your Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From your Upstash dashboard |
| `WP_WEBHOOK_SECRET` | Shared secret matching your WordPress snippet |

### 4. Deploy

Vercel deploys automatically on every push to `main`.

---

## Adding users

**Automatically** — FluentCart purchases on aiforauthorscircle.com trigger the
`/api/webhooks/wp` endpoint, which adds the customer's email to Upstash Redis.
The WordPress snippet in FluentSnippets handles this.

**Manually** — In your Upstash dashboard → Data Browser → Add Key:
- Key: `user:theirmail@example.com`
- Type: JSON
- Value: `{"tier":"standalone","grantedAt":"2026-01-01T00:00:00.000Z"}`

Use `"tier":"vip"` for VIP Circle members, `"tier":"standalone"` for
Prompt Architect standalone buyers.

---

## The research sprint API

`POST /api/sprint`

```json
{
  "topic": "Victorian street medicine and travelling apothecaries, 1870s",
  "novelCtx": "Genre: Historical Fiction | Period: Victorian 1880s | Setting: London",
  "useWebSearch": false
}
```

Returns:
```json
{
  "result": "{\"title\":\"...\",\"keyQuestions\":[...],\"essentialFacts\":\"...\",\"authenticityFlags\":[...],\"sensoryDetails\":\"...\",\"sources\":[...]}"
}
```

`POST /api/report`

```json
{
  "sprints": [...],
  "ctx": { "genre": "Historical Fiction", "period": "Victorian 1880s", "setting": "London", "premise": "" }
}
```

Returns a formatted markdown Research Report.

Both endpoints require a valid `Authorization: Bearer <session_token>` header.

---

## Notes

- **No build step required** — React is loaded via CDN. The frontend is a single
  `public/index.html` file using Babel Standalone for JSX.
- **API keys never reach the browser** — all Anthropic calls happen inside
  `api/sprint.js` and `api/report.js` on the server.
- **Upstash Redis is shared** with other apps in the suite — a user in the store
  has access to whichever apps check that store.
- **Web search mode** uses Anthropic's built-in web search tool and requires
  a compatible model (claude-sonnet-4-5 or newer).
