'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

interface CalorieRingProps {
  consumed: number
  target: number
  protein?: { consumed: number; target: number }
  carbs?: { consumed: number; target: number }
  fat?: { consumed: number; target: number }
}

export function TodayDashboardLayout({
  consumed,
  target,
  protein,
  carbs,
  fat,
  meals,
}: CalorieRingProps & { meals?: any[] }) {
  const remaining = Math.max(0, target - consumed)
  const percentage = Math.min(100, (consumed / target) * 100)

  const weeklyData = [
    { day: 'M', value: 1240 },
    { day: 'T', value: 1380 },
    { day: 'W', value: 1420 },
    { day: 'Th', value: 1100 },
    { day: 'F', value: 1340 },
    { day: 'Sa', value: 1250 },
    { day: 'Su', value: 1210 },
  ]

  const pieData = [
    { name: 'Consumed', value: consumed },
    { name: 'Remaining', value: remaining },
  ]

  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      {/* Left Column - Charts and Stats */}
      <div className="col-span-1 bg-card rounded-2xl p-6 space-y-6 overflow-y-auto">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">Monday, 28 April</p>
          <h1 className="font-serif text-3xl font-bold">Good evening,<br />Saurabh 👋</h1>
        </div>

        {/* Calorie Ring */}
        <div className="space-y-2">
          <div className="flex items-center justify-center h-40 w-40 mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#2E6048" />
                  <Cell fill="#E3DBCE" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{consumed}</p>
            <p className="text-xs text-muted-foreground">kcal consumed</p>
            <p className="text-xs text-muted-foreground">{remaining} remaining</p>
          </div>

          {/* Macro legend */}
          <div className="flex gap-2 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sage"></div>
              <span>Breakfast</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-turmeric"></div>
              <span>Lunch</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-clay"></div>
              <span>Dinner</span>
            </div>
          </div>
        </div>

        {/* Macro Bars */}
        <div className="space-y-3">
          {[
            { label: 'Protein', consumed: protein?.consumed || 0, target: protein?.target || 0, color: '#E09B1A', icon: '💪' },
            { label: 'Carbs', consumed: carbs?.consumed || 0, target: carbs?.target || 0, color: '#D4AF37', icon: '🌾' },
            { label: 'Fat', consumed: fat?.consumed || 0, target: fat?.target || 0, color: '#4A8263', icon: '🧈' },
            { label: 'Fiber', consumed: 15, target: 30, color: '#C5E5D2', icon: '🌿' },
          ].map((macro) => (
            <div key={macro.label}>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>{macro.icon} {macro.label}</span>
                <span>{macro.consumed.toFixed(0)}g / {macro.target}g</span>
              </div>
              <div className="h-2 bg-cream2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (macro.consumed / macro.target) * 100)}%`,
                    backgroundColor: macro.color,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">THIS WEEK</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyData}>
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {weeklyData.map((entry, idx) => (
                  <Cell key={idx} fill={idx === 2 ? '#C24A24' : '#2E6048'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">Avg 1,380 kcal/day · 8% under target</p>
        </div>
      </div>

      {/* Right Column - Meals Timeline */}
      <div className="col-span-2 bg-card rounded-2xl p-6 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today's meals</h2>
          <button className="px-3 py-1.5 bg-sage hover:bg-sage2 text-white text-xs font-semibold rounded-lg transition-colors">
            Ask NutriAI
          </button>
        </div>

        {/* Meals */}
        <div className="space-y-3">
          {[
            {
              time: '8:20 AM',
              type: 'BREAKFAST',
              name: 'Vegetable Poha + Masala Chai',
              cals: 342,
              icon: '🥘',
              protein: 18,
              carbs: 48,
              fat: 9,
            },
            {
              time: '1:15 PM',
              type: 'LUNCH',
              name: 'Dal Tadka + 2 Rotis + Salad',
              cals: 618,
              icon: '🍛',
              protein: 38,
              carbs: 44,
              fat: 14,
            },
            {
              time: '4:30 PM',
              type: 'SNACK',
              name: 'Apple + Mixed Nuts (30g)',
              cals: 280,
              icon: '🍎',
              protein: 7,
              carbs: 24,
              fat: 14,
            },
          ].map((meal, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{meal.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">{meal.time} · {meal.type}</p>
                      <p className="font-semibold">{meal.name}</p>
                    </div>
                    <p className="text-lg font-bold">{meal.cals}</p>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-turmeric">🥚 {meal.protein}g protein</span>
                    <span className="text-amber-600">🌾 {meal.carbs}g carbs</span>
                    <span className="text-sage2">🧈 {meal.fat}g fat</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Dinner not logged */}
          <div className="border border-dashed border-border rounded-lg p-4 text-center space-y-2">
            <p className="text-2xl">🍽️</p>
            <p className="text-sm font-semibold text-foreground">Dinner · not logged yet</p>
            <p className="text-xs text-muted-foreground">255 kcal left for tonight</p>
            <button className="text-xs font-semibold text-sage hover:text-sage2">+ Log dinner</button>
          </div>
        </div>

        {/* Protein Alert */}
        <div className="bg-sage text-white rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-semibold text-sm">Protein gap alert.</p>
            <p className="text-xs mt-1">You&apos;re 66g short on protein. A quick moong dal cheela for dinner would close the gap perfectly.</p>
            <button className="mt-3 px-3 py-1 bg-turmeric hover:bg-turmeric/90 text-ink text-xs font-semibold rounded-lg transition-colors">
              Get recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
