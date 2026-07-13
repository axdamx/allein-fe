/**
 * Animated "agent is typing" indicator — three bouncing dots.
 *
 * Used in the streaming/thinking state of both the CRM and Studio message
 * bubbles, before the first chunk of text arrives. More conversational and
 * less mechanical than a spinner.
 *
 * The bounce animation is defined as `.typing-dot` in `src/index.css`
 * (`typing-bounce` keyframe).
 */
import { cn } from '@/lib/utils'

export const TypingIndicator = ({ className }: { className?: string }) => {
  return (
    <span
      className={cn('inline-flex items-center gap-1 py-1', className)}
      aria-label="Assistant is thinking"
      role="status"
    >
      <span
        className="typing-dot size-2 rounded-full bg-current opacity-40"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="typing-dot size-2 rounded-full bg-current opacity-40"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="typing-dot size-2 rounded-full bg-current opacity-40"
        style={{ animationDelay: '300ms' }}
      />
    </span>
  )
}
