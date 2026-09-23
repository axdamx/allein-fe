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
  | 'imageGen'

export type LimitWindow = 'lifetime' | 'day' | 'month'

export interface PlanLimit {
  /** Maximum value for this metric. `null` = unlimited. */
  max: number | null
  /**
   * Reset window for this metric.
   * - 'lifetime': counter never resets (e.g. max agents). Enforced at create-time.
   * - 'day':      resets every local calendar day. Enforced atomically per
   *               operation via try_consume (see usage_windows table).
   * - 'month':    resets on the first day of the next Malaysia calendar month.
   * Defaults to 'lifetime' for backward compatibility.
   */
  window?: LimitWindow
}

export interface PlanConfig {
  tier: PlanTier
  label: string
  /** Monthly price in MYR (RM). 0 for free, null for "contact sales". */
  price: number | null
  /** Currency symbol prefix used in display. Always 'RM' for now. */
  currency: string
  /** Display label for the billing period, e.g. '/month' or 'forever'. */
  period: string
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

/**
 * Formats a plan's price for display. Single source of truth so every
 * pricing surface (landing, /pricing, upgrade modal, settings) stays
 * consistent. Mirrors the landing-page copy: 'RM0', 'RM99', 'RM249',
 * 'Custom'.
 *
 * Pass `withPeriod: true` to append the billing period (e.g. 'RM99 /month').
 */
export function formatPrice(
  plan: Pick<PlanConfig, 'price' | 'currency' | 'period'>,
  withPeriod = false,
): string {
  const { price, currency, period } = plan
  if (price === null) return 'Custom'
  const amount = `${currency}${price.toLocaleString()}`
  if (!withPeriod) return amount
  // Free shows 'forever' on the landing page; paid shows '/month'.
  if (price === 0) return `${amount} ${period}`
  return `${amount} ${period}`
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    label: 'Free',
    price: 0,
    currency: 'RM',
    period: 'forever',
    tagline: 'Try the full experience, forever.',
    cta: 'Start free',
    accent: '#64748b',
    limits: {
      agents: { max: 1 },
      conversations: { max: 10 },
      messages: { max: 10, window: 'day' },
      posts: { max: 3, window: 'day' },
      documents: { max: 3 },
      leads: { max: 10 },
      whatsappMessages: { max: 0, window: 'day' },
      telegramMessages: { max: 0, window: 'day' },
      imageGen: { max: 0, window: 'month' },
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: false,
      aiVideoGen: false,
      ragDocuments: true,
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
    price: 99,
    currency: 'RM',
    period: '/month',
    tagline: 'For solo agents getting started.',
    cta: 'Choose Lite',
    accent: '#3b82f6',
    limits: {
      agents: { max: 3 },
      conversations: { max: 100 },
      messages: { max: 30, window: 'day' },
      posts: { max: 30, window: 'day' },
      documents: { max: 25 },
      leads: { max: 100 },
      whatsappMessages: { max: 50, window: 'day' },
      telegramMessages: { max: 100, window: 'day' },
      imageGen: { max: 0, window: 'month' },
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
    price: 249,
    currency: 'RM',
    period: '/month',
    tagline: 'For agents running a real practice.',
    cta: 'Choose Pro',
    featured: true,
    accent: '#6366f1',
    limits: {
      agents: { max: 10 },
      conversations: { max: null }, // unlimited
      messages: { max: null, window: 'day' },
      posts: { max: 150, window: 'day' },
      documents: { max: 200 },
      leads: { max: null },
      whatsappMessages: { max: null, window: 'day' },
      telegramMessages: { max: null, window: 'day' },
      imageGen: { max: 100, window: 'month' },
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
    price: 799,
    currency: 'RM',
    period: '+/month',
    tagline: 'For agencies & teams.',
    cta: 'Contact us',
    accent: '#0f172a',
    limits: {
      agents: { max: null },
      conversations: { max: null },
      messages: { max: null, window: 'day' },
      posts: { max: null, window: 'day' },
      documents: { max: null },
      leads: { max: null },
      whatsappMessages: { max: null, window: 'day' },
      telegramMessages: { max: null, window: 'day' },
      imageGen: { max: 500, window: 'month' },
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
