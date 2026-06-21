import { describe, expect, it } from 'vitest'
import {
  getCellColor,
  getMinimapLayout,
  minimapToWorld,
} from './minimapUtils'
import { COLOR_FLAG_YELLOW, COLOR_OPENED_WHITE, COLOR_UNOPENED_GRAY } from '../config/gameConfig'

describe('minimapUtils', () => {
  const sampleCells = [
    { x: 0, y: 0, revealed: true, flagged: false, isMine: false },
    { x: 1, y: 0, revealed: false, flagged: false, isMine: false },
    { x: 0, y: 1, revealed: false, flagged: true, isMine: false },
    { x: 2, y: 2, revealed: true, flagged: false, isMine: true },
  ]

  it('getMinimapLayout は全セルが収まる dotSize と表示サイズを返す', () => {
    const layout = getMinimapLayout(sampleCells, 300, 300)
    expect(layout).not.toBeNull()
    expect(layout?.minimapOriginX).toBe(0)
    expect(layout?.minimapOriginY).toBe(0)
    expect(layout?.dotSize).toBe(100)
    expect(layout?.displayWidth).toBe(300)
    expect(layout?.displayHeight).toBe(300)
  })

  it('getMinimapLayout は dotSize の下限を 1px とする', () => {
    const manyCells = Array.from({ length: 500 }, (_, i) => ({
      x: i,
      y: 0,
      revealed: true,
      flagged: false,
      isMine: false,
    }))
    const layout = getMinimapLayout(manyCells, 100, 100)
    expect(layout?.dotSize).toBe(1)
  })

  it('minimapToWorld はクリック座標をワールド座標に変換する', () => {
    const { worldX, worldY } = minimapToWorld(150, 50, 0, 0, 100)
    expect(worldX).toBe(1)
    expect(worldY).toBe(0)
  })

  it('getCellColor はセル状態に応じた色を返す', () => {
    expect(getCellColor({ x: 0, y: 0, revealed: false, flagged: false, isMine: false })).toBe(
      COLOR_UNOPENED_GRAY,
    )
    expect(getCellColor({ x: 0, y: 0, revealed: false, flagged: true, isMine: false })).toBe(
      COLOR_FLAG_YELLOW,
    )
    expect(getCellColor({ x: 0, y: 0, revealed: true, flagged: false, isMine: false })).toBe(
      COLOR_OPENED_WHITE,
    )
    expect(getCellColor({ x: 0, y: 0, revealed: true, flagged: false, isMine: true })).toBe(
      '#ef4444',
    )
  })
})
