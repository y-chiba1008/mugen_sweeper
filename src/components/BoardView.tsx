import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
  const { state, setIsDraggingBoard } = useGame()
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false) // ドラッグ中かどうかを判定する新しいステート
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null) // マウスダウン時の座標
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (boardContainerRef.current) {
      const { clientWidth, clientHeight } = boardContainerRef.current
      setContainerSize({ width: clientWidth, height: clientHeight })

      // ResizeObserver を使ってコンテナのリサイズを監視
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      })
      resizeObserver.observe(boardContainerRef.current)

      return () => resizeObserver.disconnect()
    }
  }, [])

  // コンポーネントマウント時、またはゲームのリセット時に中央に配置
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      // (0,0) のセルが中央に来るようにオフセットを計算
      const initialOffsetX = containerSize.width / 2 - CELL_SIZE / 2
      const initialOffsetY = containerSize.height / 2 - CELL_SIZE / 2
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffset({ x: initialOffsetX, y: initialOffsetY })
      setScale(1) // スケールもリセット
    }
  }, [state.gameVersion, containerSize])

  /**
   * 盤面ドラッグ開始時のハンドラ
   */
  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    setIsPanning(true)
    setIsActuallyDragging(false) // ドラッグ状態をリセット
    setLastPos({ x: e.clientX, y: e.clientY })
    setStartPos({ x: e.clientX, y: e.clientY }) // クリック開始位置を記録
  }

  /**
   * ドラッグ中のマウス移動をパン操作として扱うハンドラ
   */
  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isPanning || !lastPos) return

    const dx = e.clientX - lastPos.x
    const dy = e.clientY - lastPos.y

    // 新しく追加: ドラッグとして認識する閾値 (例: 5px)
    const DRAG_THRESHOLD = 5
    if (startPos && !isActuallyDragging) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2),
      )
      if (distance > DRAG_THRESHOLD) {
        setIsActuallyDragging(true)
      }
    }

    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  /**
   * ドラッグ終了（マウスアップ or 領域外に離脱）時のハンドラ
   */
  const handleMouseUpOrLeave: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (isActuallyDragging) {
      // ドラッグ操作だった場合、クリックイベントの伝播を阻止
      e.preventDefault()
      e.stopPropagation()

      // GameContextにドラッグがあったことを通知し、短時間クリックを無効化する
      setIsDraggingBoard(true)
      setTimeout(() => {
        setIsDraggingBoard(false)
      }, 100) // 100ms後にリセット
    }
    setIsPanning(false)
    setIsActuallyDragging(false) // ドラッグ状態をリセット
    setLastPos(null)
    setStartPos(null) // クリック開始位置をリセット
  }

  /**
   * 右クリックメニューを無効化
   */
  const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
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
    if (containerSize.width === 0 || containerSize.height === 0) return []

    const scaledCellSize = CELL_SIZE * scale

    // 描画範囲を少し広げて、スクロール時にセルが突然現れるのを防ぐ
    const margin = 1

    const minX = Math.floor(-offset.x / scaledCellSize) - margin
    const maxX =
      Math.ceil((containerSize.width - offset.x) / scaledCellSize) + margin
    const minY = Math.floor(-offset.y / scaledCellSize) - margin
    const maxY =
      Math.ceil((containerSize.height - offset.y) / scaledCellSize) + margin

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
  }, [state.cells, offset, scale, containerSize])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-800">
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onContextMenu={handleContextMenu}
        id="board-view-container"
        data-testid="board-view-container"
        ref={boardContainerRef}
      >
        <div
          data-testid="game-board"
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
