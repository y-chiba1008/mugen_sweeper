import type { CellState } from '../types/game'
import { useGame } from '../context/GameContext'
import { cn } from '../lib/utils'
import { getCellColor } from '../utils/viewUtils'
import { memo } from 'react'

/**
 * 1 マス分のセル表示用コンポーネントの props
 */
type CellProps = {
  /** 表示対象のセル状態 */
  cell: CellState
}

const mineCountColor: { [key: number]: string } = {
  1: 'text-blue-500',
  2: 'text-green-500',
  3: 'text-red-500',
  4: 'text-blue-900',
  5: 'text-yellow-700',
  6: 'text-teal-500',
  7: 'text-black',
  8: 'text-gray-500',
}

/**
 * 1 マス分のセルを表示するコンポーネント
 * 左クリックで開示、右クリックでフラグをトグルする
 */
export const Cell: React.FC<CellProps> = memo(({ cell }) => {
  const { revealCell, toggleFlag, state, isDraggingBoard } = useGame()

  const handleClick = () => {
    if (state.gameOver || isDraggingBoard) return // isDraggingBoard が true の場合は処理を中断
    revealCell(cell.coord)
  }

  const handleRightClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault()
    if (state.gameOver) {
      return
    }
    if (cell.revealed) {
      return
    }
    toggleFlag(cell.coord)
  }

  let content: React.ReactNode = null
  if (cell.revealed) {
    if (cell.isMine) {
      content = '💣'
    } else if (cell.adjacentMines > 0) {
      content = cell.adjacentMines
    }
  } else if (cell.flagged) {
    content = '🚩'
  }

  const backgroundColor = getCellColor(cell)

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleRightClick}
      data-testid={`cell-${cell.coord.x}-${cell.coord.y}`}
      style={{ backgroundColor }}
      className={cn(
        'flex h-[30px] w-[30px] items-center justify-center border-t border-l border-slate-400 text-xs font-bold',
        'select-none',
        cell.revealed
          ? mineCountColor[cell.adjacentMines]
          : 'hover:brightness-110 active:brightness-95',
      )}
    >
      {content}
    </button>
  )
})