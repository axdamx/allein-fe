import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { loadEnv } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_-prefixed) into process.env so they
  // are available inside TanStack Start server functions. Vite only exposes
  // VITE_-prefixed vars to client code by default; server-side secrets like
  // SUPABASE_URL / SUPABASE_ANON_KEY need explicit exposure.
  const env = loadEnv(mode, process.cwd(), '')

  // Make non-VITE_ secrets visible to the server runtime via process.env.
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_')) {
      process.env[key] = value
    }
  }

  return {
    server: {
      port: 3000,
      // Billing redirects use APP_URL (localhost:3000 by default). Failing
      // loudly prevents Vite from silently selecting a different port and
      // sending Checkout customers back to the wrong local process.
      strictPort: true,
      allowedHosts: true, // allow cloudflared / ngrok tunnels in dev
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
