import {
  LIFE_BONUS_THRESHOLD,
  INITIAL_LIVES,
  MINE_PROBABILITY,
} from '../config/gameConfig'
import type { CellCoord, CellKey, CellState, GameState } from '../types/game'
import { toCellKey } from '../types/game'
import type { SerializedGameState } from '../utils/storage'
import { loadGameState, saveGameState } from '../utils/storage'
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

/**
 * ゲーム状態を更新するためのアクションの種類
 */
type GameAction =
  | { type: 'LOAD_FROM_STORAGE'; payload: SerializedGameState | null }
  | { type: 'RESET' }
  | { type: 'REVEAL_CELL'; coord: CellCoord }
  | { type: 'TOGGLE_FLAG'; coord: CellCoord }
  | { type: 'SET_HIGH_SCORE'; highScore: number }

/**
 * コンテキスト経由で公開するゲーム状態と操作関数のインターフェース
 */
type GameContextValue = {
  state: GameState
  revealCell: (coord: CellCoord) => void
  toggleFlag: (coord: CellCoord) => void
  resetGame: () => void
}

/**
 * 新規ゲーム開始時の初期状態
 */
const initialState: GameState = {
  cells: new Map<CellKey, CellState>(),
  score: 0,
  lives: INITIAL_LIVES,
  highScore: 0,
  nextLifeScoreThreshold: LIFE_BONUS_THRESHOLD,
  gameOver: false,
  isLoaded: false,
}

/**
 * 隣接 8 マスの相対座標一覧
 */
const NEIGHBORS: CellCoord[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]

/**
 * 指定座標のセルを生成または取得する
 * 生成時には地雷フラグのみを決め、隣接地雷数は後段で計算する
 */
const getOrCreateCell = (
  cells: Map<CellKey, CellState>,
  coord: CellCoord,
): CellState => {
  const key = toCellKey(coord)
  const existing = cells.get(key)
  if (existing) {
    return { ...existing }
  }

  const cell: CellState = {
    coord,
    isMine: Math.random() < MINE_PROBABILITY,
    adjacentMines: 0,
    revealed: false,
    flagged: false,
  }
  cells.set(key, cell)
  return cell
}

/**
 * 指定セルの隣接地雷数を計算し、セルに反映する
 */
const refreshAdjacentMines = (
  cells: Map<CellKey, CellState>,
  coord: CellCoord,
): CellState => {
  const cell = getOrCreateCell(cells, coord)
  let adjacentMines = 0

  for (const n of NEIGHBORS) {
    const neighborCoord = { x: coord.x + n.x, y: coord.y + n.y }
    const neighbor = getOrCreateCell(cells, neighborCoord)
    if (neighbor.isMine) adjacentMines += 1
  }

  cells.set(toCellKey(coord), { ...cell, adjacentMines })
  return cells.get(toCellKey(coord))!
}

/**
 * 指定座標のセルを盤面上に必ず用意して返すヘルパー
 * ついでに最新の隣接地雷数を計算して反映する
 */
const ensureCell = (cells: Map<CellKey, CellState>, coord: CellCoord): CellState => {
  return refreshAdjacentMines(cells, coord)
}

/**
 * 周囲に地雷がないセルを起点に、繋がる空白セル群を BFS で一括開示する
 * 極端なケースでのフリーズを避けるため、探索回数に上限を設ける
 * @returns 開いたセル数
 */
const revealArea = (
  cells: Map<CellKey, CellState>,
  startCoord: CellCoord,
): { openedCount: number } => {
  const queue: CellCoord[] = [startCoord]
  const visited = new Set<CellKey>()
  let openedCount = 0

  // 無限ループや極端な負荷を避けるための安全上限
  const MAX_VISITS = 20_000

  // キューが空になるか、訪問上限に達するまで探索
  while (queue.length > 0 && visited.size < MAX_VISITS) {
    const coord = queue.shift()!
    const key = toCellKey(coord)
    if (visited.has(key)) continue
    visited.add(key)

    const cell = ensureCell(cells, coord)
    if (cell.revealed || cell.flagged) continue

    cells.set(
      key,
      { ...cell, revealed: true }
    )
    openedCount += 1

    if (!cells.get(key)!.isMine && cells.get(key)!.adjacentMines === 0) {
      for (const n of NEIGHBORS) {
        queue.push({ x: coord.x + n.x, y: coord.y + n.y })
      }
    }
  }

  return { openedCount }
}

/**
 * ゲーム状態を操作するための reducer
 * スコア、ライフ、盤面状態、ハイスコアなどを一元管理する
 */
const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'LOAD_FROM_STORAGE': {
      const saved = action.payload
      if (!saved) {
        return { ...initialState, isLoaded: true }
      }
      const cells = new Map<CellKey, CellState>()
      for (const c of saved.cells) {
        const coord: CellCoord = { x: c.x, y: c.y }
        cells.set(toCellKey(coord), {
          coord,
          isMine: c.isMine,
          adjacentMines: c.adjacentMines,
          revealed: c.revealed,
          flagged: c.flagged,
        })
      }
      return {
        cells,
        score: saved.score,
        lives: saved.lives,
        highScore: saved.highScore,
        nextLifeScoreThreshold: saved.nextLifeScoreThreshold,
        gameOver: saved.gameOver,
        isLoaded: true,
      }
    }
    case 'RESET': {
      return { ...initialState, highScore: state.highScore, isLoaded: true }
    }
    case 'REVEAL_CELL': {
      if (state.gameOver) return state
      const cells = new Map(state.cells)
      const cell = ensureCell(cells, action.coord)
      if (cell.revealed || cell.flagged) {
        return { ...state, cells }
      }

      let currentScore = state.score;
      let currentLives = state.lives;
      let currentNextLifeScoreThreshold = state.nextLifeScoreThreshold;
      let currentGameOver: boolean = state.gameOver;
      let openedCount = 0;

      if (cell.isMine) {
        cells.set(
          toCellKey(action.coord),
          { ...cell, revealed: true }
        )
        currentLives -= 1;
        currentGameOver = currentLives <= 0;
        openedCount = 0;
      } else if (cell.adjacentMines > 0) {
        cells.set(
          toCellKey(action.coord),
          { ...cell, revealed: true }
        )
        openedCount = 1;
      } else {
        const result = revealArea(cells, action.coord);
        openedCount = result.openedCount;
      }

      if (openedCount > 0) {
        currentScore += openedCount;
      }

      while (currentScore >= currentNextLifeScoreThreshold) {
        currentLives += 1;
        currentNextLifeScoreThreshold += LIFE_BONUS_THRESHOLD;
      }

      const highScore = Math.max(state.highScore, currentScore);

      return {
        ...state,
        cells,
        score: currentScore,
        lives: currentLives,
        nextLifeScoreThreshold: currentNextLifeScoreThreshold,
        highScore,
        gameOver: currentGameOver,
      };
    }
    case 'TOGGLE_FLAG': {
      if (state.gameOver) return state
      const cells = new Map(state.cells)
      const cell = ensureCell(cells, action.coord)
      if (cell.revealed) {
        return { ...state, cells }
      }
      cells.set(
        toCellKey(action.coord),
        { ...cell, flagged: !cell.flagged }
      )
      return { ...state, cells }
    }
    case 'SET_HIGH_SCORE': {
      if (action.highScore <= state.highScore) return state
      return { ...state, highScore: action.highScore }
    }
    default:
      return state
  }
}

/**
 * ゲーム状態を共有するための React コンテキスト
 */
const GameContext = createContext<GameContextValue | undefined>(undefined)

/**
 * 無限マインスイーパーのゲーム状態を提供するコンテキストプロバイダ
 * ストレージからのロードと自動セーブも内部で処理する
 */
const GameProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const saved = loadGameState()
    dispatch({ type: 'LOAD_FROM_STORAGE', payload: saved })
  }, [])

  // 初期ロード完了後、まだ何も開かれていない場合は中央セルを自動で開く
  useEffect(() => {
    if (!state.isLoaded) return
    if (state.score > 0 || state.cells.size > 0 || state.gameOver) return
    // 原点 (0,0) から連鎖的に開示を開始
    dispatch({ type: 'REVEAL_CELL', coord: { x: 0, y: 0 } })
  }, [state.isLoaded, state.score, state.cells.size, state.gameOver])

  useEffect(() => {
    if (!state.isLoaded) return
    const serialized: SerializedGameState = {
      version: '',
      score: state.score,
      lives: state.lives,
      highScore: state.highScore,
      nextLifeScoreThreshold: state.nextLifeScoreThreshold,
      gameOver: state.gameOver,
      cells: Array.from(state.cells.values()).map((c) => ({
        x: c.coord.x,
        y: c.coord.y,
        isMine: c.isMine,
        adjacentMines: c.adjacentMines,
        revealed: c.revealed,
        flagged: c.flagged,
      })),
    }
    saveGameState(serialized)
  }, [state])

  const value: GameContextValue = useMemo(
    () => ({
      state,
      revealCell: (coord) => dispatch({ type: 'REVEAL_CELL', coord }),
      toggleFlag: (coord) => dispatch({ type: 'TOGGLE_FLAG', coord }),
      resetGame: () => dispatch({ type: 'RESET' }),
    }),
    [state],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

/**
 * ゲーム状態と操作関数にアクセスするためのカスタムフック
 * `GameProvider` 配下のコンポーネントからのみ利用可能
 */
// Fast Refresh の lint ルール対象外とする（カスタムフックはコンポーネントではないため）
// eslint-disable-next-line react-refresh/only-export-components
export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider')
  }
  return ctx
}

/**
 * Fast Refresh 対応のためにコンポーネントのみを default export するラッパー
 */
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GameProviderInner>{children}</GameProviderInner>
)


