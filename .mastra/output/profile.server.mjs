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

const PLAN_CONFIGS = {
  free: {
    tier: "free",
    label: "Free",
    price: 0,
    tagline: "Explore the platform with one AI agent.",
    cta: "Get started",
    accent: "#64748b",
    limits: {
      agents: { max: 1 },
      conversations: { max: 10 },
      messages: { max: 100 },
      posts: { max: 5 },
      documents: { max: 3 },
      leads: { max: 10 },
      whatsappMessages: { max: 0 },
      telegramMessages: { max: 0 }
    },
    features: {
      crm: false,
      clients: false,
      marketingStudio: false,
      aiImageGen: false,
      aiVideoGen: false,
      ragDocuments: false,
      scheduledPosts: false,
      teamSeats: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      whatsappBroadcast: false,
      telegramBot: false
    }
  },
  lite: {
    tier: "lite",
    label: "Lite",
    price: 29,
    tagline: "For solo operators running a single agent type.",
    cta: "Choose Lite",
    accent: "#3b82f6",
    limits: {
      agents: { max: 3 },
      conversations: { max: 100 },
      messages: { max: 2e3 },
      posts: { max: 30 },
      documents: { max: 25 },
      leads: { max: 500 },
      whatsappMessages: { max: 50 },
      telegramMessages: { max: 100 }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: false,
      aiVideoGen: false,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      whatsappBroadcast: false,
      telegramBot: true
    }
  },
  pro: {
    tier: "pro",
    label: "Pro",
    price: 99,
    tagline: "Full power \u2014 all agent types, marketing studio, and RAG.",
    cta: "Choose Pro",
    featured: true,
    accent: "#6366f1",
    limits: {
      agents: { max: 10 },
      conversations: { max: null },
      // unlimited
      messages: { max: null },
      posts: { max: 150 },
      documents: { max: 200 },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: true,
      aiVideoGen: false,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: true,
      apiAccess: true,
      whiteLabel: false,
      prioritySupport: true,
      whatsappBroadcast: true,
      telegramBot: true
    }
  },
  custom: {
    tier: "custom",
    label: "Custom",
    price: null,
    tagline: "Enterprise scale with white-label and video generation.",
    cta: "Contact sales",
    accent: "#0f172a",
    limits: {
      agents: { max: null },
      conversations: { max: null },
      messages: { max: null },
      posts: { max: null },
      documents: { max: null },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: true,
      aiVideoGen: true,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      whatsappBroadcast: true,
      telegramBot: true
    }
  }
};
const PLAN_ORDER = ["free", "lite", "pro", "custom"];
const minTierForLimit = (metric, requiredCount) => {
  for (const tier of PLAN_ORDER) {
    const { max } = PLAN_CONFIGS[tier].limits[metric];
    if (max === null || max >= requiredCount) return tier;
  }
  return null;
};

async function getCurrentUserProfile() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase.from("profiles").select(
    "id, email, plan, role, agents_count, conversations_count, messages_count, posts_count, documents_count, whatsapp_messages_count, telegram_messages_count, agent_type"
  ).eq("id", user.id).single();
  if (error || !profile) return null;
  return profile;
}
async function countUserLeads(userId) {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("owner_id", userId);
  return count ?? 0;
}
async function enforceLimitImpl(metric) {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Not authenticated");
  const config = PLAN_CONFIGS[profile.plan] ?? PLAN_CONFIGS.free;
  const { max } = config.limits[metric];
  if (max === null) return;
  if (metric === "leads") {
    const leadsCount = await countUserLeads(profile.id);
    if (leadsCount >= max) {
      const requiredTier = minTierForLimit(metric, leadsCount + 1);
      const err = new Error(
        `Plan limit reached: ${metric} (${leadsCount}/${max}) on the ${profile.plan} plan.` + (requiredTier ? ` Upgrade to ${requiredTier}.` : "")
      );
      err.name = "PlanLimitError";
      Object.assign(err, { metric, currentTier: profile.plan, requiredTier, used: leadsCount, max });
      throw err;
    }
    return;
  }
  const used = metric === "agents" ? profile.agents_count : metric === "conversations" ? profile.conversations_count : metric === "messages" ? profile.messages_count : metric === "posts" ? profile.posts_count : metric === "whatsappMessages" ? profile.whatsapp_messages_count ?? 0 : metric === "telegramMessages" ? profile.telegram_messages_count ?? 0 : profile.documents_count;
  if (used >= max) {
    const requiredTier = minTierForLimit(metric, used + 1);
    const maxLabel = max === null ? "unlimited" : String(max);
    const err = new Error(
      `Plan limit reached: ${metric} (${used}/${maxLabel}) on the ${profile.plan} plan.` + (requiredTier ? ` Upgrade to ${requiredTier}.` : "")
    );
    err.name = "PlanLimitError";
    Object.assign(err, {
      metric,
      currentTier: profile.plan,
      requiredTier,
      used,
      max
    });
    throw err;
  }
}

export { enforceLimitImpl, getCurrentUserProfile };
