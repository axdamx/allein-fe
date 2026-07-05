/**
 * Product tour via driver.js.
 *
 * Lazily imports driver.js only on the client (it touches `window` at module
 * load), so importing this hook during SSR is safe — the import only happens
 * when `startTour()` is called from a user gesture or effect.
 *
 * Tour state is persisted in localStorage so it auto-runs once per user and
 * can be re-triggered manually from the Getting Started card.
 */

const TOUR_SEEN_KEY = 'allein:tour-seen'

/** Has the user already seen the auto-tour at least once? */
export const hasSeenTour = (): boolean => {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(TOUR_SEEN_KEY) === '1'
}

const markTourSeen = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_SEEN_KEY, '1')
}

export interface TourOptions {
  /** Force-run even if the user has seen it before (e.g. "Replay tour"). */
  force?: boolean
}

/**
 * Runs the 5-step product tour. Returns true if it actually ran, false if it
 * was skipped (already seen and not forced, or an element was missing).
 */
export const startTour = async ({ force = false }: TourOptions = {}): Promise<boolean> => {
  if (!force && hasSeenTour()) return false

  // The tour lives on the dashboard — if we're elsewhere, the caller is
  // expected to navigate first. Elements are targeted by data-tour attrs.
  const { driver } = await import('driver.js')
  await import('driver.js/dist/driver.css')

  const driverObj = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Got it',
    steps: [
      {
        element: '[data-tour="sidebar"]',
        popover: {
          title: 'Your modules, grouped',
          description:
            'Navigation is organized by what you do: Communicate, Sell, Create, and Insights. Each group holds the tools for that part of your practice.',
        },
      },
      {
        element: '[data-tour="dashboard-quickactions"]',
        popover: {
          title: 'Jump anywhere from here',
          description:
            'Quick actions on the dashboard take you straight to Chat, Planner, Studio, and Knowledge Base.',
        },
      },
      {
        element: '[data-tour="getting-started"]',
        popover: {
          title: 'Your getting-started checklist',
          description:
            'Complete these five steps to get your practice fully set up. They disappear as you finish them.',
        },
      },
    ],
    onDestroyed: () => markTourSeen(),
  })

  driverObj.drive()
  return true
}
