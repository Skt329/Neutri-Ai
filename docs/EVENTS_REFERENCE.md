# PostHog Events Reference

## Event Tracking Map

### Chat Interactions

#### `chat_message_sent`
Fired when user sends a message to the AI.

**Properties:**
- `conversation_id` (string) - Unique chat ID
- `message_length` (number) - Character count of message

**Example in PostHog:**
```
User sent message of 45 characters in conversation abc123
```

---

#### `suggestion_clicked`
Fired when user clicks one of the starter suggestions.

**Properties:**
- `suggestion_text` (string) - The suggested prompt text

**Example:**
```
User clicked suggestion: "Two eggs, toast, and an avocado."
```

---

#### `chat_renamed`
Fired when user renames a conversation.

**Properties:**
- `conversation_id` (string) - Chat ID
- `new_title` (string) - New conversation name

**Example:**
```
Conversation renamed to "Workout Week Meal Plan" in abc123
```

---

#### `chat_deleted`
Fired when user deletes a conversation.

**Properties:**
- `conversation_id` (string) - Deleted chat ID

**Example:**
```
Conversation abc123 was deleted
```

---

#### `tool_executed`
Fired when the AI executes a tool (meal proposal, pantry suggestion, etc.).

**Properties:**
- `tool_name` (string) - Name of tool (e.g., "propose_meal_log", "ask_user")
- `tool_call_id` (string) - Unique tool execution ID

**Example:**
```
Tool "propose_meal_log" executed (ID: tool_xyz)
```

---

### Meal Management

#### `meal_deleted`
Fired when user removes a meal from their log.

**Properties:**
- `meal_id` (string) - Unique meal ID
- `calories` (number) - Calorie count of meal
- `meal_type` (string) - Meal type (breakfast, lunch, dinner, snack)

**Example:**
```
User deleted breakfast: 520 calories
```

---

### Pantry Management

#### `pantry_item_deleted`
Fired when user removes an item from pantry.

**Properties:**
- `item_id` (string) - Unique item ID
- `item_name` (string) - Name of item (e.g., "Banana")
- `category` (string) - Category (fruits, grains, protein, etc.)

**Example:**
```
User removed "Banana" from fruits
```

---

### Error Tracking

#### `error_occurred`
Automatically fired when any error is caught and explicitly tracked.

**Properties:**
- `error_message` (string) - Error message text
- `error_stack` (string) - Stack trace for debugging
- `context` (string, optional) - Context where error occurred

**Example:**
```
Error in chat submission: "Network timeout"
Stack: at ChatView.onSubmit...
Context: chat_message_submit_failed
```

---

### Page Views

#### `page_view` (Automatic)
Fired on every route change.

**Properties:**
- `page_name` (string) - Current path (e.g., "/meals", "/chat/123")
- Additional context if provided

**Example:**
```
User viewed /dashboard
```

---

## Using These Events in PostHog

### Create a Funnel

Track user journey:
1. Start: `chat_message_sent`
2. Step 2: `tool_executed` (tool_name = "propose_meal_log")
3. Step 3: View other pages

### Build Cohorts

- **Active Chatters**: Users with >5 `chat_message_sent` in last 7 days
- **Power Users**: Users with >10 `tool_executed` events
- **Meal Loggers**: Users with `meal_deleted` events

### Create Dashboards

- **Daily Events**: Track event volume trends
- **Top Tools**: Which tools are most used?
- **Error Rates**: Spike detection for `error_occurred`
- **User Engagement**: Combine multiple events

### Set Up Alerts

- Alert if `error_occurred` rate > 1%
- Alert if `chat_message_sent` drops below usual
- Alert on new error types

---

## Querying Events in PostHog

### Example Queries

**Question: How many meals are deleted daily?**
```
event: meal_deleted
group by: day
aggregate: count
```

**Question: Which meal types are most often deleted?**
```
event: meal_deleted
breakdown: meal_type
aggregate: count
```

**Question: What's the tool execution rate per chat?**
```
event: tool_executed
group by: conversation_id
aggregate: count
```

**Question: Which suggestions get clicked most?**
```
event: suggestion_clicked
breakdown: suggestion_text
aggregate: count
```

---

## Event Properties Best Practices

When tracking new events, include:

1. **Identifiers** - What entity is being tracked? (user_id, meal_id, item_id)
2. **Context** - Why did this happen? (meal_type, category, error_context)
3. **Metrics** - What were the values? (calories, quantity, message_length)
4. **Timestamps** - PostHog adds automatically

Example:
```typescript
trackEvent('user_meal_logged', {
  meal_id: meal.id,           // identifier
  meal_type: meal.type,       // context
  calories: meal.calories,    // metric
  protein_g: meal.protein,    // metric
  source: 'chat',             // context (via chat or manual)
})
```

---

## Adding New Events

To add event tracking to a component:

```typescript
import { trackEvent } from '@/lib/posthog'

// In your handler
trackEvent('event_name', {
  property1: value1,
  property2: value2,
})
```

Naming convention: `action_noun` (e.g., `user_logged_in`, `meal_deleted`, `tool_executed`)

---

## Debugging Events

### Check if events are being sent

1. Open DevTools → Network tab
2. Filter for "posthog"
3. Look for POST requests to `batch` endpoint
4. Expand request → Preview tab → see your events

### Console Logging

PostHog logs to console (if enabled):
```
[PostHog] Initialized successfully
[PostHog] Error tracking error: ...
```

### PostHog Dashboard

1. Go to Events section
2. Should see events appear in real-time
3. Click event to see properties

---

## Reference

- Full guide: `docs/POSTHOG_IMPLEMENTATION.md`
- Quick start: `docs/POSTHOG_QUICKSTART.md`
- PostHog docs: [posthog.com/docs](https://posthog.com/docs)
