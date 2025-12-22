import { render, screen, waitFor, fireEvent } from '@testing-library/react' // fireEvent を再インポート
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { BoardView } from './BoardView'
import { GameProvider, useGame } from '../context/GameContext'

// resetGameを呼び出すためのヘルパーコンポーネント
const TestComponent = () => {
  const { resetGame } = useGame()
  return (
    <>
      <BoardView />
      <button onClick={resetGame}>Reset</button>
    </>
  )
}

// jsdom 環境での要素サイズをモック
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 })
})

describe('BoardView', () => {
  it('右クリックでコンテキストメニューが表示されないこと', () => {
    render(
      <GameProvider>
        <BoardView />
      </GameProvider>,
    )

    const boardContainer = screen.getByTestId('board-view-container')
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })

    // preventDefault が呼ばれたかどうかをスパイする
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')

    fireEvent(boardContainer, contextMenuEvent)

    // preventDefault が呼び出されたことを確認
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('ゲームリセットで盤面の表示がリセットされること', async () => {
    const user = userEvent.setup()

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    )

    const boardElement = screen.getByTestId('game-board')

    // BoardView の useEffect が実行され、offset/scale が更新されるのを待つ
    // left と top が計算された初期値になっていることを確認し、その値を返す
    const { initialLeft, initialTop, initialTransform } = await waitFor(() => {
      expect(boardElement.style.left).not.toBe('0px')
      expect(boardElement.style.top).not.toBe('0px')
      expect(boardElement.style.transform).toBe('scale(1)')
      return {
        initialLeft: boardElement.style.left,
        initialTop: boardElement.style.top,
        initialTransform: boardElement.style.transform,
      }
    })

    // リセットボタンをクリック
    const resetButton = screen.getByText('Reset')
    await user.click(resetButton)

    // left, top, transform が初期状態に戻ったことを確認
    await waitFor(() => {
      expect(boardElement.style.left).toBe(initialLeft)
      expect(boardElement.style.top).toBe(initialTop)
      expect(boardElement.style.transform).toBe(initialTransform)
    })
  })
})
