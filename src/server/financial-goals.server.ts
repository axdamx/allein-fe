import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export type GoalStatus = 'active' | 'completed' | 'cancelled'
export type GoalCategory = 'savings' | 'investment' | 'revenue' | 'debt_payoff' | 'custom'

export interface FinancialGoalRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  category: GoalCategory
  target_amount: number
  current_amount: number
  currency: string
  timeframe: string
  deadline: string | null
  status: GoalStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateGoalInput {
  title: string
  description?: string
  category: GoalCategory
  targetAmount: number
  currentAmount?: number
  currency?: string
  timeframe: string
  deadline?: string
}

export interface UpdateGoalInput {
  goalId: string
  title?: string
  description?: string
  category?: GoalCategory
  targetAmount?: number
  currentAmount?: number
  currency?: string
  timeframe?: string
  deadline?: string | null
  status?: GoalStatus
  sortOrder?: number
}

const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1 month',
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
  '2y': '2 years',
  '5y': '5 years',
}

export function getTimeframeLabel(timeframe: string): string {
  return TIMEFRAME_MAP[timeframe] ?? timeframe
}

export async function getGoalsImpl(): Promise<FinancialGoalRow[] | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('owner_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return data as unknown as FinancialGoalRow[]
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load goals' }
  }
}

export async function createGoalImpl(
  input: CreateGoalInput,
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        owner_id: user.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        target_amount: input.targetAmount,
        current_amount: input.currentAmount ?? 0,
        currency: input.currency ?? 'USD',
        timeframe: input.timeframe,
        deadline: input.deadline ?? null,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { id: data.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create goal' }
  }
}

export async function updateGoalImpl(
  input: UpdateGoalInput,
): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const updates: Record<string, string | number | null> = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.category !== undefined) updates.category = input.category
    if (input.targetAmount !== undefined) updates.target_amount = input.targetAmount
    if (input.currentAmount !== undefined) updates.current_amount = input.currentAmount
    if (input.currency !== undefined) updates.currency = input.currency
    if (input.timeframe !== undefined) updates.timeframe = input.timeframe
    if (input.deadline !== undefined) updates.deadline = input.deadline
    if (input.status !== undefined) updates.status = input.status
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

    const { error } = await supabase
      .from('financial_goals')
      .update(updates)
      .eq('id', input.goalId)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update goal' }
  }
}

export async function deleteGoalImpl(
  goalId: string,
): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId)
    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete goal' }
  }
}
