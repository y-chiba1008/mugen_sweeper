import type { CellState } from '../types/game'
import { useGame } from '../context/GameContext'
import { cn } from '../lib/utils'

/**
 * 1 マス分のセル表示用コンポーネントの props
 */
type CellProps = {
  /** 表示対象のセル状態 */
  cell: CellState
}

/**
 * 1 マス分のセルを表示するコンポーネント
 * 左クリックで開示、右クリックでフラグをトグルする
 */
export const Cell: React.FC<CellProps> = ({ cell }) => {
  const { revealCell, toggleFlag, state } = useGame()

  const handleClick = () => {
    if (state.gameOver) return
    revealCell(cell.coord)
  }

  const handleRightClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault()
    if (state.gameOver) return
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

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center border border-slate-400 text-xs',
        'select-none',
        cell.revealed
          ? 'bg-slate-200'
          : 'bg-slate-300 hover:bg-slate-200 active:bg-slate-100',
      )}
    >
      {content}
    </button>
  )
}


