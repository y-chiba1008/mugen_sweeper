import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import { Cell } from './Cell'

/** 1 セルあたりの表示サイズ（px） */
const CELL_SIZE = 32

/**
 * 無限マインスイーパーの盤面を表示するコンポーネント
 * - 既知セルのみを絶対配置で描画
 * - マウスドラッグでパン
 * - ホイールでズームイン/アウト
 */
export const BoardView: React.FC = () => {
  const { state } = useGame()
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)

  // コンポーネントマウント時に中央に配置するためのオフセットを計算
  useEffect(() => {
    if (boardContainerRef.current) {
      const { clientWidth, clientHeight } = boardContainerRef.current
      // (0,0) のセルが中央に来るようにオフセットを計算
      const initialOffsetX = clientWidth / 2 - CELL_SIZE / 2
      const initialOffsetY = clientHeight / 2 - CELL_SIZE / 2
      setOffset({ x: initialOffsetX, y: initialOffsetY })
    }
  }, []) // 依存配列を空にして、マウント時にのみ実行

  /**
   * 盤面ドラッグ開始時のハンドラ
   */
  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    setIsPanning(true)
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  /**
   * ドラッグ中のマウス移動をパン操作として扱うハンドラ
   */
  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isPanning || !lastPos) return
    const dx = e.clientX - lastPos.x
    const dy = e.clientY - lastPos.y
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  /**
   * ドラッグ終了（マウスアップ or 領域外に離脱）時のハンドラ
   */
  const handleMouseUpOrLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    setIsPanning(false)
    setLastPos(null)
  }

  /**
   * ホイール操作によるズームイン/アウトのハンドラ
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (!boardContainerRef.current) return

      const rect = boardContainerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.min(2, Math.max(0.5, scale + delta))
      const ratio = newScale / scale

      setOffset((prev) => ({
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
      }))
      setScale(newScale)
    },
    [scale],
  )

  useEffect(() => {
    const targetDiv = document.getElementById('board-view-container')
    if (targetDiv) {
      // wheel イベントリスナーを targetDiv に設定
      targetDiv.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      if (targetDiv) {
        targetDiv.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  const cellsArray = useMemo(
    () => {
        const start = performance.now()
        const result = Array.from(state.cells.entries()).map(([key, cell]) => ({ key, cell }))
        const end = performance.now()
        console.log(`[Performance] useMemo(cellsArray) took ${end - start}ms`)
        return result
    },
    [state.cells],
  )

  const renderedCells = useMemo(() => {
    const start = performance.now()
    const result = cellsArray.map(({ key, cell }) => {
      const { x, y } = cell.coord
      const left = x * CELL_SIZE
      const top = y * CELL_SIZE
      return (
        <div key={key} style={{ position: 'absolute', left, top }}>
          <Cell cell={cell} />
        </div>
      )
    })
    const end = performance.now()
    console.log(`[Performance] useMemo(renderedCells) took ${end - start}ms`)
    return result
  }, [cellsArray])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-800">
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        id="board-view-container"
        ref={boardContainerRef}
      >
        <div
          style={{
            position: 'absolute',
            left: offset.x,
            top: offset.y,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {renderedCells}
        </div>
      </div>
    </div>
  )
}


