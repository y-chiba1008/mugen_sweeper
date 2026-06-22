import { describe, expect, it } from 'vitest'
import {
  getMinimapMaxDimensionsFromContentRect,
  getMinimapMaxDimensionsFromViewport,
} from './minimapLayout'

describe('minimapLayout', () => {
  it('getMinimapMaxDimensionsFromViewport は代表サイズを返す', () => {
    expect(getMinimapMaxDimensionsFromViewport(800, 600)).toEqual({
      maxWidth: 688,
      maxHeight: 472,
    })
    expect(getMinimapMaxDimensionsFromViewport(500, 232)).toEqual({
      maxWidth: 418,
      maxHeight: 140,
    })
    expect(getMinimapMaxDimensionsFromViewport(100, 100)).toEqual({
      maxWidth: 58,
      maxHeight: 22,
    })
  })

  it('getMinimapMaxDimensionsFromContentRect は実測値を 1px 以上に丸める', () => {
    expect(getMinimapMaxDimensionsFromContentRect(688.9, 472.1)).toEqual({
      maxWidth: 688,
      maxHeight: 472,
    })
    expect(getMinimapMaxDimensionsFromContentRect(0.5, 0.2)).toEqual({
      maxWidth: 1,
      maxHeight: 1,
    })
  })
})
