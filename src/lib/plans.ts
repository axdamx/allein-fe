/**
 * Plan limits — the single source of truth for tier gating.
 *
 * Every feature that is metered or gated reads from this config. The server
 * enforces these in `enforceLimit()` (security) and the UI reads them via
 * `usePlan()` + `<FeatureGate>` (UX).
 *
 * Keep limits here in sync with the marketing copy on /pricing.
 */

export type PlanTier = 'free' | 'lite' | 'pro' | 'custom'

export type LimitMetric =
  | 'agents'
  | 'conversations'
  | 'messages'
  | 'posts'
  | 'documents'
  | 'leads'
  | 'whatsappMessages'
  | 'telegramMessages'

export interface PlanLimit {
  /** Maximum value for this metric. `null` = unlimited. */
  max: number | null
}

export interface PlanConfig {
  tier: PlanTier
  label: string
  /** Monthly price in USD. 0 for free, null for "contact sales". */
  price: number | null
  tagline: string
  /** Highlight on the pricing page. */
  featured?: boolean
  /** CTA shown on pricing cards. */
  cta: string
  limits: Record<LimitMetric, PlanLimit>
  /** Feature flags (boolean gates, not metered). */
  features: {
    crm: boolean
    clients: boolean
    marketingStudio: boolean
    aiImageGen: boolean
    aiVideoGen: boolean
    ragDocuments: boolean
    scheduledPosts: boolean
    teamSeats: boolean
    apiAccess: boolean
    whiteLabel: boolean
    prioritySupport: boolean
    whatsappBroadcast: boolean
    telegramBot: boolean
  }
  /** Accent color for badges / highlights. */
  accent: string
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    label: 'Free',
    price: 0,
    tagline: 'Explore the platform with one AI agent.',
    cta: 'Get started',
    accent: '#64748b',
    limits: {
      agents: { max: 1 },
      conversations: { max: 10 },
      messages: { max: 100 },
      posts: { max: 5 },
      documents: { max: 3 },
      leads: { max: 10 },
      whatsappMessages: { max: 0 },
      telegramMessages: { max: 0 },
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
      telegramBot: false,
    },
  },
  lite: {
    tier: 'lite',
    label: 'Lite',
    price: 29,
    tagline: 'For solo operators running a single agent type.',
    cta: 'Choose Lite',
    accent: '#3b82f6',
    limits: {
      agents: { max: 3 },
      conversations: { max: 100 },
      messages: { max: 2000 },
      posts: { max: 30 },
      documents: { max: 25 },
      leads: { max: 500 },
      whatsappMessages: { max: 50 },
      telegramMessages: { max: 100 },
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
      telegramBot: true,
    },
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    price: 99,
    tagline: 'Full power — all agent types, marketing studio, and RAG.',
    cta: 'Choose Pro',
    featured: true,
    accent: '#6366f1',
    limits: {
      agents: { max: 10 },
      conversations: { max: null }, // unlimited
      messages: { max: null },
      posts: { max: 150 },
      documents: { max: 200 },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null },
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
      telegramBot: true,
    },
  },
  custom: {
    tier: 'custom',
    label: 'Custom',
    price: null,
    tagline: 'Enterprise scale with white-label and video generation.',
    cta: 'Contact sales',
    accent: '#0f172a',
    limits: {
      agents: { max: null },
      conversations: { max: null },
      messages: { max: null },
      posts: { max: null },
      documents: { max: null },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null },
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
      telegramBot: true,
    },
  },
}

/** Ordered list of tiers for rendering pricing tables / upgrade flows. */
export const PLAN_ORDER: PlanTier[] = ['free', 'lite', 'pro', 'custom']

export type FeatureKey = keyof PlanConfig['features']

/**
 * Returns true if `from` tier is lower than `to` tier.
 * Used to determine if an upgrade is required.
 */
export const isHigherTier = (from: PlanTier, to: PlanTier): boolean => {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from)
}

/**
 * Returns the minimum tier that includes a given feature.
 * Returns null if no tier has the feature (shouldn't happen).
 */
export const minTierForFeature = (feature: FeatureKey): PlanTier | null => {
  for (const tier of PLAN_ORDER) {
    if (PLAN_CONFIGS[tier].features[feature]) return tier
  }
  return null
}

/**
 * Returns the minimum tier that has at least `requiredCount` of a metric.
 * Used for upgrade prompts when a limit is hit.
 */
export const minTierForLimit = (
  metric: LimitMetric,
  requiredCount: number,
): PlanTier | null => {
  for (const tier of PLAN_ORDER) {
    const { max } = PLAN_CONFIGS[tier].limits[metric]
    if (max === null || max >= requiredCount) return tier
  }
  return null
}
