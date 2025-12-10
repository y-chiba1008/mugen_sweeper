import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import { Cell } from './Cell'
import { toCellKey } from '../types/game'

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

  const renderedCells = useMemo(() => {
    if (!boardContainerRef.current) return []

    const { clientWidth, clientHeight } = boardContainerRef.current
    const scaledCellSize = CELL_SIZE * scale

    // 描画範囲を少し広げて、スクロール時にセルが突然現れるのを防ぐ
    const margin = 1

    const minX = Math.floor(-offset.x / scaledCellSize) - margin
    const maxX = Math.ceil((clientWidth - offset.x) / scaledCellSize) + margin
    const minY = Math.floor(-offset.y / scaledCellSize) - margin
    const maxY = Math.ceil((clientHeight - offset.y) / scaledCellSize) + margin

    const visibleCells = []
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = toCellKey({ x, y })
        const cell = state.cells.get(key)
        if (cell) {
          const left = x * CELL_SIZE
          const top = y * CELL_SIZE
          visibleCells.push(
            <div key={key} style={{ position: 'absolute', left, top }}>
              <Cell cell={cell} />
            </div>,
          )
        }
      }
    }
    return visibleCells
  }, [state.cells, offset, scale])

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
