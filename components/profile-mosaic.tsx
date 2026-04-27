'use client'

import { Button } from '@/components/ui/button'

export function ProfileMosaic() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Profile</h1>
        <Button className="bg-sage hover:bg-sage2 text-white gap-2 h-10">
          ✏️ Edit profile
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - User Card */}
          <div className="col-span-1">
            <div className="bg-gradient-to-br from-sage to-sage2 text-white rounded-2xl p-6 space-y-4 sticky top-6">
              {/* Avatar & Name */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                  ST
                </div>
                <div>
                  <h2 className="font-bold text-lg">Saurabh Tiwari</h2>
                  <p className="text-sm opacity-90">tiwari.saurabh329@gmail.com</p>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>🌱</span>
                  <span>Vegetarian</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Lose fat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✨</span>
                  <span>3-day streak</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">25</p>
                  <p className="text-xs opacity-90">AGE</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">170</p>
                  <p className="text-xs opacity-90">HEIGHT CM</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">72</p>
                  <p className="text-xs opacity-90">WEIGHT KG</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">M</p>
                  <p className="text-xs opacity-90">SEX</p>
                </div>
              </div>

              {/* BMI */}
              <div className="border-t border-white/20 pt-4 space-y-2">
                <p className="text-sm font-semibold">BMI INDEX</p>
                <p className="text-3xl font-bold">24.9</p>
                <p className="text-xs opacity-90">Normal weight ✓</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden mt-2">
                  <div className="h-full w-2/5 bg-white rounded-full"></div>
                </div>
                <p className="text-xs opacity-90 text-center">Under — Normal — Over — Obese</p>
              </div>
            </div>
          </div>

          {/* Center Column - Goals & Targets */}
          <div className="col-span-1 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            {/* Goal Progress */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold">Lose 6kg · 10 weeks</h3>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="text-4xl font-bold text-turmeric">60%</div>
                  <p className="text-xs text-muted-foreground">DONE</p>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Started 6 weeks ago at 78kg. Currently at 72kg. On track - 3.6kg more to go by June 9.</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-bold">72</p>
                      <p className="text-xs text-muted-foreground">Current kg</p>
                    </div>
                    <div>
                      <p className="font-bold">66</p>
                      <p className="text-xs text-muted-foreground">Target kg</p>
                    </div>
                    <div>
                      <p className="font-bold">4 wks</p>
                      <p className="text-xs text-muted-foreground">Left</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Targets */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold">Daily Targets</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🔥', label: 'CALORIES', value: 1495 },
                  { icon: '💪', label: 'PROTEIN', value: '144g' },
                  { icon: '🌾', label: 'CARBS', value: '156g' },
                  { icon: '💧', label: 'FAT', value: '42g' },
                  { icon: '🌿', label: 'FIBER', value: '25g' },
                ].map(target => (
                  <div key={target.label} className="bg-cream2 rounded-lg p-3 text-center">
                    <p className="text-2xl mb-1">{target.icon}</p>
                    <p className="font-bold">{target.value}</p>
                    <p className="text-xs text-muted-foreground">{target.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Targets calculated using Mifflin-St Jeor · Sedentary activity · 500 kcal deficit</p>
            </div>

            {/* Activity Level */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Activity Level</h3>
              <div className="space-y-2">
                {['Sedentary', 'Light', 'Moderate', 'Very Active'].map(level => (
                  <button
                    key={level}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      level === 'Sedentary'
                        ? 'bg-sage text-white'
                        : 'bg-muted text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {level === 'Sedentary' && '😴'}
                    {level === 'Light' && '👤'}
                    {level === 'Moderate' && '🚶'}
                    {level === 'Very Active' && '🏃'}
                    {' ' + level}
                  </button>
                ))}
              </div>
            </div>

            {/* Health Conditions */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Health Conditions</h3>
              <div className="flex items-center gap-2 p-2 bg-mint2 rounded-lg">
                <span className="text-lg">✓</span>
                <span className="text-sm font-medium">No conditions</span>
              </div>
              <button className="text-sm text-sage hover:text-sage2 font-semibold">+ Add condition</button>
            </div>
          </div>

          {/* Right Column - Diet & Kitchen */}
          <div className="col-span-1 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            {/* Diet Style */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Diet Style</h3>
              <div className="flex flex-wrap gap-2">
                {['Vegetarian', 'High Protein', 'Carbs Good Fat', 'Keto', 'Pescatarian', 'Vegan', 'Gluten Free'].map(diet => (
                  <span
                    key={diet}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ['Vegetarian', 'High Protein'].includes(diet)
                        ? 'bg-sage text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {diet}
                  </span>
                ))}
              </div>
            </div>

            {/* Restrictions */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Restrictions</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-clay-l rounded-full text-xs font-semibold text-clay">
                      🥜 No peanuts
                    </span>
                    <button className="text-xs font-semibold text-sage hover:text-sage2">+ Add</button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Dislikes</p>
                  <div className="flex flex-wrap gap-2">
                    {['Capsicum', 'Bitter gourd'].map(dislike => (
                      <span key={dislike} className="px-3 py-1 bg-muted rounded-full text-xs font-semibold text-foreground">
                        {dislike}
                      </span>
                    ))}
                    <button className="text-xs font-semibold text-sage hover:text-sage2">+ Add</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kitchen Setup */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Kitchen Setup</h3>
              <p className="text-xs text-muted-foreground">Tap to toggle availability</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: '🔥', label: 'Gas Stove', available: true },
                  { icon: '🌡️', label: 'Microwave', available: true },
                  { icon: '🍲', label: 'Pressure Cooker', available: true },
                  { icon: '💨', label: 'Air Fryer', available: false },
                  { icon: '🥣', label: 'Blender', available: true },
                  { icon: '🔪', label: 'OTG Oven', available: false },
                ].map(item => (
                  <button
                    key={item.label}
                    className={`p-3 rounded-lg text-center text-xs space-y-1 transition-colors ${
                      item.available
                        ? 'bg-mint2 text-sage'
                        : 'bg-cream2 text-muted-foreground opacity-50'
                    }`}
                  >
                    <div className="text-lg">{item.icon}</div>
                    <div className="font-semibold">{item.label}</div>
                    {item.available && <div className="text-xs">✓ Available</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
