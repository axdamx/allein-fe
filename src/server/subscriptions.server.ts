import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { safeError, sanitizeSupabaseMessage } from '@/server/_errors'
import type { PlanTier } from '@/lib/plans'
import type {
  SubscriptionRecord,
  SubscriptionState,
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
  AdminUserSubscriptionResult,
  MutationResult,
} from '@/lib/subscriptions'

/** Resolve the caller. Throws (caught by callers) if not authenticated. */
async function requireUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

/** Require that the caller is an admin OR acting on their own account.
 *  Returns the caller + the target user id (resolved to caller for self-serve). */
async function requireAdminOrSelf(targetUserId?: string) {
  const { supabase, user } = await requireUser()

  if (!targetUserId || targetUserId === user.id) {
    return { supabase, caller: user, targetUserId: user.id, isAdmin: false }
  }

  // Acting on another user — require admin.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
    throw new Error('Admin access required')
  }
  return { supabase, caller: user, targetUserId, isAdmin: true }
}

function toSubscriptionRecord(
  row: Record<string, unknown> | null,
): SubscriptionRecord | null {
  if (!row) return null
  return {
    id: row.id as string,
    status: row.status as SubscriptionRecord['status'],
    plan_tier: row.plan_tier as PlanTier,
    current_period_end: row.current_period_end as string | null,
    cancel_at_period_end: row.cancel_at_period_end as boolean,
    canceled_at: row.canceled_at as string | null,
    cancel_reason: row.cancel_reason as string | null,
  }
}

function computeDaysUntil(periodEnd: string | null): number | null {
  if (!periodEnd) return null
  const ms = new Date(periodEnd).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function defaultPeriodEnd(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
}

export async function getSubscriptionStateImpl(): Promise<SubscriptionState> {
  try {
    const { supabase, user } = await requireUser()

    const [{ data: profile }, { data: subRow }] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase
        .from('subscriptions')
        .select(
          'id, status, plan_tier, current_period_end, cancel_at_period_end, canceled_at, cancel_reason',
        )
        .eq('user_id', user.id)
        .in('status', ['active', 'canceled_pending', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const plan = (profile?.plan ?? 'free') as PlanTier
    const subscription = toSubscriptionRecord(
      subRow as Record<string, unknown> | null,
    )

    if (!subscription) {
      return {
        status: 'none',
        plan,
        subscription: null,
        isCanceledPending: false,
        isCanceled: false,
        daysUntilPeriodEnd: null,
      }
    }

    return {
      status: subscription.status as SubscriptionState['status'],
      plan,
      subscription,
      isCanceledPending: subscription.status === 'canceled_pending',
      isCanceled: subscription.status === 'canceled',
      daysUntilPeriodEnd: computeDaysUntil(subscription.current_period_end),
    }
  } catch {
    // Read fns in this codebase degrade to a safe default rather than throwing.
    return {
      status: 'none',
      plan: 'free',
      subscription: null,
      isCanceledPending: false,
      isCanceled: false,
      daysUntilPeriodEnd: null,
    }
  }
}

/** Shared write step for cancel (used for both pre-existing and synthesized rows). */
async function runCancel(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  args: {
    subId: string
    userId: string
    oldPlan: PlanTier
    currentPeriodEnd: string | null
    immediate: boolean
    reason?: string
    actorId: string
  },
): Promise<MutationResult> {
  const effectiveAt = new Date().toISOString()
  const newPeriodEnd =
    args.immediate || !args.currentPeriodEnd
      ? (args.currentPeriodEnd ?? defaultPeriodEnd())
      : args.currentPeriodEnd

  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: args.immediate ? 'canceled' : 'canceled_pending',
      cancel_at_period_end: !args.immediate,
      canceled_at: effectiveAt,
      canceled_by: args.actorId,
      cancel_reason: args.reason ?? null,
      current_period_end: newPeriodEnd,
    })
    .eq('id', args.subId)
  if (subErr)
    return {
      error: sanitizeSupabaseMessage(
        subErr.message,
        'Failed to cancel subscription',
      ),
    }

  // Flip plan immediately only for immediate cancel.
  if (args.immediate) {
    const { error: planErr } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', args.userId)
    if (planErr)
      return {
        error: sanitizeSupabaseMessage(planErr.message, 'Failed to update plan'),
      }
  }

  const { error: evErr } = await supabase.from('subscription_events').insert({
    user_id: args.userId,
    actor_id: args.actorId,
    event_type: args.immediate ? 'immediate_downgrade' : 'canceled',
    reason: args.reason ?? null,
    old_plan: args.oldPlan,
    new_plan: args.immediate ? 'free' : args.oldPlan,
    effective_at: effectiveAt,
    metadata: { immediate: args.immediate },
  })
  if (evErr)
    return {
      error: sanitizeSupabaseMessage(evErr.message, 'Failed to log event'),
    }

  return null
}

export async function cancelSubscriptionImpl(
  input: CancelSubscriptionInput,
): Promise<MutationResult> {
  try {
    const { supabase, caller, targetUserId, isAdmin } =
      await requireAdminOrSelf(input.targetUserId)

    // Owner self-protection: an admin cannot cancel another admin/owner's sub.
    if (isAdmin) {
      const { data: target } = await supabase
        .from('profiles')
        .select('role, plan')
        .eq('id', targetUserId)
        .single()
      if (!target) return { error: 'User not found' }
      if (target.role === 'owner' || target.role === 'admin') {
        return { error: 'Cannot cancel an admin or owner subscription' }
      }
      if (target.plan === 'free')
        return { error: 'User is already on the Free plan' }
    }

    // Load the active subscription row.
    const { data: sub, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, status, plan_tier, current_period_end')
      .eq('user_id', targetUserId)
      .in('status', ['active', 'canceled_pending', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loadErr)
      return {
        error: sanitizeSupabaseMessage(
          loadErr.message,
          'Failed to load subscription',
        ),
      }

    if (!sub) {
      // No subscription row. If the user is on a paid plan, synthesize one; else bail.
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', targetUserId)
        .single()
      if (!profile || profile.plan === 'free') {
        return { error: 'No active subscription to cancel' }
      }
      const { data: created, error: createErr } = await supabase
        .from('subscriptions')
        .insert({
          user_id: targetUserId,
          status: 'active',
          plan_tier: profile.plan,
          current_period_end: defaultPeriodEnd(),
          cancel_at_period_end: false,
        })
        .select('id, plan_tier, current_period_end')
        .single()
      if (createErr || !created) {
        return {
          error: sanitizeSupabaseMessage(
            createErr?.message ?? 'Failed to create subscription',
            'Operation failed',
          ),
        }
      }
      return runCancel(supabase, {
        subId: created.id,
        userId: targetUserId,
        oldPlan: created.plan_tier as PlanTier,
        currentPeriodEnd: created.current_period_end as string | null,
        immediate: input.immediate,
        reason: input.reason,
        actorId: caller.id,
      })
    }

    if (sub.status === 'canceled')
      return { error: 'Subscription is already canceled' }

    return runCancel(supabase, {
      subId: sub.id,
      userId: targetUserId,
      oldPlan: sub.plan_tier as PlanTier,
      currentPeriodEnd: sub.current_period_end as string | null,
      immediate: input.immediate,
      reason: input.reason,
      actorId: caller.id,
    })
  } catch (err) {
    return { error: safeError(err, 'Failed to cancel subscription') }
  }
}

export async function reactivateSubscriptionImpl(
  input: ReactivateSubscriptionInput,
): Promise<MutationResult> {
  try {
    const { supabase, caller, targetUserId } = await requireAdminOrSelf(
      input.targetUserId,
    )

    const { data: sub, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, status, plan_tier')
      .eq('user_id', targetUserId)
      .in('status', ['active', 'canceled_pending', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loadErr)
      return {
        error: sanitizeSupabaseMessage(
          loadErr.message,
          'Failed to load subscription',
        ),
      }
    if (!sub) return { error: 'No subscription found' }
    if (sub.status !== 'canceled_pending') {
      return { error: 'Only a pending cancellation can be reactivated' }
    }

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        canceled_by: null,
        cancel_reason: null,
      })
      .eq('id', sub.id)
    if (updErr)
      return {
        error: sanitizeSupabaseMessage(updErr.message, 'Failed to reactivate'),
      }

    const { error: evErr } = await supabase.from('subscription_events').insert({
      user_id: targetUserId,
      actor_id: caller.id,
      event_type: 'reactivated',
      old_plan: sub.plan_tier,
      new_plan: sub.plan_tier,
      effective_at: new Date().toISOString(),
      metadata: { immediate: false },
    })
    if (evErr)
      return {
        error: sanitizeSupabaseMessage(evErr.message, 'Failed to log event'),
      }

    return null
  } catch (err) {
    return { error: safeError(err, 'Failed to reactivate subscription') }
  }
}

export async function adminGetUserSubscriptionImpl(input: {
  userId: string
}): Promise<AdminUserSubscriptionResult | { error: string }> {
  try {
    const { supabase, user } = await requireUser()
    const { data: caller } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return { error: 'Admin access required' }
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select(
        'id, status, plan_tier, current_period_end, cancel_at_period_end, canceled_at, cancel_reason',
      )
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: events } = await supabase
      .from('subscription_events')
      .select('id, event_type, reason, old_plan, new_plan, effective_at, created_at')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      subscription: toSubscriptionRecord(
        sub as Record<string, unknown> | null,
      ),
      recentEvents:
        (events ?? []) as AdminUserSubscriptionResult['recentEvents'],
    }
  } catch (err) {
    return { error: safeError(err, 'Failed to load subscription') }
  }
}

/** App-level fallback for the pg_cron sweep. Call lazily from getSubscriptionStateImpl.
 *  Only runs if pg_cron is unavailable in the environment. */
export async function sweepExpiredCancellationsImpl(): Promise<void> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: expired } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('status', 'canceled_pending')
      .not('current_period_end', 'is', null)
      .lte('current_period_end', new Date().toISOString())

    for (const row of expired ?? []) {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', row.user_id)
        .neq('plan', 'free')
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', row.id)
      await supabase.from('subscription_events').insert({
        user_id: row.user_id,
        actor_id: row.user_id,
        event_type: 'plan_changed',
        new_plan: 'free',
        effective_at: new Date().toISOString(),
        metadata: { source: 'app_level_sweep' },
      })
    }
  } catch {
    // Non-fatal — sweep is best-effort.
  }
}
