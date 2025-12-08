import { LIFE_BONUS_THRESHOLD, INITIAL_LIVES } from '../config/gameConfig'
import type { CellCoord, CellKey, CellState, GameState } from '../types/game'
import { toCellKey } from '../types/game'
import type { SerializedGameState } from '../utils/storage'
import { loadGameState, saveGameState } from '../utils/storage'
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  defaultIsMineGenerator,
  revealCell as revealCellLogic,
  toggleFlag as toggleFlagLogic,
} from '../logic/gameLogic'

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
      return revealCellLogic(state, action.coord, defaultIsMineGenerator)
    }
    case 'TOGGLE_FLAG': {
      return toggleFlagLogic(state, action.coord, defaultIsMineGenerator)
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


