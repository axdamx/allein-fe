import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { traffic } from '@/data/mock'

const W = 640
const H = 220
const PAD = 24

export function TrafficChart() {
  const max = Math.max(...traffic)
  const min = Math.min(...traffic)
  const range = max - min || 1
  const stepX = (W - PAD * 2) / (traffic.length - 1)

  const points = traffic.map((value, i) => {
    const x = PAD + i * stepX
    const y = H - PAD - ((value - min) / range) * (H - PAD * 2)
    return [x, y] as const
  })

  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')

  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Agent Traffic</CardTitle>
        <CardDescription>Requests handled per week (last 12 weeks)</CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Agent traffic over the last 12 weeks"
        >
          <defs>
            <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#traffic-fill)" />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--chart-1)" />
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}
