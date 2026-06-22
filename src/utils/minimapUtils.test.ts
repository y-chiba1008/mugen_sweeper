import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getMinimapLayout,
  getMinimapMaxDimensions,
  minimapToWorld,
} from './minimapUtils'

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

  it('getMinimapMaxDimensions はモーダルの 90vw / 90vh 制約に合わせたサイズを返す', () => {
    vi.stubGlobal('innerWidth', 800)
    vi.stubGlobal('innerHeight', 600)

    const { maxWidth, maxHeight } = getMinimapMaxDimensions()

    expect(maxWidth).toBe(688)
    expect(maxHeight).toBe(472)
  })

  it('getMinimapMaxDimensions は極小ウィンドウでも下限サイズを保証する', () => {
    vi.stubGlobal('innerWidth', 100)
    vi.stubGlobal('innerHeight', 100)

    const { maxWidth, maxHeight } = getMinimapMaxDimensions()

    expect(maxWidth).toBe(200)
    expect(maxHeight).toBe(200)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
