import Dexie from 'dexie'
import type { ChunkRecord, MetaRecord } from './types'

export const CHUNK_SIZE = 16

export class MinesweeperDB extends Dexie {
  meta!: Dexie.Table<MetaRecord, string>
  chunks!: Dexie.Table<ChunkRecord, [number, number]>

  constructor() {
    super('MinesweeperSave')
    this.version(1).stores({
      meta: 'id',
      chunks: '[cx+cy]',
    })
  }
}

export const db = new MinesweeperDB()
