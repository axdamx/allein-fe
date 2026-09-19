import type { PlanState } from '@/server/profile'

export interface MessageQuotaSnapshot {
  used: number
  remaining: number | null
}

/** Merge the authoritative post-consume quota returned by chat into the UI. */
export function patchMessageQuota(
  state: PlanState | undefined,
  quota: MessageQuotaSnapshot,
): PlanState | undefined {
  if (!state) return state

  return {
    ...state,
    usage: { ...state.usage, messages: quota.used },
    remaining: { ...state.remaining, messages: quota.remaining },
  }
}
