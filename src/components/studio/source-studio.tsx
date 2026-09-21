import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteStudioSource, usePreviewStudioSourceCandidate, useSaveStudioSource, useStudioSourceCandidates, useStudioSources } from '@/hooks/use-studio-sources'
import type { StudioSource, StudioSourceKind } from '@/server/studio-sources'

export function SourceStudio() {
  const { data: sources, isLoading, error: sourcesError } = useStudioSources()
  const { data: candidates, error: candidatesError } = useStudioSourceCandidates()
  const preview = usePreviewStudioSourceCandidate()
  const save = useSaveStudioSource()
  const remove = useDeleteStudioSource()
  const [editing, setEditing] = useState<string | null>(null)
  const [kind, setKind] = useState<StudioSourceKind>('listing')
  const [title, setTitle] = useState('')
  const [facts, setFacts] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [approved, setApproved] = useState(false)
  const [candidateKey, setCandidateKey] = useState('')

  const reset = () => { setEditing(null); setKind('listing'); setTitle(''); setFacts(''); setReferenceUrl(''); setApproved(false) }
  const edit = (source: StudioSource) => {
    setEditing(source.id); setKind(source.kind); setTitle(source.title); setFacts(source.facts)
    setReferenceUrl(source.reference_url ?? ''); setApproved(false)
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await save.mutateAsync({ id: editing ?? undefined, kind, title, facts, referenceUrl, approved })
    if (!('error' in result)) reset()
  }
  const importCandidate = async () => {
    const candidate = candidates?.find((item) => `${item.kind}:${item.id}` === candidateKey)
    if (!candidate) return
    try {
      const result = await preview.mutateAsync({ id: candidate.id, kind: candidate.kind })
      if ('error' in result) return
      setEditing(null); setKind(result.kind); setTitle(result.title); setFacts(result.facts)
      setReferenceUrl(result.referenceUrl ?? ''); setApproved(false)
    } catch {
      // The hook displays the error toast.
    }
  }

  return <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
    <Card><CardHeader><CardTitle className="text-base">{editing ? 'Edit source' : 'Add source facts'}</CardTitle><CardDescription>Curate public facts from a listing, CRM record, or knowledge source. Review them before approving them for Studio drafts.</CardDescription></CardHeader>
      <CardContent><form onSubmit={submit} className="space-y-4">
        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
          <Label>Start from an existing record</Label>
          <div className="flex gap-2"><Select value={candidateKey} onValueChange={setCandidateKey}><SelectTrigger><SelectValue placeholder="Choose a document or client" /></SelectTrigger><SelectContent>
            {(candidates ?? []).map((candidate) => <SelectItem key={`${candidate.kind}:${candidate.id}`} value={`${candidate.kind}:${candidate.id}`}>{candidate.kind === 'knowledge' ? 'Document' : 'Client'} · {candidate.title}</SelectItem>)}
          </SelectContent></Select><Button type="button" variant="outline" disabled={!candidateKey || preview.isPending} onClick={importCandidate}>{preview.isPending ? 'Loading…' : 'Use'}</Button></div>
          {candidatesError && <p className="text-xs text-destructive">{candidatesError.message}</p>}
          <p className="text-xs text-muted-foreground">This copies an excerpt or company profile into a new draft. Trim private details and approve it before use.</p>
        </div>
        <div className="space-y-2"><Label>Source type</Label><Select value={kind} onValueChange={(value) => setKind(value as StudioSourceKind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="listing">Listing</SelectItem><SelectItem value="crm">CRM</SelectItem><SelectItem value="knowledge">Knowledge</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="source-title">Title</Label><Input id="source-title" maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. New launch in Kuala Lumpur" /></div>
        <div className="space-y-2"><Label htmlFor="source-facts">Facts approved for public posts</Label><Textarea id="source-facts" rows={7} maxLength={4000} required value={facts} onChange={(event) => setFacts(event.target.value)} placeholder="Paste only verified, public-facing facts. Leave out customer contact details and private notes." /></div>
        <div className="space-y-2"><Label htmlFor="source-url">Reference link (optional)</Label><Input id="source-url" type="text" inputMode="url" maxLength={500} value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={approved} onChange={(event) => setApproved(event.target.checked)} /><span>I reviewed these facts and approve them for public post drafts.{editing ? ' Confirm again after editing.' : ''}</span></label>
        <div className="flex gap-2"><Button type="submit" disabled={save.isPending || !title.trim() || !facts.trim()}><Plus className="size-4" />{editing ? 'Save source' : 'Add source'}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
      </form></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Source library</CardTitle><CardDescription>Only approved entries can be selected in Create or Planner. Editing a source requires reviewing the draft again.</CardDescription></CardHeader><CardContent className="space-y-3">
      {sourcesError ? <p className="text-sm text-destructive">{sourcesError.message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading sources…</p> : !sources?.length ? <p className="text-sm text-muted-foreground">No sources yet.</p> : sources.map((source) => <div key={source.id} className="rounded-xl border p-3">
        <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{source.title}</p><div className="mt-1 flex gap-1"><Badge variant="outline" className="capitalize">{source.kind}</Badge><Badge variant={source.approved_at ? 'secondary' : 'outline'}>{source.approved_at ? 'Approved' : 'Unapproved'}</Badge></div></div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${source.title}`} onClick={() => edit(source)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${source.title}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete ${source.title}? Saved posts keep their source snapshot.`)) remove.mutate(source.id) }}><Trash2 className="size-4" /></Button></div></div>
        <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{source.facts}</p>
        {source.reference_url && <a href={source.reference_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">Open reference</a>}
      </div>)}
    </CardContent></Card>
  </div>
}
