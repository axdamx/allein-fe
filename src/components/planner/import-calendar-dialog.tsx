import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useImportCalendarEvents } from '@/hooks/use-calendar-events'

export const ImportCalendarDialog = () => {
  const [open, setOpen] = useState(false)
  const [icsText, setIcsText] = useState('')
  const [fileName, setFileName] = useState('')
  const importEvents = useImportCalendarEvents()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setIcsText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!icsText.trim()) return
    importEvents.mutate(icsText, {
      onSuccess: (result) => {
        if (!('error' in result)) {
          setOpen(false)
          setIcsText('')
          setFileName('')
        }
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" /> Import Calendar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Calendar (ICS)</DialogTitle>
          <DialogDescription>
            Upload an .ics file exported from Google Calendar or Apple Calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".ics"
              onChange={handleFile}
              className="file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
            />
          </div>
          {fileName && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{icsText.length.toLocaleString()} characters loaded</p>
            </div>
          )}
          {icsText && icsText.length > 0 && !icsText.includes('BEGIN:VCALENDAR') && (
            <p className="text-xs text-red-500">This doesn't look like a valid ICS file.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={!icsText.trim() || !icsText.includes('BEGIN:VCALENDAR') || importEvents.isPending}
          >
            {importEvents.isPending && <Loader2 className="size-4 animate-spin" />}
            Import Events
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
