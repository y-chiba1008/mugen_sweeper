import { describe, expect, it } from 'vitest'
import {
  cellCenterToOffset,
  getCellColor,
  getViewportWorldRect,
} from './viewUtils'
import { COLOR_FLAG_YELLOW, COLOR_OPENED_WHITE, COLOR_UNOPENED_GRAY } from '../config/gameConfig'

describe('viewUtils', () => {
  it('cellCenterToOffset はセル中心をビューポート中央に合わせる', () => {
    const offset = cellCenterToOffset(0, 0, 800, 600, 1)
    expect(offset.x).toBe(800 / 2 - 16)
    expect(offset.y).toBe(600 / 2 - 16)
  })

  it('cellCenterToOffset はスケールを考慮する', () => {
    const offset = cellCenterToOffset(2, 3, 800, 600, 2)
    expect(offset.x).toBe(800 / 2 - (2 * 32 + 16) * 2)
    expect(offset.y).toBe(600 / 2 - (3 * 32 + 16) * 2)
  })

  it('getCellColor はセル状態に応じた色を返す', () => {
    expect(getCellColor({ revealed: false, flagged: false, isMine: false })).toBe(
      COLOR_UNOPENED_GRAY,
    )
    expect(getCellColor({ revealed: false, flagged: true, isMine: false })).toBe(
      COLOR_FLAG_YELLOW,
    )
    expect(getCellColor({ revealed: true, flagged: false, isMine: false })).toBe(
      COLOR_OPENED_WHITE,
    )
    expect(getCellColor({ revealed: true, flagged: false, isMine: true })).toBe(
      '#ef4444',
    )
  })
})

describe('getViewportWorldRect', () => {
  it('中央配置時にビューポート矩形を返す', () => {
    const offset = cellCenterToOffset(0, 0, 800, 600, 1)
    const rect = getViewportWorldRect(offset, 1, 800, 600)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
  })
})
