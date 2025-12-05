export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
  ],
  css: ['~/assets/base.css'],
  fonts: {
    families: [
      {
        name: 'Roboto',
        provider: 'google',
        weights: [400, 500, 700],
        styles: ['normal'],
        subsets: ['latin'],
      },
    ],
  },
  runtimeConfig: {
    apiSecret: process.env.API_SECRET || 'dev-secret',
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:8000',
      googleMapsKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    },
  },
 
 
  image: {
    // Dominios permitidos para optimizar
    domains: ['img.restpe.com'], 
    // Opciones por defecto
    quality: 80,
    format: ['webp']
  }
})
