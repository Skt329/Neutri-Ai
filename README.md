# NeutriAI 🥗

An AI-powered nutrition coaching platform built with Next.js, Supabase, and NVIDIA NIM. NeutriAI acts as a personal dietitian — tracking meals, managing pantry, setting macro targets, and remembering your preferences over time through long-term memory.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix Primitives |
| AI | Vercel AI SDK 6, NVIDIA NIM (`kimi-k2-instruct`) |
| Embeddings | NVIDIA NeMo Retriever (`nvidia/nv-embedqa-e5-v5`, 1024-dim) |
| Database | Supabase (PostgreSQL + pgvector + pg_cron) |
| Auth | Supabase Auth (email/password) |
| Analytics | PostHog (optional) |

## Architecture

```
app/
├── (app)/              # Authenticated routes (dashboard, chat, etc.)
├── api/
│   ├── chat/           # AI chat endpoint (Vercel AI SDK streaming)
│   ├── cron/           # Deferred memory extraction (scheduled)
│   └── streak/         # Logging streak calculator
├── auth/               # Login/signup + callback
└── onboarding/         # Profile setup flow

lib/
├── ai/
│   ├── nim-provider.ts # NVIDIA NIM client (LLM + embeddings)
│   ├── memory.ts       # Memory retrieval (vector similarity search)
│   ├── system-prompt.ts# Dynamic system prompt builder
│   └── tools.ts        # 15+ AI tools (log meal, pantry, recipes, etc.)
├── supabase/           # Supabase client helpers (client/server/admin)
├── swiggy/             # Swiggy order import adapter
└── types.ts            # TypeScript interfaces for all DB tables

components/             # React UI components (shadcn + custom)
scripts/                # SQL migrations
```

### Key Design Decisions

- **Agentic AI**: The chat model has 15+ tools it can call autonomously — logging meals, querying the pantry, calculating macros, generating recipes, etc.
- **Deferred Memory**: Facts are extracted from conversations **3 hours after inactivity** via a cron job, not during chat. This keeps chat fast and saves API costs.
- **Asymmetric Embeddings**: NeMo Retriever uses `input_type: "passage"` for storage and `input_type: "query"` for retrieval, improving search quality.
- **Batch Embedding**: The cron job embeds all extracted facts in a single API call via `nimEmbedBatch()`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [NVIDIA NIM](https://build.nvidia.com) API key (free tier available)

### 1. Clone & Install

```bash
git clone https://github.com/Skt329/Neutri-Ai.git
cd Neutri-Ai
npm install
```

### 2. Environment Variables

Copy `.env.local.example` (or create `.env.local`) with:

```env
# Supabase (get from: Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NVIDIA NIM (get from: build.nvidia.com → API Keys)
NIM_API_KEY=nvapi-your-key

# Cron security (generate a strong random string for production)
CRON_SECRET=your-cron-secret

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Database Setup

Run these SQL scripts in your **Supabase SQL Editor** (Dashboard → SQL Editor), in order:

| Step | File | Description |
|------|------|-------------|
| 1 | [`scripts/001_schema.sql`](scripts/001_schema.sql) | All tables, indexes, RLS policies |
| 2 | [`scripts/002_functions.sql`](scripts/002_functions.sql) | Triggers, vector search, extraction helpers |
| 3 | [`scripts/003_cron.sql`](scripts/003_cron.sql) | pg_cron setup (production only) |

**Required Supabase extensions** (enable in Dashboard → Database → Extensions):

| Extension | Purpose |
|-----------|---------|
| `pgvector` | Vector similarity search for AI memories |
| `pg_cron` | Schedule deferred memory extraction (production) |
| `pg_net` | HTTP calls from pg_cron (production) |

> **Note**: `pgcrypto` is auto-enabled by the schema migration.

### 4. Supabase Auth Setup

1. Go to Dashboard → Authentication → Providers
2. Enable **Email/Password**
3. Set **Site URL**: `http://localhost:3000`
4. Add **Redirect URL**: `http://localhost:3000/auth/callback`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Memory System

NeutriAI has a long-term memory system that remembers your preferences, allergies, dietary habits, and goals across conversations.

### How It Works

```
Chat Flow (fast — no extraction overhead):
┌──────────┐    ┌──────────────────┐    ┌──────────────┐
│ User msg │───→│ retrieveMemories │───→│ AI + tools   │
│          │    │ (1 embed call)   │    │ (streaming)  │
└──────────┘    └──────────────────┘    └──────────────┘

Extraction Flow (runs 3h after last activity):
┌──────────┐    ┌────────────────────┐    ┌───────────────┐
│ pg_cron  │───→│ /api/cron/extract  │───→│ LLM extracts  │
│ (30 min) │    │   -memories        │    │ facts → embed │
└──────────┘    └────────────────────┘    │ → store in DB │
                                          └───────────────┘
```

- **During chat**: Only retrieval happens (1 embedding call to find relevant past memories)
- **After 3h inactivity**: Cron job processes full conversation → extracts durable facts → batch-embeds → stores

### Manual Extraction (Development)

```bash
curl -X POST http://localhost:3000/api/cron/extract-memories \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Production Deployment

### Vercel

1. Push to GitHub and connect to [Vercel](https://vercel.com)
2. Add all environment variables from `.env.local` to Vercel → Settings → Environment Variables
3. **Important**: Set `CRON_SECRET` to a strong random value

### pg_cron (Memory Extraction)

After deploying, uncomment and configure `scripts/003_cron.sql` in Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'extract-memories',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      'https://your-app.vercel.app/api/cron/extract-memories',
      '{}',
      'application/json',
      ARRAY[
        net.http_header('Authorization', 'Bearer your-cron-secret')
      ]
    );
  $$
);
```

### Alternative: Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/extract-memories",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (age, weight, goals, allergies, cuisines, etc.) |
| `nutrition_targets` | Daily calorie/macro targets |
| `meal_logs` | Logged meals with macros breakdown |
| `pantry_items` | Kitchen inventory with nutrition data |
| `conversations` | Chat conversations + extraction tracking |
| `messages` | Chat messages (AI SDK UIMessage format) |
| `memories` | Long-term AI memory (pgvector embeddings) |
| `weight_logs` | Weight tracking history |

---

## AI Tools

The AI has access to these tools during chat:

| Tool | Action |
|------|--------|
| `log_meal` | Record a meal with auto-estimated macros |
| `read_profile` | Access user's full profile |
| `update_profile` | Update dietary preferences, allergies, etc. |
| `set_nutrition_targets` | Set daily calorie/macro goals |
| `get_todays_intake` | Check what's been eaten today |
| `get_weekly_report` | 7-day nutrition summary |
| `search_pantry` | Find items in the pantry |
| `add_pantry_items` | Add items to pantry |
| `remove_pantry_items` | Remove items from pantry |
| `suggest_recipes_from_pantry` | Generate recipes from available items |
| `analyze_nutrition` | Look up nutritional data for any food |
| `log_weight` | Record a weight measurement |
| `get_deficit_alerts` | Check for nutritional gaps today |
| `ask_user` | Ask the user for clarification |

---

## Project Structure

```
Neutri-Ai/
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components (shadcn/ui + custom)
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic
│   ├── ai/                 # AI provider, memory, tools, system prompt
│   ├── auth/               # Auth helpers
│   ├── supabase/           # Supabase client factories
│   └── swiggy/             # Swiggy import adapter
├── scripts/                # SQL migrations (run in Supabase SQL Editor)
│   ├── 001_schema.sql      # Tables, indexes, RLS
│   ├── 002_functions.sql   # Triggers, vector search, extraction helpers
│   └── 003_cron.sql        # pg_cron schedule (production)
├── public/                 # Static assets
└── styles/                 # Global styles
```

## License

Private — All rights reserved.
