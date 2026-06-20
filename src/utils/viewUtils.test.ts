import { describe, expect, it } from 'vitest'
import { cellCenterToOffset } from './viewUtils'

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
})
