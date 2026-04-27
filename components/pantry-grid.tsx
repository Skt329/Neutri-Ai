'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const categoryTabs = [
  { id: 'all', label: 'All', icon: '📦', count: 28 },
  { id: 'vegetables', label: 'Vegetables', icon: '🥬', count: 3 },
  { id: 'grains', label: 'Grains', icon: '🌾', count: 5 },
  { id: 'proteins', label: 'Proteins', icon: '🥚', count: 4 },
  { id: 'dairy', label: 'Dairy', icon: '🧈', count: 3 },
  { id: 'spices', label: 'Spices', icon: '🌶️', count: 5 },
]

const ingredients = [
  // Vegetables
  { name: 'Chillies', quantity: '100g', calories: 40, protein: '2g', carbs: '9g', icon: '🌶️', category: 'vegetables' },
  { name: 'Tomato', quantity: '1kg', calories: 180, protein: '10g', carbs: '40g', icon: '🍅', category: 'vegetables' },
  { name: 'Potato', quantity: '1kg', calories: 770, protein: '20g', carbs: '170g', icon: '🥔', category: 'vegetables' },
  
  // Grains
  { name: 'Basmati Rice', quantity: '2kg', calories: 7320, protein: '130g', carbs: '1300g', icon: '🍚', category: 'grains' },
  { name: 'Whole Wheat Atta', quantity: '5kg', calories: 16900, protein: '600g', carbs: '3400g', icon: '🌾', category: 'grains' },
  { name: 'Moong Dal', quantity: '500g', calories: 1720, protein: '120g', carbs: '300g', icon: '🟡', category: 'grains' },
  { name: 'Chana Dal', quantity: '500g', calories: 1750, protein: '105g', carbs: '300g', icon: '🟤', category: 'grains' },
  
  // Proteins
  { name: 'Paneer', quantity: '400g', calories: 528, protein: '60g', carbs: '34g', icon: '🧀', category: 'proteins', expiry: '2 days', expiryStatus: 'soon' },
  { name: 'Eggs', quantity: '12 pcs', calories: 864, protein: '72g', carbs: '0g', icon: '🥚', category: 'proteins' },
  { name: 'Toned Milk', quantity: '1L', calories: 500, protein: '32g', carbs: '48g', icon: '🥛', category: 'dairy', expiry: 'Tomorrow', expiryStatus: 'expiring' },
  { name: 'Low-fat Curd', quantity: '500g', calories: 250, protein: '20g', carbs: '10g', icon: '🍶', category: 'dairy', expiry: 'Tomorrow', expiryStatus: 'expiring' },
]

export function PantryGrid() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = ingredients.filter(ing => 
    (activeTab === 'all' || ing.category === activeTab) &&
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    items: 28,
    calories: 69917,
    protein: 2176,
    carbs: 10324,
    fat: 2275,
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">Pantry</h1>
          <Button className="bg-sage hover:bg-sage2 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />
            Add via chat
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Stats Strip */}
          <div className="grid grid-cols-5 gap-3 bg-cream2 rounded-xl p-4">
            <div className="text-center">
              <p className="text-2xl">📦</p>
              <p className="font-bold text-lg">{stats.items}</p>
              <p className="text-xs text-muted-foreground">TOTAL ITEMS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">🔥</p>
              <p className="font-bold text-lg">{stats.calories.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">TOTAL KCAL</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">💪</p>
              <p className="font-bold text-lg">{stats.protein}</p>
              <p className="text-xs text-muted-foreground">PROTEIN</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">🌾</p>
              <p className="font-bold text-lg">{stats.carbs}</p>
              <p className="text-xs text-muted-foreground">CARBS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">💧</p>
              <p className="font-bold text-lg">{stats.fat}</p>
              <p className="text-xs text-muted-foreground">FAT</p>
            </div>
          </div>

          {/* Expiry Alert */}
          <div className="bg-turmeric-l border border-turmeric rounded-lg p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">2 items expiring soon</p>
              <p className="text-xs text-ink/80">Curd (tomorrow), Paneer (2 days). Ask NutriAI to suggest recipes using them.</p>
            </div>
            <a href="#" className="text-xs font-semibold text-sage hover:text-sage2 whitespace-nowrap">
              Use now →
            </a>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categoryTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-sage text-white'
                    : 'bg-cream2 text-foreground hover:bg-muted'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Ingredients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map(ing => (
              <div
                key={ing.name}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{ing.icon}</span>
                  {ing.expiryStatus === 'expiring' && (
                    <span className="text-xs font-bold px-2 py-1 bg-clay text-white rounded-full">
                      Tomorrow
                    </span>
                  )}
                  {ing.expiryStatus === 'soon' && (
                    <span className="text-xs font-bold px-2 py-1 bg-turmeric text-ink rounded-full">
                      2 days
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{ing.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{ing.quantity}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">🔥 {ing.calories}kcal</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-turmeric">🥊 {ing.protein}</span>
                    <span className="text-amber-600">🌾 {ing.carbs}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No ingredients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
