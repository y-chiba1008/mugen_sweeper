import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useGame } from '../context/GameContext'
import type { SerializedCell } from '../db/types'
import { cellToSerialized } from '../utils/chunkUtils'
import {
  drawMinimap,
  drawViewportIndicator,
  getMinimapLayout,
  getMinimapMaxDimensions,
  minimapToWorld,
} from '../utils/minimapUtils'
import { loadAllChunks } from '../utils/storage'
import { getViewportWorldRect } from '../utils/viewUtils'
import { cn } from '../lib/utils'

type MinimapContentProps = {
  onClose: () => void
}

/**
 * モーダル内の Canvas 描画・クリック処理（開くたびに再マウントされる）
 */
const MinimapContent: React.FC<MinimapContentProps> = ({ onClose }) => {
  const { scrollViewSmoothlyTo, boardViewState, state } = useGame()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layoutRef = useRef<ReturnType<typeof getMinimapLayout>>(null)
  const viewportRectRef = useRef<ReturnType<typeof getViewportWorldRect> | null>(null)
  const [cells, setCells] = useState<SerializedCell[] | null>(null)

  const mergeCellsForMinimap = useCallback(async (): Promise<SerializedCell[]> => {
    const dbCells = await loadAllChunks()
    const cellMap = new Map<string, SerializedCell>()
    for (const cell of dbCells) {
      cellMap.set(`${cell.x},${cell.y}`, cell)
    }
    for (const cell of state.cells.values()) {
      const serialized = cellToSerialized(cell)
      cellMap.set(`${serialized.x},${serialized.y}`, serialized)
    }
    return [...cellMap.values()]
  }, [state.cells])

  const drawToCanvas = useCallback((allCells: SerializedCell[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { maxWidth, maxHeight } = getMinimapMaxDimensions()
    const layout = getMinimapLayout(allCells, maxWidth, maxHeight)
    if (!layout) return

    layoutRef.current = layout

    const dpr = window.devicePixelRatio || 1
    const { displayWidth, displayHeight, dotSize, minimapOriginX, minimapOriginY } = layout

    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    drawMinimap(ctx, allCells, dotSize, minimapOriginX, minimapOriginY)

    if (viewportRectRef.current) {
      drawViewportIndicator(
        ctx,
        viewportRectRef.current,
        minimapOriginX,
        minimapOriginY,
        dotSize,
      )
    }
  }, [])

  useEffect(() => {
    if (boardViewState) {
      viewportRectRef.current = getViewportWorldRect(
        boardViewState.offset,
        boardViewState.scale,
        boardViewState.containerWidth,
        boardViewState.containerHeight,
      )
    }
  }, [boardViewState])

  useEffect(() => {
    let cancelled = false

    void mergeCellsForMinimap().then((allCells) => {
      if (cancelled) return
      setCells(allCells)
    })

    return () => {
      cancelled = true
    }
  }, [mergeCellsForMinimap])

  useEffect(() => {
    if (!cells || cells.length === 0) return
    drawToCanvas(cells)
  }, [cells, drawToCanvas])

  useEffect(() => {
    if (!cells || cells.length === 0) return

    const handleResize = () => {
      drawToCanvas(cells)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cells, drawToCanvas])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const layout = layoutRef.current
    const canvas = canvasRef.current
    if (!layout || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const { worldX, worldY } = minimapToWorld(
      mx,
      my,
      layout.minimapOriginX,
      layout.minimapOriginY,
      layout.dotSize,
    )

    scrollViewSmoothlyTo({ x: worldX, y: worldY })
    onClose()
  }

  if (cells === null) {
    return <p className="px-8 py-12 text-sm text-slate-400">読み込み中...</p>
  }

  if (cells.length === 0) {
    return <p className="px-8 py-12 text-sm text-slate-400">表示するセルがありません</p>
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="cursor-crosshair rounded border border-slate-700"
      data-testid="minimap-canvas"
    />
  )
}

/**
 * 俯瞰マップを Canvas で表示するモーダル
 */
export const MinimapModal: React.FC = () => {
  const { isMinimapOpen, minimapSessionId, closeMinimap } = useGame()

  useEffect(() => {
    if (!isMinimapOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMinimap()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMinimapOpen, closeMinimap])

  if (!isMinimapOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeMinimap}
      role="presentation"
    >
      <div
        className={cn(
          'relative flex max-h-[90vh] max-w-[90vw] flex-col items-center',
          'rounded-lg border border-slate-600 bg-slate-900 p-4 shadow-xl',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="俯瞰マップ"
      >
        <div className="mb-3 flex w-full items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">俯瞰マップ</h2>
          <button
            type="button"
            onClick={closeMinimap}
            title="閉じる"
            aria-label="閉じる"
            className={cn(
              'rounded p-1 text-slate-300',
              'hover:bg-slate-800 hover:text-white active:bg-slate-700',
            )}
          >
            <X size={16} />
          </button>
        </div>

        <MinimapContent key={minimapSessionId} onClose={closeMinimap} />
      </div>
    </div>
  )
}
