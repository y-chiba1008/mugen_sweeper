import { renderHook, act, waitFor } from '@testing-library/react'
import { GameProvider, useGame } from './GameContext'
import { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <GameProvider>{children}</GameProvider>
)

describe('GameContext', () => {
  it('初期化後、resetGame を呼び出すと gameVersion がインクリメントされる', async () => {
    const { result } = renderHook(() => useGame(), { wrapper })

    await waitFor(() => {
      expect(result.current.state.isLoaded).toBe(true)
    })

    expect(result.current.state.gameVersion).toBe(1)

    await act(async () => {
      await result.current.resetGame()
    })

    expect(result.current.state.gameVersion).toBe(2)

    await act(async () => {
      await result.current.resetGame()
    })

    expect(result.current.state.gameVersion).toBe(3)
  })
})
