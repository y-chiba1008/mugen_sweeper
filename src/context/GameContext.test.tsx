
import { renderHook, act } from '@testing-library/react'
import { GameProvider, useGame } from './GameContext'
import { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <GameProvider>{children}</GameProvider>
)

describe('GameContext', () => {
  it('初期化後、resetGame を呼び出すと gameVersion がインクリメントされる', () => {
    const { result } = renderHook(() => useGame(), { wrapper })

    // 初期化（LOAD_FROM_STORAGE）によって gameVersion は 1 になる
    expect(result.current.state.gameVersion).toBe(1)

    act(() => {
      result.current.resetGame()
    })

    // resetGame で 2 になる
    expect(result.current.state.gameVersion).toBe(2)

    act(() => {
      result.current.resetGame()
    })

    // 再度 resetGame で 3 になる
    expect(result.current.state.gameVersion).toBe(3)
  })
})
