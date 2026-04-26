# PostHog Agent Observability Integration

## Overview

This NutriAI app uses **PostHog** for agent observability and product analytics. PostHog is a free, open-source product analytics platform that tracks user interactions, AI agent behavior, and system errors in real-time.

## Why PostHog?

- **Free & Open Source**: No vendor lock-in, generous free tier (20,000 events/month)
- **Agent Behavior Tracking**: Monitor AI tool execution, decision paths, and user interactions
- **Error Tracking**: Automatically capture and analyze errors
- **Session Replay**: Optional feature to replay user sessions
- **Self-Hosted Option**: Can run on your own infrastructure
- **Privacy-Focused**: GDPR compliant, data stays with you

## Setup

### 1. Get Your PostHog API Key

1. Visit [posthog.com](https://posthog.com) and sign up for free
2. Create a new project for "NutriAI"
3. Copy your **API Key** from the project settings
4. Note your **API Host** (usually `https://us.i.posthog.com` or `https://eu.i.posthog.com`)

### 2. Set Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> **Note**: These are `NEXT_PUBLIC_*` variables intentionally—PostHog SDK runs on the client-side.

### 3. Verify Integration

The app will automatically:
- Initialize PostHog when loaded
- Track page views
- Capture all user events
- Report errors to PostHog dashboard

If `NEXT_PUBLIC_POSTHOG_KEY` is not set, analytics will be disabled with a warning in console.

## Tracked Events

### Chat Interactions

| Event | Data Captured | Purpose |
|-------|--------------|---------|
| `chat_message_sent` | conversation_id, message_length | Track user messages to AI |
| `suggestion_clicked` | suggestion_text | Monitor which starter prompts users pick |
| `chat_renamed` | conversation_id, new_title | Track conversation naming |
| `chat_deleted` | conversation_id | Monitor chat cleanup |
| `tool_executed` | tool_name, tool_call_id | Track AI tool usage (meal proposals, pantry suggestions) |

### Meal Management

| Event | Data Captured | Purpose |
|-------|--------------|---------|
| `meal_deleted` | meal_id, calories, meal_type | Track meal log management |

### Pantry Management

| Event | Data Captured | Purpose |
|-------|--------------|---------|
| `pantry_item_deleted` | item_id, item_name, category | Track pantry cleanup |

### Errors

| Event | Data Captured | Purpose |
|-------|--------------|---------|
| `error_occurred` | error_message, error_stack, context | Capture runtime errors |

## Using PostHog in Your Code

### Track Events

```typescript
import { trackEvent } from '@/lib/posthog'

// Track a custom event
trackEvent('user_logged_in', {
  login_method: 'email',
  timestamp: new Date().toISOString(),
})
```

### Track Errors

```typescript
import { trackError } from '@/lib/posthog'

try {
  // some operation
} catch (error) {
  trackError(error instanceof Error ? error : new Error('Unknown error'), {
    context: 'profile_update_failed',
    userId: user.id,
  })
}
```

### Set User Properties

```typescript
import { setUserProperties } from '@/lib/posthog'

setUserProperties(user.id, {
  email: user.email,
  plan: 'pro',
  signup_date: user.created_at,
})
```

### Track Page Views

```typescript
import { trackPageView } from '@/lib/posthog'

trackPageView('/dashboard', {
  referrer: document.referrer,
})
```

## PostHog Dashboard

### Key Metrics to Monitor

1. **Event Volume**: Are users engaging with the app?
2. **Tool Execution Rate**: How often is the AI agent being used?
3. **Error Rate**: What errors are users encountering?
4. **User Retention**: Are users coming back?
5. **Conversation Patterns**: Which chat topics are most popular?

### Building Insights

In PostHog dashboard:

1. **Funnels**: Track conversion from chat → meal log → pantry
2. **Retention**: See which features keep users coming back
3. **Heatmaps**: Understand which UI elements get clicked (with session replay)
4. **Trends**: Monitor event frequency over time

## File Structure

```
lib/
├── posthog.ts              # PostHog client & helper functions
components/
├── posthog-provider.tsx    # PostHog provider component (wraps app)
```

### lib/posthog.ts

Core utilities:
- `initPostHog()` - Initialize PostHog SDK
- `trackEvent(name, properties)` - Track custom events
- `trackError(error, context)` - Track errors
- `setUserProperties(userId, properties)` - Identify users
- `trackPageView(pageName, properties)` - Manual page view tracking

### components/posthog-provider.tsx

Client-side provider that:
- Initializes PostHog on mount
- Automatically tracks page view changes
- Wraps entire app in root layout

## Privacy & Compliance

### GDPR Compliance

PostHog is GDPR compliant. Ensure you:

1. Have user consent before tracking (if required in your jurisdiction)
2. Update your Privacy Policy to mention PostHog analytics
3. Provide users with a way to opt-out

### Disable Tracking

To disable PostHog (e.g., for development):

```typescript
// In lib/posthog.ts
if (process.env.NODE_ENV === 'development') {
  console.log('[PostHog] Disabled in development')
  return
}
```

### User Opt-Out

PostHog supports opt-out:

```typescript
import posthog from 'posthog-js'

// Opt user out
posthog.opt_out_capturing()

// Opt user back in
posthog.opt_in_capturing()
```

## Troubleshooting

### Events Not Appearing

1. Check `NEXT_PUBLIC_POSTHOG_KEY` is set in `.env.local`
2. Open browser DevTools → Network tab → filter for `posthog`
3. Look for successful requests to PostHog API
4. Check console for `[PostHog] Initialized successfully`

### Performance Impact

- PostHog SDK is lightweight (~40KB gzipped)
- Events are batched and sent asynchronously
- Minimal impact on page load time

### Rate Limiting

Free tier has limits:
- 20,000 events/month
- Standard project setup is well within limits

## Self-Hosting Option

For enterprise use, PostHog can be self-hosted:

```typescript
// In lib/posthog.ts
posthog.init(posthogKey, {
  api_host: 'https://your-posthog-instance.com',
})
```

Requires Docker. See [PostHog self-hosted docs](https://posthog.com/docs/self-host) for setup.

## Next Steps

1. Add more granular event tracking for feature analytics
2. Set up custom user cohorts in PostHog (e.g., "active users", "power users")
3. Create dashboards for different stakeholder needs (product, engineering, marketing)
4. Implement feature flags for A/B testing nutrition advice
5. Set up alerts for error spikes

## References

- [PostHog Docs](https://posthog.com/docs)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [Analytics Best Practices](https://posthog.com/blog/analytics-best-practices)
