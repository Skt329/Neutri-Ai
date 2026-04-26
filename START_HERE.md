# 🎬 Get Started Now

## 3 Steps to Start Tracking

### Step 1️⃣: Sign Up for PostHog (1 min)
```
1. Go to https://posthog.com
2. Click "Get started free"
3. Create account (email or GitHub)
4. Create new project: name it "NutriAI"
```

### Step 2️⃣: Get Your API Key (1 min)
```
1. In PostHog dashboard, go to Settings → Project
2. Copy your "Project API Key"
3. Note your region (us.i.posthog.com or eu.i.posthog.com)
```

### Step 3️⃣: Add to Your Project (2 min)
```
Create/edit .env.local in your project root:

NEXT_PUBLIC_POSTHOG_KEY=<paste_your_api_key_here>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

✅ **Done!** Restart your dev server and events will start appearing.

---

## Verify It's Working

1. Open your app in browser
2. Use some features (send chat message, delete meal, etc.)
3. Open DevTools → Network tab → Filter "posthog"
4. Should see POST requests to `batch`
5. Go to PostHog dashboard → Events tab
6. You should see your events in real-time! 🎉

---

## What's Tracking?

Everything you do in the app now:
✅ Chat messages
✅ AI tool execution
✅ Meal management
✅ Pantry changes
✅ Errors
✅ Page views

---

## View Your Data

1. Log into your PostHog account
2. Click "Events"
3. Watch real-time events appear as you use the app
4. Click on events to see details
5. Build funnels, cohorts, and dashboards

---

## Documentation

**Need help?**
- Quick Setup: `docs/POSTHOG_QUICKSTART.md`
- Full Guide: `docs/POSTHOG_IMPLEMENTATION.md`
- All Events: `docs/EVENTS_REFERENCE.md`
- Implementation Status: `POSTHOG_CHECKLIST.md`

---

## Questions?

**Q: Is it really free?**
A: Yes! 20,000 events/month free tier. That's more than you'll need.

**Q: Do I have to use it?**
A: No, just remove the env variables to disable.

**Q: Can I self-host?**
A: Yes! See the implementation guide for Docker setup.

**Q: What about privacy?**
A: GDPR compliant, open source, full control over data.

**Q: When do I need to pay?**
A: Only if you exceed 20k events/month (unlikely).

---

## That's It! 🎉

You now have production-grade AI observability tracking your NutriAI app.

**Next action**: Sign up at https://posthog.com

Questions? Check the docs!
