/**
 * ミニマップモーダルのレイアウト定数（単一の定義元）。
 * MinimapModal.tsx のスタイルと minimapUtils のサイズ計算は、いずれもここを参照する。
 */

/** MinimapModal: `max-w-[90vw]` */
export const MODAL_VIEWPORT_WIDTH_RATIO = 0.9

/** MinimapModal: `max-h-[90vh]` */
export const MODAL_VIEWPORT_HEIGHT_RATIO = 0.9

/** MinimapModal: `p-4` の 1 辺（16px） */
export const MODAL_PADDING = 16

/** MinimapModal: `p-4` の左右合計（16px × 2） */
export const MODAL_PADDING_X = MODAL_PADDING * 2

/** MinimapModal: `p-4` の上下合計（16px × 2） */
export const MODAL_PADDING_Y = MODAL_PADDING * 2

/** MinimapModal: ヘッダー行（`text-sm` + 閉じるボタン）+ `mb-3` */
export const MODAL_HEADER_BLOCK_HEIGHT = 36

export const minimapModalMaxWidthStyle = `${MODAL_VIEWPORT_WIDTH_RATIO * 100}vw`
export const minimapModalMaxHeightStyle = `${MODAL_VIEWPORT_HEIGHT_RATIO * 100}vh`

/** Canvas 親要素の幅（モーダル内パディングを除いた最大幅） */
export const minimapCanvasAreaMaxWidthStyle = `calc(${MODAL_VIEWPORT_WIDTH_RATIO * 100}vw - ${MODAL_PADDING_X}px)`

/** Canvas 親要素の高さ（モーダル内パディングとヘッダーを除いた最大高さ） */
export const minimapCanvasAreaMaxHeightStyle = `calc(${MODAL_VIEWPORT_HEIGHT_RATIO * 100}vh - ${MODAL_PADDING_Y + MODAL_HEADER_BLOCK_HEIGHT}px)`

export const toAvailableDimension = (available: number): number =>
  Math.max(1, Math.floor(available))

/**
 * ビューポートサイズから Canvas 表示可能領域を推定する（SSR・テスト用のフォールバック）
 */
export const getMinimapMaxDimensionsFromViewport = (
  innerWidth: number,
  innerHeight: number,
): { maxWidth: number; maxHeight: number } => ({
  maxWidth: toAvailableDimension(
    innerWidth * MODAL_VIEWPORT_WIDTH_RATIO - MODAL_PADDING_X,
  ),
  maxHeight: toAvailableDimension(
    innerHeight * MODAL_VIEWPORT_HEIGHT_RATIO -
      MODAL_PADDING_Y -
      MODAL_HEADER_BLOCK_HEIGHT,
  ),
})

/**
 * ResizeObserver で得た Canvas 親要素の contentRect から表示可能領域を算出する
 */
export const getMinimapMaxDimensionsFromContentRect = (
  width: number,
  height: number,
): { maxWidth: number; maxHeight: number } => ({
  maxWidth: toAvailableDimension(width),
  maxHeight: toAvailableDimension(height),
})
