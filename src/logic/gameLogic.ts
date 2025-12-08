import { LIFE_BONUS_THRESHOLD, MINE_PROBABILITY } from '../config/gameConfig'
import type { CellCoord, CellKey, CellState, GameState } from '../types/game'
import { toCellKey } from '../types/game'
import { measureTime } from '../utils/performance'

// --- 定数 ---

export const NEIGHBORS: CellCoord[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]

// --- 副作用の分離 ---

export type IsMineGenerator = (coord: CellCoord) => boolean

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const defaultIsMineGenerator: IsMineGenerator = (_coord: CellCoord) =>
  Math.random() < MINE_PROBABILITY

// --- 純粋なゲームロジック関数 ---

export const getOrCreateCell = (
  cells: Map<CellKey, CellState>,
  coord: CellCoord,
  isMineGenerator: IsMineGenerator,
): CellState => {
  const key = toCellKey(coord)
  const existing = cells.get(key)
  if (existing) {
    return existing
  }

  const newCell: CellState = {
    coord,
    isMine: isMineGenerator(coord),
    adjacentMines: 0,
    revealed: false,
    flagged: false,
  }
  cells.set(key, newCell)
  return newCell
}

/**
 * 指定されたセルの隣接地雷数を計算する（新しいセルは生成しない）
 */
export const calculateAdjacentMines = (
  cells: Map<CellKey, CellState>,
  coord: CellCoord,
): number => {
  let adjacentMines = 0
  for (const n of NEIGHBORS) {
    const neighborCoord = { x: coord.x + n.x, y: coord.y + n.y }
    const neighbor = cells.get(toCellKey(neighborCoord))
    if (neighbor?.isMine) {
      adjacentMines += 1
    }
  }
  return adjacentMines
}

/**
 * 周囲に地雷がないセルを起点に、繋がる空白セル群を BFS で一括開示する
 */
const _revealArea = (
  cells: Map<CellKey, CellState>,
  startCoord: CellCoord,
  isMineGenerator: IsMineGenerator,
): { openedCount: number } => {
  const queue: CellCoord[] = [startCoord]
  const visited = new Set<CellKey>([toCellKey(startCoord)])
  let openedCount = 0

  const MAX_VISITS = 20_000

  while (queue.length > 0 && openedCount < MAX_VISITS) {
    const coord = queue.shift()!
    const key = toCellKey(coord)

    const cell = getOrCreateCell(cells, coord, isMineGenerator)
    if (cell.revealed || cell.flagged) continue

    // 隣接地雷数を計算する直前に、隣接セルを生成しておく
    NEIGHBORS.forEach((n) => {
      const neighborCoord = { x: coord.x + n.x, y: coord.y + n.y }
      getOrCreateCell(cells, neighborCoord, isMineGenerator)
    })

    const adjacentMines = calculateAdjacentMines(cells, coord)
    const updatedCell: CellState = { ...cell, revealed: true, adjacentMines }
    cells.set(key, updatedCell)
    openedCount += 1

    if (!updatedCell.isMine && updatedCell.adjacentMines === 0) {
      for (const n of NEIGHBORS) {
        const neighborCoord = { x: coord.x + n.x, y: coord.y + n.y }
        const neighborKey = toCellKey(neighborCoord)
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey)
          queue.push(neighborCoord)
        }
      }
    }
  }

  return { openedCount }
}
export const revealArea = measureTime(_revealArea, 'revealArea')

const _revealCell = (
  state: GameState,
  coord: CellCoord,
  isMineGenerator: IsMineGenerator,
): GameState => {
  if (state.gameOver) return state

  const cells = new Map(state.cells)
  
  let cell = getOrCreateCell(cells, coord, isMineGenerator)

  if (cell.revealed || cell.flagged) {
    return { ...state, cells }
  }
  
  // 隣接セルを生成し、隣接地雷数を計算する
  NEIGHBORS.forEach(n => {
    getOrCreateCell(cells, { x: coord.x + n.x, y: coord.y + n.y }, isMineGenerator)
  })
  const adjacentMines = calculateAdjacentMines(cells, coord)
  cell = { ...cell, adjacentMines }
  cells.set(toCellKey(coord), cell)


  let currentScore = state.score
  let currentLives = state.lives
  let currentNextLifeScoreThreshold = state.nextLifeScoreThreshold
  let currentGameOver: boolean = state.gameOver
  let openedCount = 0

  if (cell.isMine) {
    const updatedCell = { ...cell, revealed: true }
    cells.set(toCellKey(coord), updatedCell)
    currentLives -= 1
    currentGameOver = currentLives <= 0
  } else if (cell.adjacentMines > 0) {
    const updatedCell = { ...cell, revealed: true }
    cells.set(toCellKey(coord), updatedCell)
    openedCount = 1
  } else {
    const result = revealArea(cells, coord, isMineGenerator)
    openedCount = result.openedCount
  }

  if (openedCount > 0) {
    currentScore += openedCount
  }

  while (currentScore >= currentNextLifeScoreThreshold) {
    currentLives += 1
    currentNextLifeScoreThreshold += LIFE_BONUS_THRESHOLD
  }

  const highScore = Math.max(state.highScore, currentScore)

  return {
    ...state,
    cells,
    score: currentScore,
    lives: currentLives,
    nextLifeScoreThreshold: currentNextLifeScoreThreshold,
    highScore,
    gameOver: currentGameOver,
  }
}
export const revealCell = measureTime(_revealCell, 'revealCell')

const _toggleFlag = (
  state: GameState,
  coord: CellCoord,
  isMineGenerator: IsMineGenerator,
): GameState => {
  if (state.gameOver) return state
  const cells = new Map(state.cells)
  const cell = getOrCreateCell(cells, coord, isMineGenerator)
  
  if (cell.revealed) {
    return { ...state, cells }
  }

  const updatedCell = { ...cell, flagged: !cell.flagged }
  cells.set(toCellKey(coord), updatedCell)
  return { ...state, cells }
}
export const toggleFlag = measureTime(_toggleFlag, 'toggleFlag')
