/**
 * IndexedDB に保存する 1 マス分の情報
 */
export type SerializedCell = {
  x: number
  y: number
  isMine: boolean
  adjacentMines: number
  revealed: boolean
  flagged: boolean
}

/**
 * meta テーブルのレコード
 */
export type MetaRecord = {
  id: 'save'
  version: string
  score: number
  lives: number
  highScore: number
  nextLifeScoreThreshold: number
  gameOver: boolean
  savedAt: Date
}

/**
 * chunks テーブルのレコード
 */
export type ChunkRecord = {
  cx: number
  cy: number
  cells: SerializedCell[]
}

/**
 * meta 保存時の入力（id / savedAt / version は storage 層で付与）
 */
export type MetaInput = Omit<MetaRecord, 'id' | 'savedAt' | 'version'>
