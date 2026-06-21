import { COLOR_VIEWPORT_INDICATOR } from '../config/gameConfig'
import type { SerializedCell } from '../db/types'
import { getCellColor, type ViewportWorldRect } from './viewUtils'

export type MinimapLayout = {
  minimapOriginX: number
  minimapOriginY: number
  dotSize: number
  displayWidth: number
  displayHeight: number
}

export type MinimapCellInput = Pick<
  SerializedCell,
  'x' | 'y' | 'revealed' | 'flagged' | 'isMine'
>

/**
 * 読み込み済み全セルからミニマップの描画レイアウトを算出する
 */
export const getMinimapLayout = (
  allCells: MinimapCellInput[],
  maxWidth: number,
  maxHeight: number,
): MinimapLayout | null => {
  if (allCells.length === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const cell of allCells) {
    minX = Math.min(minX, cell.x)
    maxX = Math.max(maxX, cell.x)
    minY = Math.min(minY, cell.y)
    maxY = Math.max(maxY, cell.y)
  }

  const worldWidth = maxX - minX + 1
  const worldHeight = maxY - minY + 1

  const dotSize = Math.max(1, Math.min(maxWidth / worldWidth, maxHeight / worldHeight))

  return {
    minimapOriginX: minX,
    minimapOriginY: minY,
    dotSize,
    displayWidth: worldWidth * dotSize,
    displayHeight: worldHeight * dotSize,
  }
}

/**
 * ミニマップ上のクリック座標をワールド座標に変換する
 */
export const minimapToWorld = (
  mx: number,
  my: number,
  minimapOriginX: number,
  minimapOriginY: number,
  dotSize: number,
): { worldX: number; worldY: number } => ({
  worldX: minimapOriginX + Math.floor(mx / dotSize),
  worldY: minimapOriginY + Math.floor(my / dotSize),
})

/**
 * ミニマップ Canvas に全セルを描画する
 */
export const drawMinimap = (
  ctx: CanvasRenderingContext2D,
  allCells: MinimapCellInput[],
  dotSize: number,
  minimapOriginX: number,
  minimapOriginY: number,
): void => {
  for (const cell of allCells) {
    const screenX = (cell.x - minimapOriginX) * dotSize
    const screenY = (cell.y - minimapOriginY) * dotSize
    ctx.fillStyle = getCellColor(cell)
    ctx.fillRect(screenX, screenY, dotSize, dotSize)
  }
}

/**
 * メインビューの表示範囲をミニマップ上に矩形で描画する
 */
export const drawViewportIndicator = (
  ctx: CanvasRenderingContext2D,
  viewportWorldRect: ViewportWorldRect,
  minimapOriginX: number,
  minimapOriginY: number,
  dotSize: number,
): void => {
  const rectX = (viewportWorldRect.x - minimapOriginX) * dotSize
  const rectY = (viewportWorldRect.y - minimapOriginY) * dotSize
  const rectW = viewportWorldRect.width * dotSize
  const rectH = viewportWorldRect.height * dotSize

  ctx.strokeStyle = COLOR_VIEWPORT_INDICATOR
  ctx.lineWidth = 1
  ctx.strokeRect(rectX, rectY, rectW, rectH)
}

/**
 * モーダル内 Canvas の表示可能領域の最大サイズを算出する
 */
export const getMinimapMaxDimensions = (): { maxWidth: number; maxHeight: number } => {
  if (typeof window === 'undefined') {
    return { maxWidth: 800, maxHeight: 600 }
  }

  const horizontalPadding = 64
  const verticalPadding = 160

  return {
    maxWidth: Math.max(200, window.innerWidth - horizontalPadding),
    maxHeight: Math.max(200, window.innerHeight - verticalPadding),
  }
}
