# NeutriAI 🥗

> **Live Demo:** [skt329-neutri-ai.vercel.app](https://skt329-neutri-ai.vercel.app)

NeutriAI is an advanced, agentic AI-powered nutrition coaching Progressive Web App (PWA) built with Next.js, Supabase, and Redis. It acts as a personal dietitian — tracking meals, managing pantry inventory, monitoring weight, calculating TDEE-based macro targets, and remembering dietary preferences, allergies, and habits over time through a long-term vector memory system. It also integrates with Swiggy Food and Instamart via Model Context Protocol (MCP) servers to filter and order food based on remaining macro targets.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2 (App Router with Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS 4.2, Radix UI Primitives, Lucide icons, `vaul` |
| **AI - Chat & Logic** | Vercel AI SDK 6, Azure OpenAI (`gpt-4.1-mini`) |
| **AI - Embeddings** | NVIDIA NIM (`nvidia/llama-3.2-nemoretriever-300m-embed-v1`, 1024-dim) |
| **Database** | Supabase (PostgreSQL + pgvector + pg_cron + pg_net) & Prisma 7.8 |
| **Caching & Rate Limits** | Upstash Redis & `@upstash/ratelimit` |
| **Auth** | Supabase Auth (Email/Password, OAuth 2.1 + PKCE for Swiggy) |
| **PWA Engine** | Serwist 9.5 (`@serwist/next`) |
| **Monitoring** | Sentry 10.53.1 & Vercel Analytics |
| **Integrations** | Swiggy MCP Server (`@ai-sdk/mcp`), `html5-qrcode` Barcode Scanner |

---

## Core Features

### 1. Agentic AI Chat & Client Tools
NeutriAI features a conversational interface powered by Azure OpenAI with 15+ specialized tools. Instead of plain text, the assistant renders **interactive UI cards** on the client (e.g., for meal logging, recipe suggestions, profile updates, and Swiggy order confirmation). The user reviews and clicks to confirm or edit, sending outputs back to the model via the Vercel AI SDK.

### 2. Deferred Long-Term Vector Memory
To keep chat fast, cheap, and responsive, long-term memory extraction is **deferred**.
* **During Chat**: The AI performs a single vector search using NVIDIA NIM query embeddings to inject relevant past memories into the system prompt.
* **Extraction (Deferred)**: A scheduled background cron job runs **3 hours after user inactivity** on `/api/cron/extract-memories`.
* **Semantic Deduplication**: Extracted facts are batch-embedded (`nimEmbedBatch()`) as passages and compared against existing memories via pgvector cosine similarity. Paraphrases (similarity > 0.92) are discarded.
* **Security**: The cron route requires `CRON_SECRET` authentication and uses request timestamp verification to prevent replay attacks.

### 3. Swiggy MCP Integration
Users can link their Swiggy account directly to order food from the chat.
* **OAuth 2.1 & PKCE**: Secure authentication with code verifiers, challenges, and PKCE-generated state params. Tokens are stored encrypted in the database using **AES-256-GCM**.
* **Dynamic MCP Client Discovery**: Establishes a JSON-RPC over Streamable HTTP connection to Swiggy Food and Instamart MCP servers using `@ai-sdk/mcp`.
* **Redis Caching**: Discovered tool definitions are cached in Redis for 5 minutes per user token to eliminate high-latency discovery network calls on every message.
* **Smart Menu Filtering**: The AI filters menu items in real-time, matching them against remaining daily calorie/macro targets and allergies.

### 4. Progressive Web App (PWA)
Built with Serwist 9 for a seamless mobile experience:
* **Custom Service Worker Caching (`app/sw.ts`)**:
  * `CacheFirst` for static assets (images, icons) and Google Fonts webfont files.
  * `StaleWhileRevalidate` for Next.js data files (`.json`) and Google Fonts stylesheets.
  * `NetworkFirst` (10s timeout) for pages, falling back to the offline fallback page (`/~offline`).
  * `NetworkOnly` for API endpoints (`/api/*`).
* **Hardware & UX**: Responsive design, custom `PwaInstallPrompt`, and automatic service worker registration.

### 5. Barcode Pantry Scanner
Users can scan grocery barcodes using the device's camera (powered by `html5-qrcode`).
* Performs database and OpenFoodFacts/USDA API lookups.
* Displays nutritional details and lets the user add items to their pantry in one tap.

### 6. Shared Conversations
Users can generate secure, read-only links for their chats using token-based access.
* Accessible at `/shared/[token]`.
* Fully optimized for SEO with dynamic meta tags, crawler exclusions, and responsive Markdown rendering.

---

## Project Architecture & Directory Structure

```
Neutri-Ai/
├── app/                        # Next.js App Router Pages & Layouts
│   ├── (app)/                  # Authenticated routes
│   │   ├── barcode/            # Barcode scanner page
│   │   ├── chat/               # Main AI chat interface
│   │   ├── dashboard/          # User progress dashboard
│   │   ├── meals/              # Food diary page
│   │   ├── pantry/             # Kitchen inventory tracker
│   │   ├── profile/            # User body metrics & preferences
│   │   └── swiggy/             # Swiggy account status & control panel
│   ├── api/                    # API route handlers
│   │   ├── barcode/            # Barcode lookup & adding endpoints
│   │   ├── chat/               # Streaming LLM endpoint with tools
│   │   ├── cron/               # Scheduled memory extraction job
│   │   ├── nutrition/          # Nutrition analysis helper
│   │   └── streak/             # Activity streak endpoint
│   ├── auth/                   # Supabase authentication flows & callbacks
│   ├── onboarding/             # New user profile setup questionnaire
│   ├── shared/                 # Token-based shared read-only chats
│   └── sw.ts                   # Serwist service worker configuration
├── components/                 # Shared React components (shadcn/ui & custom)
│   ├── barcode/                # Barcode camera scanner & result card UI
│   ├── chat/                   # Message rendering & interactive tool cards
│   ├── today/                  # Calorie progress rings & meal timeline cards
│   └── ui/                     # Primitives (dialog, select, dropdown, etc.)
├── hooks/                      # Custom hooks (theme, device sensors)
├── lib/                        # Business logic, helpers, and config
│   ├── ai/                     # AI providers, memory matching, & tools
│   ├── auth/                   # User authentication wrappers
│   ├── swiggy/                 # Swiggy token manager, adapters, & MCP client
│   ├── supabase/               # Database client configurations & RPC queries
│   └── validation/             # Zod validation schemas for APIs
├── prisma/                     # Database ORM schema & migration tracker
├── public/                     # Icons, static assets, and manifest files
└── scripts/                    # Pure SQL migration files for Supabase
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User bio metrics (age, height, weight, activity, goal) and dietary preferences / allergies. |
| `nutrition_targets` | Daily calorie, protein, carbohydrate, fat, and fiber targets. |
| `meal_logs` | Logged meals, macro breakdowns, quantities, and timestamps. |
| `pantry_items` | Kitchen inventory items (quantity, expiry dates, categories). |
| `conversations` | Chat sessions. Tracks when memory extraction was last completed. |
| `messages` | Chat messages matching the Vercel AI SDK parts format. |
| `memories` | Long-term user facts stored with pgvector embeddings. |
| `weight_logs` | Weight tracking history. |
| `swiggy_tokens` | AES-256-GCM encrypted Swiggy OAuth tokens, expiry, and scopes. |
| `shared_chats` | Access tokens for sharing read-only conversation sessions. |
| `nutrition_cache` | Cache table for looking up USDA/OFF API nutritional data. |
| `youtube_transcripts` | Legacy/reserved table for storing video transcripts. |

---

## Environment Variables

Copy `.env.example` to create `.env.local` and configure the following variables:

```env
# ── Supabase Setup ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── AI Providers ──
# Azure OpenAI (Primary Chat LLM)
AZURE_RESOURCE_NAME=your-azure-resource-name
AZURE_API_KEY=your-azure-api-key

# NVIDIA NIM (Embeddings Engine)
NIM_API_KEY=nvapi-your-key

# ── Caching & Rate Limits ──
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# ── Security Keys ──
# Cron authorization secret
CRON_SECRET=your-cron-secret-token

# AES Encryption Key (must be a 64-character hex string representing 32 bytes)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SWIGGY_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key

# ── Public URL ──
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migrations
Prisma is configured in `prisma/schema.prisma`. Initialize database tables:
```bash
npx prisma db push
```

For production or when using pg_cron/pg_net on Supabase, run the SQL scripts in the **Supabase SQL Editor** in order:
1. [`scripts/001_schema.sql`](scripts/001_schema.sql)
2. [`scripts/002_functions.sql`](scripts/002_functions.sql)
3. [`scripts/003_cron.sql`](scripts/003_cron.sql)

Ensure the following extensions are enabled on your database:
* `pgvector` (for memories similarity search)
* `pg_cron` & `pg_net` (for scheduled memory extraction endpoints)

### 3. Run Development Server
```bash
npm run dev
```

### 4. Manually Triggering Memory Extraction
During development, you can force the memory extraction pipeline to run by hitting:
```bash
curl -X POST http://localhost:3000/api/cron/extract-memories \
  -H "Authorization: Bearer your-cron-secret"
```

---

## License

Private — All rights reserved.
