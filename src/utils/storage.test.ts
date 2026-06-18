import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import {
  clearAllData,
  loadChunksInRange,
  loadMeta,
  saveChunks,
  saveMeta,
} from './storage'

beforeEach(async () => {
  await clearAllData()
})

describe('storage', () => {
  it('saveMeta / loadMeta が往復できる', async () => {
    await saveMeta({
      score: 100,
      lives: 2,
      highScore: 500,
      nextLifeScoreThreshold: 1000,
      gameOver: false,
    })

    const meta = await loadMeta()
    expect(meta).not.toBeNull()
    expect(meta?.score).toBe(100)
    expect(meta?.lives).toBe(2)
    expect(meta?.highScore).toBe(500)
    expect(meta?.gameOver).toBe(false)
    expect(meta?.id).toBe('save')
  })

  it('saveChunks は既存チャンクに差分マージする', async () => {
    await saveChunks([
      { x: 0, y: 0, isMine: false, adjacentMines: 0, revealed: true, flagged: false },
    ])
    await saveChunks([
      { x: 1, y: 0, isMine: false, adjacentMines: 1, revealed: true, flagged: false },
    ])

    const chunk = await db.chunks.get([0, 0])
    expect(chunk?.cells).toHaveLength(2)
  })

  it('loadChunksInRange は範囲内のセルを返す', async () => {
    await saveChunks([
      { x: 0, y: 0, isMine: false, adjacentMines: 0, revealed: true, flagged: false },
      { x: 20, y: 0, isMine: true, adjacentMines: 0, revealed: false, flagged: false },
    ])

    const cells = await loadChunksInRange(0, 0, 15, 15)
    expect(cells).toHaveLength(1)
    expect(cells[0].x).toBe(0)
  })

  it('clearAllData は全データを削除する', async () => {
    await saveMeta({
      score: 1,
      lives: 3,
      highScore: 0,
      nextLifeScoreThreshold: 1000,
      gameOver: false,
    })
    await saveChunks([
      { x: 0, y: 0, isMine: false, adjacentMines: 0, revealed: true, flagged: false },
    ])

    await clearAllData()

    expect(await loadMeta()).toBeNull()
    expect(await db.chunks.count()).toBe(0)
  })
})
