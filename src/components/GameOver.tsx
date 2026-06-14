import type { PlayerType } from '@/types/game';
import { Heart, RotateCcw, Shield, Skull, Trophy } from 'lucide-react';

interface Props {
  winner: PlayerType | null;
  turn: number;
  onRestart: () => void;
  playerHp: number;
  enemyHp: number;
}

export default function GameOver({ winner, turn, onRestart, playerHp, enemyHp }: Props) {
  const isWin = winner === 'player';

  return (
    <main className="release-screen flex items-center justify-center p-4">
      <div className="release-backdrop release-backdrop-menu" />
      <div className="release-vignette" />
      <div className="release-grain" />

      <section className={`result-panel ${isWin ? 'result-panel-win' : 'result-panel-loss'}`}>
        <div className="result-emblem">
          {isWin ? <Trophy className="w-9 h-9" /> : <Skull className="w-9 h-9" />}
        </div>

        <div className="release-panel-eyebrow">{isWin ? 'CONQUEST COMPLETE' : 'COMMAND DEFEATED'}</div>
        <h1 className={`mt-2 text-4xl sm:text-5xl font-bold release-display ${isWin ? 'text-amber-200' : 'text-red-300'}`}>
          {isWin ? '征服胜利' : '防线溃败'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          {isWin ? '敌方总部已被摧毁，你赢得了这片战场。' : '我方总部失守，重新整备军团再战。'}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 w-full">
          <div className="result-stat">
            <Shield className="w-4 h-4 text-amber-400" />
            <strong>{turn}</strong>
            <span>总回合</span>
          </div>
          <div className="result-stat">
            <Heart className="w-4 h-4 text-blue-400" />
            <strong>{Math.max(0, playerHp)}</strong>
            <span>我方总部</span>
          </div>
          <div className="result-stat">
            <Heart className="w-4 h-4 text-red-400" />
            <strong>{Math.max(0, enemyHp)}</strong>
            <span>敌方总部</span>
          </div>
        </div>

        <button onClick={onRestart} className="result-action">
          <RotateCcw className="w-4 h-4" />
          返回战争议会
        </button>
      </section>
    </main>
  );
}
