import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Brain, Calendar, MessageSquare, Sparkles } from 'lucide-react'

const ACTIONS = [
  {
    icon: MessageSquare,
    label: 'Ask your agent',
    description: 'Get help with a client or task',
    to: '/chat' as const,
    color: 'bg-[#F8D8C8] text-[#A54528]',
    disabled: false,
    badge: null,
  },
  {
    icon: Sparkles,
    label: 'Create content',
    description: 'Start a post or campaign',
    to: '/studio' as const,
    color: 'bg-[#E9D8F5] text-[#734F8D]',
    disabled: true,
    badge: 'Coming soon',
  },
  {
    icon: Calendar,
    label: 'Plan the week',
    description: 'Turn priorities into a plan',
    to: '/planner' as const,
    color: 'bg-[#F8E9B9] text-[#8A6A15]',
    disabled: false,
    badge: null,
  },
  {
    icon: Brain,
    label: 'Add knowledge',
    description: 'Ground AI in your documents',
    to: '/knowledge-base' as const,
    color: 'bg-[#E3F2D7] text-[#447534]',
    disabled: false,
    badge: null,
  },
]

export const QuickActions = () => (
  <section data-tour="dashboard-quickactions" className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17] sm:p-6">
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Move faster</p>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Quick actions</h2>
    </div>

    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {ACTIONS.map((action) => {
        const content = (
          <>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
            <action.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold">{action.label}</span>
            <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{action.description}</span>
          </span>
          {action.badge ? (
            <span className="rounded-full bg-[#F1663C]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.09em] text-[#C95735]">
              {action.badge}
            </span>
          ) : (
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F1663C]" />
          )}
          </>
        )

        return action.disabled ? (
          <div
            key={action.label}
            aria-disabled="true"
            title="Marketing Studio is coming soon"
            className="flex min-h-24 cursor-not-allowed items-center gap-3 rounded-2xl border border-dashed border-black/[0.07] bg-black/[0.015] p-3 opacity-65 dark:border-white/[0.08] dark:bg-white/[0.02]"
          >
            {content}
          </div>
        ) : (
          <Link
            key={action.label}
            to={action.to}
            className="group flex min-h-24 items-center gap-3 rounded-2xl border border-transparent bg-black/[0.025] p-3 transition-all hover:border-black/[0.06] hover:bg-white hover:shadow-sm dark:bg-white/[0.035] dark:hover:border-white/[0.07] dark:hover:bg-white/[0.06]"
          >
            {content}
          </Link>
        )
      })}
    </div>
  </section>
)
