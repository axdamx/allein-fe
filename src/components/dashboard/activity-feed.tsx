import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { activity } from '@/data/mock'

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>What your agents have been up to</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {activity.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id} className="relative flex gap-3">
                <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{item.actor}</span>{' '}
                    <span className="text-muted-foreground">
                      {item.action}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
