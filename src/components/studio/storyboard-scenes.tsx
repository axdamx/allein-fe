/**
 * Sortable storyboard scene strip.
 *
 * Renders scenes as draggable cards (horizontal). Each card shows the scene's
 * image (or a placeholder while pending), an editable caption, duration, and
 * per-scene actions: generate image (reuses the GLM-Image pipeline), edit prompt,
 * delete. Drag-reorder persists via `reorderScenes`.
 *
 * Uses @dnd-kit with both pointer + keyboard sensors for accessibility.
 */
import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Trash2,
  Loader2,
  RefreshCw,
  ImageIcon,
  Plus,
  Pencil,
  Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  useUpsertScene,
  useDeleteScene,
  useReorderScenes,
} from '@/hooks/use-storyboard'
import { useGenerateImage } from '@/hooks/use-media'
import type { SceneRow } from '@/hooks/use-storyboard'

// ---------------------------------------------------------------------------
// Sortable scene card
// ---------------------------------------------------------------------------

const SortableScene = ({ scene, index }: { scene: SceneRow; index: number }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id })

  const upsertScene = useUpsertScene()
  const deleteScene = useDeleteScene()
  const imageGen = useGenerateImage()

  const [editing, setEditing] = useState(false)
  const [draftCaption, setDraftCaption] = useState(scene.caption)
  const [draftPrompt, setDraftPrompt] = useState(scene.prompt ?? '')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = () => {
    upsertScene.mutate({
      id: scene.id,
      storyboardId: scene.storyboard_id,
      caption: draftCaption,
      prompt: draftPrompt,
      durationMs: scene.duration_ms,
    })
    setEditing(false)
  }

  const handleGenerate = async () => {
    const prompt = scene.prompt || scene.caption
    if (!prompt.trim()) return
    const result = await imageGen.mutateAsync({
      prompt,
      // aspectRatio: storyboard-wide default (we don't have it here per-scene; image gen defaults 1:1)
    })
    if (result && 'id' in result && result.url) {
      upsertScene.mutate({
        id: scene.id,
        storyboardId: scene.storyboard_id,
        imageUrl: result.url,
        assetId: result.id,
      })
    }
  }

  const isBusy = imageGen.isPending || (upsertScene.isPending && editing)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border bg-card',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
      )}
    >
      {/* Drag handle */}
      <button
        className="absolute left-1 top-1 z-10 rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>

      {/* Scene number */}
      <Badge
        variant="secondary"
        className="absolute right-1 top-1 z-10 bg-background/80 text-[10px] backdrop-blur"
      >
        {index + 1}
      </Badge>

      {/* Image */}
      <div className="aspect-video w-full bg-muted">
        {scene.image_url ? (
          <img
            src={scene.image_url}
            alt={scene.caption}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {imageGen.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImageIcon className="size-6 opacity-30" />
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        {editing ? (
          <>
            <Textarea
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Caption / narration"
              rows={2}
              className="text-xs"
            />
            <Textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder="Image generation prompt"
              rows={2}
              className="text-xs"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={handleSave}
                disabled={isBusy}
              >
                <Check className="size-3" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="line-clamp-2 text-xs">{scene.caption || 'No caption'}</p>
            {scene.prompt && (
              <p className="line-clamp-2 text-[10px] text-muted-foreground">
                {scene.prompt}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">
              {(scene.duration_ms / 1000).toFixed(1)}s
            </span>

            <div className="mt-auto flex gap-1 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={handleGenerate}
                disabled={isBusy}
              >
                {imageGen.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : scene.image_url ? (
                  <RefreshCw className="size-3" />
                ) : (
                  <ImageIcon className="size-3" />
                )}
                {scene.image_url ? 'Regen' : 'Generate'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setDraftCaption(scene.caption)
                  setDraftPrompt(scene.prompt ?? '')
                  setEditing(true)
                }}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => deleteScene.mutate(scene.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Strip
// ---------------------------------------------------------------------------

export const StoryboardScenes = ({
  scenes,
  storyboardId,
}: {
  scenes: SceneRow[]
  storyboardId: string
}) => {
  const [localOrder, setLocalOrder] = useState<SceneRow[]>(scenes)
  const reorder = useReorderScenes()
  const upsertScene = useUpsertScene()

  // Keep local order in sync when server data changes (e.g. new scene added).
  // We compare by id-list to avoid clobbering an in-flight drag.
  const serverIds = scenes.map((s) => s.id).join(',')
  const localIds = localOrder.map((s) => s.id).join(',')
  if (serverIds !== localIds) {
    setLocalOrder(scenes)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.findIndex((s) => s.id === active.id)
    const newIndex = localOrder.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(next)
    reorder.mutate({
      storyboardId,
      sceneIds: next.map((s) => s.id),
    })
  }

  const handleAddScene = () => {
    upsertScene.mutate({
      storyboardId,
      caption: '',
      prompt: '',
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={localOrder.map((s) => s.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex items-start gap-3 overflow-x-auto pb-4">
          {localOrder.map((scene, i) => (
            <SortableScene key={scene.id} scene={scene} index={i} />
          ))}

          {/* Add scene card */}
          <button
            onClick={handleAddScene}
            disabled={upsertScene.isPending}
            className="flex w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {upsertScene.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Plus className="size-5" />
                Add scene
              </>
            )}
          </button>
        </div>
      </SortableContext>
    </DndContext>
  )
}
