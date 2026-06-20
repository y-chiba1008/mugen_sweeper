/** 1 セルあたりの表示サイズ（px）— BoardView と共有 */
export const CELL_SIZE = 32

/**
 * 指定セルをビューポート中央に置くためのオフセットを計算する
 */
export const cellCenterToOffset = (
  cellX: number,
  cellY: number,
  containerWidth: number,
  containerHeight: number,
  scale: number,
): { x: number; y: number } => ({
  x: containerWidth / 2 - (cellX * CELL_SIZE + CELL_SIZE / 2) * scale,
  y: containerHeight / 2 - (cellY * CELL_SIZE + CELL_SIZE / 2) * scale,
})

/**
 * オフセットをイージング付きでアニメーションする
 */
export const animateOffset = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  onUpdate: (offset: { x: number; y: number }) => void,
  durationMs = 300,
): (() => void) => {
  const startTime = performance.now()
  let frameId = 0

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / durationMs)
    const eased = 1 - Math.pow(1 - t, 3)
    onUpdate({
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    })
    if (t < 1) {
      frameId = requestAnimationFrame(step)
    }
  }

  frameId = requestAnimationFrame(step)

  return () => cancelAnimationFrame(frameId)
}
