import { useGame } from '../context/GameContext'
import { cn } from '../lib/utils'

/**
 * スコア・ライフ・ハイスコアなどの主要情報を表示する HUD コンポーネント
 * 画面上部に固定表示される
 */
export const Hud: React.FC = () => {
  const { state, resetGame } = useGame()

  const isNewHighScoreOnGameOver =
    state.gameOver && state.score > 0 && state.score === state.highScore

  const livesIcons = Array.from({ length: state.lives }).map((_, idx) => (
    <span key={idx} className="text-red-500">
      ❤
    </span>
  ))

  return (
    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-100">
      <div className="flex flex-col items-start gap-1">
        <div className="text-sm font-semibold">無限マインスイーパー</div>
        <div className="flex gap-4 text-xs">
          <span>スコア: {state.score}</span>
          <span>ハイスコア: {state.highScore}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-xs text-slate-300">ライフ:</span>
          <span>{livesIcons}</span>
        </div>
        {state.gameOver && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-red-300">ゲームオーバー</span>
            {isNewHighScoreOnGameOver && (
              <span className="text-xs text-yellow-300">ハイスコア更新！ 🎉</span>
            )}
            <button
              type="button"
              onClick={resetGame}
              className={cn(
                'rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900',
                'hover:bg-white active:bg-slate-200',
              )}
            >
              リスタート
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


