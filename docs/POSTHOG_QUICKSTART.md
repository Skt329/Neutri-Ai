# PostHog Quick Start

## 1️⃣ Sign Up (1 minute)

- Go to [posthog.com](https://posthog.com)
- Click "Get started free"
- Create account (email or GitHub)
- Create a new project named "NutriAI"

## 2️⃣ Get Your API Key (1 minute)

- In PostHog dashboard, go to **Settings** → **Project**
- Copy your **Project API Key**
- Note your **Region** (us or eu)

## 3️⃣ Add to Your Project (2 minutes)

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_POSTHOG_KEY=your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Replace:
- `your_key_here` with your actual API key
- `.i.posthog.com` → `.eu.i.posthog.com` if you're in EU

## 4️⃣ Done! ✅

The app will automatically:
- Track all user interactions
- Monitor AI agent behavior
- Capture errors
- Send data to your PostHog dashboard

## View Your Data

1. Refresh your app
2. Log in and use the app
3. Go back to PostHog dashboard
4. Watch events appear in real-time under **Events**

## Common Questions

**Q: Where does my data go?**
A: To PostHog's cloud (US or EU) or your own server if self-hosted.

**Q: Can I disable tracking?**
A: Yes, remove `NEXT_PUBLIC_POSTHOG_KEY` from env to disable.

**Q: Is it free?**
A: Yes! Free tier includes 20,000 events/month - plenty for most apps.

**Q: Can I self-host?**
A: Yes, see [self-hosting guide](https://posthog.com/docs/self-host).

---

See [POSTHOG_IMPLEMENTATION.md](./POSTHOG_IMPLEMENTATION.md) for full documentation.
