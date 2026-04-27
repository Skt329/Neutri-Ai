# NutriAI Design Implementation Blueprint

## Color System (Complete)
- Cream: #F6F1E9 (background)
- Forest: #18382A (dark primary)
- Sage: #2E6048 (main primary)
- Mint: #C5E5D2 (accent)
- Turmeric: #E09B1A (secondary/alerts)
- Clay: #C24A24 (destructive)

## Typography (Complete)
- Display: Fraunces (serif) - 700 weight for headings
- Body: Plus Jakarta Sans - 400/600/700 weights

## Layout Architecture

### Screen 1: Chat Home (Default)
- **Left Rail (60px)**: Thin history with new chat button, search
- **Main (flexible)**: Chat window with messages
- **Top Context**: Pills showing calories left, protein, day progress
- **Bottom**: Message input with quick actions (Log meal, Order, Plan, etc)

### Screen 2: Today (Dashboard)
- Left side (33%): 
  - Large calorie ring chart
  - Macro bars (protein/carbs/fat/fiber)
  - Weekly bar chart (7 days)
- Right side (67%):
  - "Today's meals" timeline
  - Logged meals with macros
  - Empty dinner slot
  - Protein gap alert badge

### Screen 3: Pantry (Magazine Grid)
- Stats strip at top (28 items, 69.9K kcal, macros)
- Category tabs: All, Vegetables, Grains, Proteins, Dairy, Spices
- Magazine grid layout (4 columns desktop)
- Ingredient cards with stats
- "What can I cook?" AI button (top right)

### Screen 4: Profile (Mosaic)
- User card (left): Avatar, name, goals, stats
- Goals section: Weight loss goal, current/target weight, days left
- Daily targets grid: Calories, protein, carbs, fat, fiber
- Activity level selector
- Health conditions
- Diet preferences chips
- Kitchen setup grid (appliances with checkmarks)

### Screen 5: Mobile
- Bottom tab navigation: Chat, Today, Pantry, Me
- Full-screen optimized layouts
- Context strip at top
- Same interactions, responsive design

## Component Structure

```
ChatFirstLayout (new)
├── HistorySidebar (thin rail)
│   ├── New Chat button
│   ├── Search input
│   └── Conversation list
├── MainChat
│   ├── ChatHeader
│   │   ├── Title (editable)
│   │   └── Menu
│   ├── ContextStrip (top)
│   │   ├── Calories pill
│   │   ├── Protein pill
│   │   ├── Day badge
│   │   └── More menu
│   ├── MessagesContainer
│   │   ├── Message (user - dark bubble)
│   │   ├── Message (AI - light + embedded card)
│   │   ├── TypingIndicator
│   │   └── EmbeddedCards (meals, recipes, etc)
│   ├── QuickActions (row of buttons)
│   └── InputArea
│       ├── Message input
│       └── Send button
├── Sidebar Tabs (conditional)
│   ├── Today → DashboardView
│   ├── Pantry → PantryGrid
│   ├── Profile → ProfileMosaic
│   └── Mobile → TabNav

## Key Components Needed

1. **ChatFirstLayout** - Main wrapper
2. **HistorySidebar** - Conversation history rail
3. **ChatHeader** - Title, menu, controls
4. **ContextStrip** - Top pills (calories, macros, day)
5. **Message** - User/AI message bubbles
6. **EmbeddedCard** - Meal/recipe card in chat
7. **QuickActions** - Button bar below chat
8. **DashboardView** - Today screen with charts
9. **PantryGrid** - Magazine grid layout
10. **ProfileMosaic** - User profile cards
11. **MobileNav** - Bottom tab navigation
12. **InputArea** - Message input with actions

## Animations
- Fade-in-up on message entry (12px, 0.4s)
- Character-by-character streaming (15ms per char)
- Smooth hover effects on buttons
- Slide-in for side panels
- Typing indicator bounce

## Session Management
- httpOnly cookies for auth
- localStorage cache for session (sub-50ms lookups)
- IndexedDB for conversations (offline-first)
- Auto-sync when online

## Performance Targets
- FCP: < 1.2s
- TTI: < 2s
- Auth: < 50ms (cached)
- Message send: < 200ms
- Conversation switch: < 100ms
- Lighthouse: > 90
