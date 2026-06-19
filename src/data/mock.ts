import type { ComponentType } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Zap,
} from 'lucide-react'

export type AgentStatus = 'active' | 'idle' | 'error'

export interface Agent {
  id: string
  name: string
  type: string
  status: AgentStatus
  successRate: number
  tasksHandled: number
  lastActive: string
}

export interface Stat {
  id: string
  label: string
  value: string
  delta: number
  trend: 'up' | 'down'
  icon: ComponentType<{ className?: string }>
}

export interface ActivityItem {
  id: string
  actor: string
  action: string
  time: string
  icon: ComponentType<{ className?: string }>
}

export interface Conversation {
  id: string
  agent: string
  preview: string
  time: string
  unread: number
}

export const stats: Stat[] = [
  {
    id: 'agents',
    label: 'Active Agents',
    value: '12',
    delta: 2,
    trend: 'up',
    icon: Bot,
  },
  {
    id: 'tasks',
    label: 'Tasks Completed',
    value: '1,284',
    delta: 12.5,
    trend: 'up',
    icon: CheckCircle2,
  },
  {
    id: 'response',
    label: 'Avg Response',
    value: '1.2s',
    delta: 0.3,
    trend: 'down',
    icon: Zap,
  },
  {
    id: 'tokens',
    label: 'Tokens Used',
    value: '8.4M',
    delta: 8.1,
    trend: 'up',
    icon: Activity,
  },
]

export const agents: Agent[] = [
  {
    id: 'a1',
    name: 'Support Resolver',
    type: 'Customer Support',
    status: 'active',
    successRate: 98,
    tasksHandled: 412,
    lastActive: '2m ago',
  },
  {
    id: 'a2',
    name: 'Data Scout',
    type: 'Research',
    status: 'active',
    successRate: 94,
    tasksHandled: 289,
    lastActive: 'just now',
  },
  {
    id: 'a3',
    name: 'Inbox Triage',
    type: 'Automation',
    status: 'idle',
    successRate: 99,
    tasksHandled: 1032,
    lastActive: '14m ago',
  },
  {
    id: 'a4',
    name: 'Code Reviewer',
    type: 'Engineering',
    status: 'error',
    successRate: 87,
    tasksHandled: 76,
    lastActive: '1h ago',
  },
  {
    id: 'a5',
    name: 'Outreach Bot',
    type: 'Sales',
    status: 'active',
    successRate: 91,
    tasksHandled: 524,
    lastActive: '5m ago',
  },
]

export const activity: ActivityItem[] = [
  {
    id: 'ac1',
    actor: 'Support Resolver',
    action: 'resolved ticket #4821',
    time: '2m ago',
    icon: CheckCircle2,
  },
  {
    id: 'ac2',
    actor: 'Data Scout',
    action: 'finished a research run',
    time: '11m ago',
    icon: Activity,
  },
  {
    id: 'ac3',
    actor: 'System',
    action: 'deployed new agent version',
    time: '38m ago',
    icon: Zap,
  },
  {
    id: 'ac4',
    actor: 'Code Reviewer',
    action: 'failed on PR #221',
    time: '1h ago',
    icon: AlertTriangle,
  },
  {
    id: 'ac5',
    actor: 'Outreach Bot',
    action: 'onboarded a new lead',
    time: '2h ago',
    icon: UserPlus,
  },
]

export const conversations: Conversation[] = [
  {
    id: 'c1',
    agent: 'Support Resolver',
    preview: 'Sure, I can help with your billing question…',
    time: '2m',
    unread: 2,
  },
  {
    id: 'c2',
    agent: 'Data Scout',
    preview: 'Here are the 3 sources I found…',
    time: '11m',
    unread: 0,
  },
  {
    id: 'c3',
    agent: 'Inbox Triage',
    preview: 'Sorted 24 emails, 3 flagged.',
    time: '26m',
    unread: 0,
  },
  {
    id: 'c4',
    agent: 'Outreach Bot',
    preview: 'Sent follow-up to 8 prospects.',
    time: '1h',
    unread: 1,
  },
]

// 12-week traffic series for the mock chart.
export const traffic: number[] = [
  32, 40, 35, 52, 48, 60, 55, 68, 72, 65, 80, 88,
]

export const conversationSummary = [
  { label: 'Resolved', icon: MessageSquare, value: '4,210' },
  { label: 'In Progress', icon: Activity, value: '184' },
  { label: 'Escalated', icon: AlertTriangle, value: '12' },
]
