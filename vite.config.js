import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Separamos las librerías del código propio. Firebase es con diferencia
        // lo más pesado y casi nunca cambia, así que en su propio archivo se
        // queda cacheado entre despliegues en vez de volver a bajarse entero
        // cada vez que se toca una pantalla.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase'
          if (id.includes('react-router')) return 'router'
          return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La app se actualiza sola en la siguiente apertura: las clientas no
      // tienen forma de saber que hay una versión nueva ni de forzarla.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trinity Fit',
        short_name: 'Trinity Fit',
        description: 'Cuerpo, Mente y Alma. Tus rutinas de entrenamiento personalizadas.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3e8ff',
        theme_color: '#6B46C1',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          // Android recorta el icono a su propia forma; este lleva margen.
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        // Nunca servimos el HTML cacheado para rutas de Firestore/Auth: esos
        // datos deben venir siempre de la red, la caché es solo del armazón.
        navigateFallbackDenylist: [/^\/__/, /firestore\.googleapis\.com/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
