type ReleasePermit = () => void

export function readConcurrencyLimit(
  name: string,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, maximum)
}

export function createSemaphore(limit: number) {
  let active = 0
  const waiters: Array<() => void> = []

  const acquire = () =>
    new Promise<ReleasePermit>((resolve) => {
      const grant = () => {
        active += 1
        let released = false

        resolve(() => {
          if (released) return
          released = true
          active -= 1
          waiters.shift()?.()
        })
      }

      if (active < limit) grant()
      else waiters.push(grant)
    })

  return async function withPermit<T>(task: () => Promise<T>): Promise<T> {
    const release = await acquire()

    try {
      return await task()
    } finally {
      release()
    }
  }
}
