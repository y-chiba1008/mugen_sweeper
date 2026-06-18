import { describe, expect, it } from 'vitest'
import type { CellState } from '../types/game'
import { toCellKey } from '../types/game'
import {
  cellToSerialized,
  diffCells,
  getChunkKeysForCoords,
  groupCellsByChunk,
  serializedToCell,
  toChunkCoord,
} from './chunkUtils'

describe('chunkUtils', () => {
  it('toChunkCoord は 16 セル単位でチャンク座標に変換する', () => {
    expect(toChunkCoord(0)).toBe(0)
    expect(toChunkCoord(15)).toBe(0)
    expect(toChunkCoord(16)).toBe(1)
    expect(toChunkCoord(-1)).toBe(-1)
  })

  it('cellToSerialized / serializedToCell が相互変換できる', () => {
    const cell: CellState = {
      coord: { x: 3, y: 5 },
      isMine: true,
      adjacentMines: 2,
      revealed: true,
      flagged: false,
    }
    const serialized = cellToSerialized(cell)
    expect(serializedToCell(serialized)).toEqual(cell)
  })

  it('groupCellsByChunk はセルをチャンクごとにグループ化する', () => {
    const cells = [
      { x: 0, y: 0, isMine: false, adjacentMines: 0, revealed: true, flagged: false },
      { x: 15, y: 15, isMine: false, adjacentMines: 1, revealed: true, flagged: false },
      { x: 16, y: 0, isMine: true, adjacentMines: 0, revealed: false, flagged: true },
    ]
    const grouped = groupCellsByChunk(cells)
    expect(grouped.size).toBe(2)
    expect(grouped.get('0,0')?.cells).toHaveLength(2)
    expect(grouped.get('1,0')?.cells).toHaveLength(1)
  })

  it('getChunkKeysForCoords は重複なくチャンクキーを返す', () => {
    const keys = getChunkKeysForCoords([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 16, y: 0 },
    ])
    expect(keys).toEqual(expect.arrayContaining(['0,0', '1,0']))
    expect(keys).toHaveLength(2)
  })

  it('diffCells は変化したセルのみ返す', () => {
    const prev = new Map<string, CellState>([
      [
        toCellKey({ x: 0, y: 0 }),
        {
          coord: { x: 0, y: 0 },
          isMine: false,
          adjacentMines: 0,
          revealed: false,
          flagged: false,
        },
      ],
    ])
    const next = new Map(prev)
    next.set(toCellKey({ x: 0, y: 0 }), {
      coord: { x: 0, y: 0 },
      isMine: false,
      adjacentMines: 0,
      revealed: true,
      flagged: false,
    })
    next.set(toCellKey({ x: 1, y: 0 }), {
      coord: { x: 1, y: 0 },
      isMine: false,
      adjacentMines: 1,
      revealed: true,
      flagged: false,
    })

    const changed = diffCells(prev, next)
    expect(changed).toHaveLength(2)
    expect(changed.map((c) => `${c.x},${c.y}`)).toEqual(
      expect.arrayContaining(['0,0', '1,0']),
    )
  })
})
