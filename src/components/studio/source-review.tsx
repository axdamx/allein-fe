import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import type { StudioSourceSnapshot } from '@/server/studio-sources'
import { useStudioSources } from '@/hooks/use-studio-sources'

export function StudioSourcePicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const { data: sources, isLoading } = useStudioSources()
  const approved = sources?.filter((source) => source.approved_at) ?? []
  return <div className="space-y-2 rounded-xl border p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">Approved source facts</p>
      <Link to="/studio/sources" className="text-xs text-primary underline-offset-4 hover:underline">Manage sources</Link>
    </div>
    <p className="text-xs text-muted-foreground">Select up to five facts to ground this draft. Only selected facts are sent to AI.</p>
    {isLoading ? <p className="text-xs text-muted-foreground">Loading sources…</p> : approved.length === 0 ?
      <p className="text-xs text-muted-foreground">No approved facts yet. Add and approve a source in the Sources tab.</p> :
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {approved.map((source) => <label key={source.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm">
          <input type="checkbox" className="mt-1" checked={selectedIds.includes(source.id)} disabled={!selectedIds.includes(source.id) && selectedIds.length >= 5}
            onChange={(event) => onChange(event.target.checked ? [...selectedIds, source.id] : selectedIds.filter((id) => id !== source.id))} />
          <span className="min-w-0"><span className="font-medium">{source.title}</span> <Badge variant="outline" className="ml-1 capitalize">{source.kind}</Badge><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{source.facts}</span></span>
        </label>)}
      </div>}
    {selectedIds.filter((id) => !approved.some((source) => source.id === id)).map((id) =>
      <button key={id} type="button" className="text-xs text-destructive underline" onClick={() => onChange(selectedIds.filter((selected) => selected !== id))}>Remove unavailable source</button>)}
  </div>
}

export function StudioSourceReview({ sources }: { sources: StudioSourceSnapshot[] }) {
  return <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
    <p className="text-sm font-medium">Review source facts</p>
    {sources.length === 0 ? <p className="text-xs text-muted-foreground">No approved facts were selected. Check any specific claims in the draft before saving.</p> :
      <div className="space-y-2">{sources.map((source) => <div key={source.id} className="rounded-lg border bg-background p-2">
        <div className="flex items-center gap-2"><span className="text-xs font-medium">{source.title}</span><Badge variant="outline" className="capitalize">{source.kind}</Badge></div>
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{source.facts}</p>
        {source.reference_url && <a href={source.reference_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">Open reference</a>}
      </div>)}</div>}
    <p className="text-xs text-muted-foreground">Compare the caption with these facts and edit any unsupported claim before saving.</p>
  </div>
}
