import { CHUNK_SIZE } from '../db/database'
import type { ChunkRecord, SerializedCell } from '../db/types'
import type { CellCoord, CellKey, CellState } from '../types/game'

export const toChunkCoord = (v: number): number => Math.floor(v / CHUNK_SIZE)

export const chunkKey = (cx: number, cy: number): string => `${cx},${cy}`

export const cellToSerialized = (cell: CellState): SerializedCell => ({
  x: cell.coord.x,
  y: cell.coord.y,
  isMine: cell.isMine,
  adjacentMines: cell.adjacentMines,
  revealed: cell.revealed,
  flagged: cell.flagged,
})

export const serializedToCell = (s: SerializedCell): CellState => ({
  coord: { x: s.x, y: s.y },
  isMine: s.isMine,
  adjacentMines: s.adjacentMines,
  revealed: s.revealed,
  flagged: s.flagged,
})

export const groupCellsByChunk = (
  cells: SerializedCell[],
): Map<string, ChunkRecord> => {
  const map = new Map<string, ChunkRecord>()
  for (const cell of cells) {
    const cx = toChunkCoord(cell.x)
    const cy = toChunkCoord(cell.y)
    const key = chunkKey(cx, cy)
    const existing = map.get(key)
    if (existing) {
      existing.cells.push(cell)
    } else {
      map.set(key, { cx, cy, cells: [cell] })
    }
  }
  return map
}

export const getChunkKeysForCoords = (coords: CellCoord[]): string[] => {
  const keys = new Set<string>()
  for (const coord of coords) {
    keys.add(chunkKey(toChunkCoord(coord.x), toChunkCoord(coord.y)))
  }
  return [...keys]
}

export const diffCells = (
  prev: Map<CellKey, CellState>,
  next: Map<CellKey, CellState>,
): SerializedCell[] => {
  const changed: SerializedCell[] = []
  for (const [key, cell] of next) {
    const prevCell = prev.get(key)
    if (
      !prevCell ||
      prevCell.isMine !== cell.isMine ||
      prevCell.adjacentMines !== cell.adjacentMines ||
      prevCell.revealed !== cell.revealed ||
      prevCell.flagged !== cell.flagged
    ) {
      changed.push(cellToSerialized(cell))
    }
  }
  return changed
}
