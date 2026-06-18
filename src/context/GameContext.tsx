import { LIFE_BONUS_THRESHOLD, INITIAL_LIVES } from '../config/gameConfig'
import type { CellCoord, CellKey, CellState, GameState } from '../types/game'
import { toCellKey } from '../types/game'
import { CHUNK_SIZE } from '../db/database'
import type { MetaRecord, SerializedCell } from '../db/types'
import {
  clearAllData,
  loadChunksInRange,
  loadMeta,
  saveChunks,
  saveMeta,
} from '../utils/storage'
import {
  chunkKey,
  diffCells,
  getChunkKeysForCoords,
  serializedToCell,
  toChunkCoord,
} from '../utils/chunkUtils'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  defaultIsMineGenerator,
  NEIGHBORS,
  revealCell as revealCellLogic,
  toggleFlag as toggleFlagLogic,
} from '../logic/gameLogic'

type ExtendedState = GameState & {
  gameVersion: number
  changedCells: SerializedCell[]
}

/**
 * ゲーム状態を更新するためのアクションの種類
 */
type GameAction =
  | { type: 'LOAD_META'; payload: MetaRecord | null }
  | { type: 'MERGE_CELLS'; payload: SerializedCell[] }
  | { type: 'CLEAR_CHANGED_CELLS' }
  | { type: 'RESET' }
  | { type: 'REVEAL_CELL'; coord: CellCoord }
  | { type: 'TOGGLE_FLAG'; coord: CellCoord }
  | { type: 'SET_HIGH_SCORE'; highScore: number }

/**
 * コンテキスト経由で公開するゲーム状態と操作関数のインターフェース
 */
type GameContextValue = {
  state: ExtendedState
  revealCell: (coord: CellCoord) => Promise<void>
  toggleFlag: (coord: CellCoord) => Promise<void>
  resetGame: () => Promise<void>
  loadChunksForViewport: (x1: number, y1: number, x2: number, y2: number) => Promise<void>
  isDraggingBoard: boolean
  setIsDraggingBoard: (isDragging: boolean) => void
}

/**
 * 新規ゲーム開始時の初期状態
 */
const initialState: ExtendedState = {
  cells: new Map<CellKey, CellState>(),
  score: 0,
  lives: INITIAL_LIVES,
  highScore: 0,
  nextLifeScoreThreshold: LIFE_BONUS_THRESHOLD,
  gameOver: false,
  isLoaded: false,
  gameVersion: 1,
  changedCells: [],
}

const mergeCellsIntoMap = (
  cells: Map<CellKey, CellState>,
  serialized: SerializedCell[],
): Map<CellKey, CellState> => {
  const next = new Map(cells)
  for (const s of serialized) {
    const key = toCellKey({ x: s.x, y: s.y })
    if (!next.has(key)) {
      next.set(key, serializedToCell(s))
    }
  }
  return next
}

/**
 * ゲーム状態を操作するための reducer
 */
const reducer = (state: ExtendedState, action: GameAction): ExtendedState => {
  switch (action.type) {
    case 'LOAD_META': {
      const saved = action.payload
      if (!saved) {
        return { ...initialState, isLoaded: true }
      }
      return {
        ...initialState,
        score: saved.score,
        lives: saved.lives,
        highScore: saved.highScore,
        nextLifeScoreThreshold: saved.nextLifeScoreThreshold,
        gameOver: saved.gameOver,
        isLoaded: true,
      }
    }
    case 'MERGE_CELLS': {
      if (action.payload.length === 0) return state
      return {
        ...state,
        cells: mergeCellsIntoMap(state.cells, action.payload),
      }
    }
    case 'CLEAR_CHANGED_CELLS': {
      return { ...state, changedCells: [] }
    }
    case 'RESET': {
      return {
        ...initialState,
        highScore: state.highScore,
        isLoaded: true,
        gameVersion: state.gameVersion + 1,
      }
    }
    case 'REVEAL_CELL': {
      const prevCells = state.cells
      const newState = revealCellLogic(state, action.coord, defaultIsMineGenerator, true)
      const changedCells = diffCells(prevCells, newState.cells)
      return { ...newState, gameVersion: state.gameVersion, changedCells }
    }
    case 'TOGGLE_FLAG': {
      const prevCells = state.cells
      const newState = toggleFlagLogic(state, action.coord, defaultIsMineGenerator)
      const changedCells = diffCells(prevCells, newState.cells)
      return { ...newState, gameVersion: state.gameVersion, changedCells }
    }
    case 'SET_HIGH_SCORE': {
      if (action.highScore <= state.highScore) return state
      return { ...state, highScore: action.highScore }
    }
    default:
      return state
  }
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

const GameProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [isDraggingBoard, setIsDraggingBoard] = useState(false)
  const loadedChunkKeysRef = useRef<Set<string>>(new Set())

  const mergeChunksFromDb = useCallback(
    async (cx1: number, cy1: number, cx2: number, cy2: number, margin: number) => {
      const minCx = cx1 - margin
      const maxCx = cx2 + margin
      const minCy = cy1 - margin
      const maxCy = cy2 + margin

      const missingKeys: string[] = []
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const key = chunkKey(cx, cy)
          if (!loadedChunkKeysRef.current.has(key)) {
            missingKeys.push(key)
          }
        }
      }

      if (missingKeys.length === 0) return

      const minX = minCx * CHUNK_SIZE
      const maxX = (maxCx + 1) * CHUNK_SIZE - 1
      const minY = minCy * CHUNK_SIZE
      const maxY = (maxCy + 1) * CHUNK_SIZE - 1

      const cells = await loadChunksInRange(minX, minY, maxX, maxY)
      if (cells.length > 0) {
        dispatch({ type: 'MERGE_CELLS', payload: cells })
      }

      for (const key of missingKeys) {
        loadedChunkKeysRef.current.add(key)
      }
    },
    [],
  )

  const loadChunksForViewport = useCallback(
    async (x1: number, y1: number, x2: number, y2: number) => {
      const cx1 = toChunkCoord(x1)
      const cx2 = toChunkCoord(x2)
      const cy1 = toChunkCoord(y1)
      const cy2 = toChunkCoord(y2)
      await mergeChunksFromDb(cx1, cy1, cx2, cy2, 2)
    },
    [mergeChunksFromDb],
  )

  const ensureChunksLoaded = useCallback(
    async (coords: CellCoord[]) => {
      const keys = getChunkKeysForCoords(coords)
      const missing = keys.filter((k) => !loadedChunkKeysRef.current.has(k))
      if (missing.length === 0) return

      let minCx = Infinity
      let maxCx = -Infinity
      let minCy = Infinity
      let maxCy = -Infinity
      for (const key of missing) {
        const [cx, cy] = key.split(',').map(Number)
        minCx = Math.min(minCx, cx)
        maxCx = Math.max(maxCx, cx)
        minCy = Math.min(minCy, cy)
        maxCy = Math.max(maxCy, cy)
      }
      await mergeChunksFromDb(minCx, minCy, maxCx, maxCy, 0)
    },
    [mergeChunksFromDb],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const meta = await loadMeta()
      if (cancelled) return
      dispatch({ type: 'LOAD_META', payload: meta })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!state.isLoaded) return
    if (state.score > 0 || state.cells.size > 0 || state.gameOver) return
    dispatch({ type: 'REVEAL_CELL', coord: { x: 0, y: 0 } })
  }, [state.isLoaded, state.score, state.cells.size, state.gameOver])

  useEffect(() => {
    if (!state.isLoaded) return
    saveMeta({
      score: state.score,
      lives: state.lives,
      highScore: state.highScore,
      nextLifeScoreThreshold: state.nextLifeScoreThreshold,
      gameOver: state.gameOver,
    })
  }, [
    state.isLoaded,
    state.score,
    state.lives,
    state.highScore,
    state.nextLifeScoreThreshold,
    state.gameOver,
  ])

  useEffect(() => {
    if (!state.isLoaded || state.changedCells.length === 0) return
    const cellsToSave = state.changedCells
    saveChunks(cellsToSave).then(() => {
      dispatch({ type: 'CLEAR_CHANGED_CELLS' })
    })
  }, [state.isLoaded, state.changedCells])

  const revealCell = useCallback(
    async (coord: CellCoord) => {
      const neighbors = NEIGHBORS.map((n) => ({
        x: coord.x + n.x,
        y: coord.y + n.y,
      }))
      await ensureChunksLoaded([coord, ...neighbors])
      dispatch({ type: 'REVEAL_CELL', coord })
    },
    [ensureChunksLoaded],
  )

  const toggleFlag = useCallback(
    async (coord: CellCoord) => {
      await ensureChunksLoaded([coord])
      dispatch({ type: 'TOGGLE_FLAG', coord })
    },
    [ensureChunksLoaded],
  )

  const resetGame = useCallback(async () => {
    await clearAllData()
    loadedChunkKeysRef.current.clear()
    dispatch({ type: 'RESET' })
  }, [])

  const value: GameContextValue = useMemo(
    () => ({
      state,
      revealCell,
      toggleFlag,
      resetGame,
      loadChunksForViewport,
      isDraggingBoard,
      setIsDraggingBoard,
    }),
    [state, revealCell, toggleFlag, resetGame, loadChunksForViewport, isDraggingBoard],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider')
  }
  return ctx
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GameProviderInner>{children}</GameProviderInner>
)
