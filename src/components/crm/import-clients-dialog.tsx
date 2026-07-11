import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Download, FileUp, Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBulkCreateClients } from '@/hooks/use-clients'
import { mapCsvRow, normalizeHeader, TEMPLATE_CSV } from '@/lib/client-csv'
import type { CreateClientInput } from '@/server/clients'

const MAX_IMPORT_ROWS = 500
const PREVIEW_ROWS = 5

/**
 * CSV import dialog for clients.
 *
 * Flow: pick file → parse client-side (Papa Parse) → preview mapped rows →
 * confirm → bulk insert via server fn.
 */
export const ImportClientsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkImport = useBulkCreateClients()

  const [parsedClients, setParsedClients] = useState<CreateClientInput[]>([])
  const [skipped, setSkipped] = useState(0)
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setParsedClients([])
    setSkipped(0)
    setUnmappedHeaders([])
    setFileName(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setError(
            `Could not parse CSV: ${result.errors[0].message}. Try downloading our template.`,
          )
          return
        }

        const rawRows = result.data
        if (rawRows.length === 0) {
          setError('The file has no rows.')
          return
        }

        // Detect unmapped headers from the first row for the preview UI.
        const headerKeys = result.meta.fields ?? Object.keys(rawRows[0])
        const unmapped = headerKeys
          .filter((h) => normalizeHeader(h) === null)
          .map((h) => h.trim())
        setUnmappedHeaders(unmapped)

        // Map every row; rows without a name count as skipped.
        const clients: CreateClientInput[] = []
        let skipCount = 0
        for (const raw of rawRows.slice(0, MAX_IMPORT_ROWS)) {
          const { client } = mapCsvRow(raw)
          if (client) clients.push(client)
          else skipCount++
        }

        const overflow = rawRows.length - MAX_IMPORT_ROWS
        if (overflow > 0) skipCount += overflow

        setParsedClients(clients)
        setSkipped(skipCount)
      },
      error: (err) => {
        setError(`Could not read file: ${err.message}`)
      },
    })
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (parsedClients.length === 0) return
    await bulkImport.mutateAsync(parsedClients)
    reset()
    onOpenChange(false)
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const previewRows = parsedClients.slice(0, PREVIEW_ROWS)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] max-w-2xl flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import clients from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with a <code>name</code> column. Other columns
            (email, phone, company, industry, status, notes, tags) are
            optional.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body — file picker or preview */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
          {/* File picker / parse error */}
          {parsedClients.length === 0 && (
            <div className="space-y-3">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                {fileName ? (
                  <>
                    <FileUp className="size-7 text-muted-foreground" />
                    <p className="text-sm font-medium">{fileName}</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-7 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click to choose a CSV file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max {MAX_IMPORT_ROWS} rows per import
                    </p>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="mr-1 size-3.5" />
                  Download template
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedClients.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">
                  {parsedClients.length} ready to import
                </span>
                {skipped > 0 && (
                  <span className="text-muted-foreground">
                    · {skipped} skipped
                  </span>
                )}
              </div>

              {unmappedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ignored unrecognised columns:{' '}
                  {unmappedHeaders.join(', ')}
                </p>
              )}

              <div className="w-full min-w-0 overflow-x-auto rounded-lg border">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Name</TableHead>
                      <TableHead className="w-[30%]">Email</TableHead>
                      <TableHead className="w-[20%]">Phone</TableHead>
                      <TableHead className="w-[20%]">Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="truncate font-medium">
                          {c.name}
                        </TableCell>
                        <TableCell className="truncate text-muted-foreground">
                          {c.email ?? '—'}
                        </TableCell>
                        <TableCell className="truncate text-muted-foreground">
                          {c.phone ?? '—'}
                        </TableCell>
                        <TableCell className="truncate text-muted-foreground">
                          {c.company ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedClients.length > PREVIEW_ROWS && (
                <p className="text-xs text-muted-foreground">
                  Showing first {PREVIEW_ROWS} of {parsedClients.length} rows.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          {parsedClients.length > 0 ? (
            <>
              <Button
                variant="outline"
                onClick={reset}
                disabled={bulkImport.isPending}
              >
                Choose different file
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedClients.length === 0 || bulkImport.isPending}
              >
                {bulkImport.isPending ? (
                  <>
                    <Loader2 className="mr-1 size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>Import {parsedClients.length} clients</>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
