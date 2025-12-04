/**
 * 盤面上のセル位置を表す座標
 * x が列方向、y が行方向のインデックスを表す
 */
export type CellCoord = {
  /** 盤面上の x 座標（列インデックス。0 を原点とする整数） */
  x: number
  /** 盤面上の y 座標（行インデックス。0 を原点とする整数） */
  y: number
}

/**
 * セルを一意に識別するためのキー
 * `"x,y"` 形式の文字列として表現する
 */
export type CellKey = string

/**
 * 座標から `"x,y"` 形式のセルキーを生成する
 */
export const toCellKey = (coord: CellCoord): CellKey => `${coord.x},${coord.y}`

/**
 * `"x,y"` 形式のセルキーから座標オブジェクトを復元する
 */
export const fromCellKey = (key: CellKey): CellCoord => {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

/**
 * 1 つのセルの状態
 * 地雷であるか、隣接地雷数、開示/フラグ状態などを含む
 */
export type CellState = {
  /** セルの盤面上の座標 */
  coord: CellCoord
  /** このセルが地雷であるかどうか */
  isMine: boolean
  /** 隣接 8 マスに存在する地雷の数 */
  adjacentMines: number
  /** プレイヤーにより開示済みかどうか */
  revealed: boolean
  /** プレイヤーによりフラグが立てられているかどうか */
  flagged: boolean
}

/**
 * ゲーム全体の状態
 * スコア・ライフ・ハイスコア・盤面情報などをまとめて管理する
 */
export type GameState = {
  /** 既に生成された盤面上のセル群（キーは `"x,y"` 形式） */
  cells: Map<CellKey, CellState>
  /** 現在のスコア（開いたセル数） */
  score: number
  /** 現在の残りライフ数 */
  lives: number
  /** これまでのハイスコア */
  highScore: number
  /** 次にライフが 1 つ追加されるスコア閾値 */
  nextLifeScoreThreshold: number
  /** ゲームオーバー状態かどうか */
  gameOver: boolean
  /** ストレージからロード済みかどうかのフラグ */
  isLoaded: boolean
}

