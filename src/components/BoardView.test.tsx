import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BoardView } from './BoardView'
import { GameProvider } from '../context/GameContext'

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
})
