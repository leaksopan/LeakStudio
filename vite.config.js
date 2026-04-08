import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.split(path.sep).join('/')

          if (!moduleId.includes('node_modules')) return

          if (moduleId.includes('/react-router-dom/') || moduleId.includes('/react-router/')) {
            return 'router-vendor'
          }

          if (moduleId.includes('/react-dom/') || moduleId.includes('/react/') || moduleId.includes('/scheduler/')) {
            return 'react-vendor'
          }

          if (moduleId.includes('/@supabase/')) {
            return 'supabase-vendor'
          }

          if (moduleId.includes('/@tanstack/')) {
            return 'query-vendor'
          }

          if (moduleId.includes('/framer-motion/') || moduleId.includes('/motion-dom/')) {
            return 'motion-vendor'
          }

          if (
            moduleId.includes('/@radix-ui/') ||
            moduleId.includes('/radix-ui/') ||
            moduleId.includes('/lucide-react/') ||
            moduleId.includes('/sonner/')
          ) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
})
