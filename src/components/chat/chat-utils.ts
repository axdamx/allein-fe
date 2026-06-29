export const formatTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return time
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + time
}
