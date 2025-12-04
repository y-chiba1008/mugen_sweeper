import './App.css'
import { GameProvider } from './context/GameContext'
import { BoardView } from './components/BoardView'
import { Hud } from './components/Hud'

/**
 * アプリケーションのルートコンポーネント
 * ゲームコンテキストと HUD / 盤面表示を構成する
 */
function App() {
  return (
    <GameProvider>
      <div className="app-root">
        <Hud />
        <main className="board-container">
          <BoardView />
        </main>
      </div>
    </GameProvider>
  )
}

export default App
