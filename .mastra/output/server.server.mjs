import { setCookie, getCookies } from '@tanstack/react-start/server';
import { createServerClient } from '@supabase/ssr';
import ws from 'ws';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    `[supabase] Missing env vars. SUPABASE_URL=${SUPABASE_URL ?? "undefined"} SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY ? "set" : "undefined"}. Check your .env file and that vite.config.ts loads it.`
  );
}
const RESOLVED_URL = SUPABASE_URL;
const RESOLVED_KEY = SUPABASE_ANON_KEY;
function getSupabaseServerClient() {
  return createServerClient(RESOLVED_URL, RESOLVED_KEY, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value
        }));
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value);
        });
      }
    },
    realtime: {
      transport: ws
    }
  });
}

export { getSupabaseServerClient as g };
