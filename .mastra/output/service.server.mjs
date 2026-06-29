import { createServerClient } from '@supabase/ssr';
import ws from 'ws';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    `[supabase/service] Missing env vars. SUPABASE_URL=${SUPABASE_URL ?? "undefined"} SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY ? "set" : "undefined"}.`
  );
}
let client = null;
function getSupabaseServiceClient() {
  if (!client) {
    client = createServerClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
        }
      },
      realtime: {
        transport: ws
      }
    });
  }
  return client;
}

export { getSupabaseServiceClient as g };
