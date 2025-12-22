import { describe, it, expect } from 'vitest'
import type { GameState, CellState, CellKey, CellCoord } from '../types/game'
import { toCellKey } from '../types/game'
import { revealCell, toggleFlag, defaultIsMineGenerator } from './gameLogic'
import { INITIAL_LIVES, LIFE_BONUS_THRESHOLD } from '../config/gameConfig'

// --- テスト用のヘルパーとモック ---

const createInitialState = (initial?: Partial<GameState>): GameState => ({
  cells: new Map<CellKey, CellState>(),
  score: 0,
  lives: INITIAL_LIVES,
  highScore: 0,
  nextLifeScoreThreshold: LIFE_BONUS_THRESHOLD,
  gameOver: false,
  isLoaded: true,
  ...initial,
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const alwaysMine = (_coord: CellCoord) => true
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const neverMine = (_coord: CellCoord) => false

// --- テストケース ---

describe('gameLogic', () => {
  describe('revealCell', () => {
    it('安全なセル（隣接地雷あり）を開くと、スコアが1増え、セルが開示される', () => {
      const initialState = createInitialState()
      const coord = { x: 0, y: 0 }
      const mineCoord = { x: 1, y: 1 }

      // (1,1) の座標だけが地雷になるような isMineGenerator を作成
      const isMineGenerator = (c: CellCoord) => toCellKey(c) === toCellKey(mineCoord)

      const newState = revealCell(initialState, coord, isMineGenerator)

      expect(newState.score).toBe(1)
      const revealedCell = newState.cells.get(toCellKey(coord))
      expect(revealedCell?.revealed).toBe(true)
      expect(revealedCell?.adjacentMines).toBe(1) // 隣接地雷が正しく計算されているか
      expect(newState.gameOver).toBe(false)
    })

    it('地雷セルを開くと、ライフが1減り、ゲームオーバーにはならない（まだライフがある場合）', () => {
      const initialState = createInitialState({ lives: 3 })
      const coord = { x: 2, y: 2 } // 安全地帯外の座標

      const newState = revealCell(initialState, coord, alwaysMine)

      expect(newState.lives).toBe(2)
      expect(newState.gameOver).toBe(false)
      expect(newState.cells.get(toCellKey(coord))?.revealed).toBe(true)
    })

    it('最後のライフで地雷セルを開くと、ゲームオーバーになる', () => {
      const initialState = createInitialState({ lives: 1 })
      const coord = { x: 2, y: 2 } // 安全地帯外の座標

      const newState = revealCell(initialState, coord, alwaysMine)

      expect(newState.lives).toBe(0)
      expect(newState.gameOver).toBe(true)
    })

    it('安全なセル（隣接地雷なし）を開くと、隣接エリアが自動で開示される', () => {
      const initialState = createInitialState()
      const startCoord = { x: 0, y: 0 }

      const newState = revealCell(initialState, startCoord, neverMine)

      expect(newState.score).toBeGreaterThan(1)
      expect(newState.cells.get(toCellKey(startCoord))?.revealed).toBe(true)
      expect(newState.cells.get(toCellKey({ x: 1, y: 0 }))?.revealed).toBe(true)
    })

    it('すでに開示済みのセルを再度開こうとしても、ゲーム状態は変わらない', () => {
      const coord = { x: 0, y: 0 }
      const cells = new Map<CellKey, CellState>()
      cells.set(toCellKey(coord), {
        coord,
        isMine: false,
        adjacentMines: 0,
        revealed: true,
        flagged: false,
      })
      const initialState = createInitialState({ score: 1, lives: 2, cells })

      const newState = revealCell(initialState, coord, neverMine)

      // ensureCell によって新しいセルが Map に追加される可能性はあるが、
      // ゲームの主要な状態は変わらないことを確認する
      expect(newState.score).toBe(initialState.score)
      expect(newState.lives).toBe(initialState.lives)
      expect(newState.gameOver).toBe(initialState.gameOver)
      expect(newState.cells.get(toCellKey(coord))?.revealed).toBe(true)
    })
  })

  describe('toggleFlag', () => {
    it('未開示のセルにフラグを立てることができる', () => {
      const initialState = createInitialState()
      const coord = { x: 0, y: 0 }

      const newState = toggleFlag(initialState, coord, neverMine)
      expect(newState.cells.get(toCellKey(coord))?.flagged).toBe(true)
    })

    it('フラグが立っているセルで再度呼び出すと、フラグが外れる', () => {
      const coord = { x: 0, y: 0 }
      const cells = new Map<CellKey, CellState>()
      cells.set(toCellKey(coord), {
        coord,
        isMine: false,
        adjacentMines: 0,
        revealed: false,
        flagged: true,
      })
      const initialState = createInitialState({ cells })

      const newState = toggleFlag(initialState, coord, neverMine)
      expect(newState.cells.get(toCellKey(coord))?.flagged).toBe(false)
    })

    it('開示済みのセルにはフラグを立てられない', () => {
      const coord = { x: 0, y: 0 }
      const cells = new Map<CellKey, CellState>()
      cells.set(toCellKey(coord), {
        coord,
        isMine: false,
        adjacentMines: 0,
        revealed: true,
        flagged: false,
      })
      const initialState = createInitialState({ cells })

      const newState = toggleFlag(initialState, coord, neverMine)

      expect(newState.cells.get(toCellKey(coord))?.flagged).toBe(false)
    })
  })

  describe('defaultIsMineGenerator', () => {
    it('中心 (0,0) 周辺の9マスには地雷を生成しない', () => {
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const coord = { x, y }
          // 確率に依存せず、常に false であることを確認
          expect(defaultIsMineGenerator(coord)).toBe(false)
        }
      }
    })

    it('中心周辺以外の座標では、確率で地雷を生成することがある', () => {
      const coord1 = { x: 2, y: 2 }
      const coord2 = { x: -2, y: -2 }
      const results1 = Array.from({ length: 1000 }, () => defaultIsMineGenerator(coord1))
      const results2 = Array.from({ length: 1000 }, () => defaultIsMineGenerator(coord2))

      // 1000回中、少なくとも1回は true (地雷あり) と false (地雷なし) が含まれることを期待する
      // これにより、単に true/false を返すだけでないことを確認する
      expect(results1).toContain(true)
      expect(results1).toContain(false)
      expect(results2).toContain(true)
      expect(results2).toContain(false)
    })
  })
})
