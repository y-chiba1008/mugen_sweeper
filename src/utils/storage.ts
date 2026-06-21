import { SAVE_DATA_VERSION } from '../config/gameConfig'
import { db } from '../db/database'
import type { MetaInput, MetaRecord, SerializedCell } from '../db/types'
import { groupCellsByChunk, toChunkCoord } from './chunkUtils'

export type { SerializedCell } from '../db/types'

/**
 * meta テーブルからセーブデータを読み込む
 */
export const loadMeta = async (): Promise<MetaRecord | null> => {
  if (typeof window === 'undefined') return null

  try {
    const meta = await db.meta.get('save')
    if (!meta) return null
    if (meta.version !== SAVE_DATA_VERSION) return null
    return meta
  } catch {
    return null
  }
}

/**
 * meta テーブルにゲーム状態を保存する
 */
export const saveMeta = async (meta: MetaInput): Promise<void> => {
  if (typeof window === 'undefined') return

  try {
    await db.meta.put({
      id: 'save',
      savedAt: new Date(),
      version: SAVE_DATA_VERSION,
      ...meta,
    })
  } catch {
    // IndexedDB が利用できない場合は黙って失敗する
  }
}

/**
 * 変化したセルをチャンク単位で差分マージして保存する
 */
export const saveChunks = async (changedCells: SerializedCell[]): Promise<void> => {
  if (typeof window === 'undefined' || changedCells.length === 0) return

  try {
    const chunkMap = groupCellsByChunk(changedCells)
    const records = []

    for (const { cx, cy, cells } of chunkMap.values()) {
      const existing = await db.chunks.get([cx, cy])
      const cellMap = new Map(
        (existing?.cells ?? []).map((c) => [`${c.x},${c.y}`, c]),
      )
      for (const cell of cells) {
        cellMap.set(`${cell.x},${cell.y}`, cell)
      }
      records.push({ cx, cy, cells: [...cellMap.values()] })
    }

    await db.chunks.bulkPut(records)
  } catch {
    // ignore
  }
}

/**
 * IndexedDB の全チャンクからセルを読み込む
 */
export const loadAllChunks = async (): Promise<SerializedCell[]> => {
  if (typeof window === 'undefined') return []

  try {
    const chunks = await db.chunks.toArray()
    return chunks.flatMap((c) => c.cells)
  } catch {
    return []
  }
}

/**
 * セル座標範囲に含まれるチャンクのセルを読み込む
 */
export const loadChunksInRange = async (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Promise<SerializedCell[]> => {
  if (typeof window === 'undefined') return []

  try {
    const cx1 = toChunkCoord(x1)
    const cx2 = toChunkCoord(x2)
    const cy1 = toChunkCoord(y1)
    const cy2 = toChunkCoord(y2)

    const keys: [number, number][] = []
    for (let cx = cx1; cx <= cx2; cx++) {
      for (let cy = cy1; cy <= cy2; cy++) {
        keys.push([cx, cy])
      }
    }

    const chunks = await db.chunks.bulkGet(keys)
    return chunks.filter((c): c is NonNullable<typeof c> => c !== undefined).flatMap((c) => c.cells)
  } catch {
    return []
  }
}

/**
 * IndexedDB の全データを削除する
 */
export const clearAllData = async (): Promise<void> => {
  if (typeof window === 'undefined') return

  try {
    await db.meta.clear()
    await db.chunks.clear()
  } catch {
    // ignore
  }
}
