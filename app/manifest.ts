import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/neutri-ai',
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
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  }
}
