import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NeutriAI — Your AI Dietitian',
    short_name: 'NeutriAI',
    description:
      'Personalized nutrition coaching powered by AI. Log meals, hit your macros, and build lasting habits with a dietitian in your pocket.',
    start_url: '/chat',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F1E9',
    theme_color: '#18382A',
    categories: ['health', 'fitness', 'food'],
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
