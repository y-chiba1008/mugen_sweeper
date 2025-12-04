import { SAVE_DATA_VERSION } from '../config/gameConfig'

/**
 * ローカルストレージに保存する 1 マス分の情報
 * 座標・地雷フラグ・隣接地雷数・開示状態・フラグ状態を含む
 */
export type SerializedCell = {
  /** x 座標（盤面上の列インデックス。0 を原点とする整数） */
  x: number
  /** y 座標（盤面上の行インデックス。0 を原点とする整数） */
  y: number
  /** このセルが地雷であるかどうか */
  isMine: boolean
  /** 隣接 8 マスに存在する地雷の数 */
  adjacentMines: number
  /** プレイヤーによって開かれたセルかどうか */
  revealed: boolean
  /** プレイヤーによってフラグが立てられているかどうか */
  flagged: boolean
}

/**
 * ローカルストレージに保存するゲーム全体の状態
 * セーブデータのバージョンや簡易ハッシュも含む
 */
export type SerializedGameState = {
  /** セーブデータのバージョン文字列 */
  version: string
  /** 現在のスコア（開いたセル数に相当） */
  score: number
  /** 現在の残りライフ数 */
  lives: number
  /** これまでのハイスコア */
  highScore: number
  /** 次にライフが 1 つ追加されるスコア閾値 */
  nextLifeScoreThreshold: number
  /** 現在ゲームオーバー状態かどうか */
  gameOver: boolean
  /** 開示済み・フラグ済みセルなどの盤面情報 */
  cells: SerializedCell[]
  /**
   * セーブデータ本体から計算した簡易チェックサム
   * データ破損や手動改変の検出に利用する
   */
  checksum?: number
}

/** ローカルストレージに保存する際のキー */
const STORAGE_KEY = 'mugen_sweeper_save_v1'

/**
 * セーブデータ本体から簡易チェックサムを計算する
 * 暗号学的な強度はないが、破損検知の目安として利用する
 */
const computeChecksum = (data: Omit<SerializedGameState, 'checksum'>): number => {
  const json = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < json.length; i += 1) {
    // シンプルなハッシュ関数（データ破損検知用の簡易チェック）
    hash = (hash * 31 + json.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * ゲーム状態をローカルストレージに保存する
 * バージョンとチェックサムを付与してから保存する
 */
export const saveGameState = (state: SerializedGameState): void => {
  if (typeof window === 'undefined') return

  const dataWithoutChecksum: Omit<SerializedGameState, 'checksum'> = {
    ...state,
    checksum: undefined,
  } as SerializedGameState

  const checksum = computeChecksum(dataWithoutChecksum)

  const payload: SerializedGameState = {
    ...state,
    version: SAVE_DATA_VERSION,
    checksum,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage が利用できない場合は黙って失敗する
  }
}

/**
 * ローカルストレージからゲーム状態を読み込む
 * - データが存在しない
 * - バージョン不一致
 * - チェックサム不一致
 * などの場合は null を返す
 */
export const loadGameState = (): SerializedGameState | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SerializedGameState
    if (parsed.version !== SAVE_DATA_VERSION) return null

    const { checksum, ...rest } = parsed
    const expected = computeChecksum(rest)
    if (checksum !== expected) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * ローカルストレージに保存されたゲーム状態を削除する
 * 主にデバッグ用途や明示的なリセット処理向け
 */
export const clearGameState = (): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}


