# Production Deployment Checklist

## Pre-deployment

- [ ] All secrets configured in Vercel/Azure (NOT in `.env.local`)
- [ ] `npm run test:run` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Health check responds: `GET /api/health`

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `AZURE_RESOURCE_NAME` | Azure OpenAI resource name |
| `AZURE_API_KEY` | Azure OpenAI API key |
| `NIM_API_KEY` | NVIDIA NIM embedding API key |
| `USDA_API_KEY` | USDA FoodData Central API key |
| `CRON_SECRET` | Secret for cron job authentication |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection (for migrations) |

## Post-deployment

- [ ] Health check passes in production (`/api/health`)
- [ ] Login/signup flow works
- [ ] Chat sends and receives messages
- [ ] Tool cards render and respond (meal log, pantry, ask_user)
- [ ] Nutrition lookup works (search + barcode)
- [ ] Cron job runs (`POST /api/cron/extract-memories`)
- [ ] Swiggy integration connects (if configured)

## Rollback

If issues are detected:
1. Revert to previous Vercel deployment (Dashboard → Deployments → Promote)
2. If database migration was applied and needs rollback: `npx prisma migrate reset` (destructive — use only in staging)
