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

  // Suppress AI SDK warnings about unsupported provider features.
  // ZAI/GLM doesn't support responseFormat (json_schema) but generateObject
  // still works via prompt-based JSON fallback.
  process.env.AI_SDK_LOG_WARNINGS = 'false'

  return {
    server: {
      port: 3000,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
