import type { PlayerType } from '@/types/game';
import { Trophy, Skull, RotateCcw } from 'lucide-react';

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
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* 背景 */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url(/bg_war_table.jpg)' }}
      />
      <div className="absolute inset-0 bg-black/80 z-[1]" />

      {/* HQ背景 */}
      <div
        className="absolute inset-0 bg-cover bg-center z-[1] opacity-20"
        style={{ backgroundImage: 'url(/hq_castle.jpg)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 p-8">
        {/* 图标 */}
        <div className={`
          w-24 h-24 rounded-full flex items-center justify-center
          ${isWin ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-red-500/20 border-2 border-red-500'}
        `}>
          {isWin ? (
            <Trophy className="w-12 h-12 text-yellow-500" />
          ) : (
            <Skull className="w-12 h-12 text-red-500" />
          )}
        </div>

        {/* 结果 */}
        <h1
          className={`text-5xl font-bold ${isWin ? 'text-yellow-400' : 'text-red-400'}`}
          style={{
            fontFamily: "'Cinzel', serif",
            textShadow: isWin
              ? '0 0 30px rgba(234,179,8,0.5)'
              : '0 0 30px rgba(239,68,68,0.5)',
          }}
        >
          {isWin ? '🎉 胜利！' : '💀 失败'}
        </h1>

        <p className="text-gray-400 text-lg">
          {isWin ? '敌方总部被摧毁！' : '你的总部被摧毁了...'}
        </p>

        {/* 统计 */}
        <div className="flex gap-6 mt-2">
          <div className="bg-gray-900/80 border border-gray-700 rounded-lg px-5 py-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{turn}</div>
            <div className="text-xs text-gray-500">总回合</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-700 rounded-lg px-5 py-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{Math.max(0, playerHp)}</div>
            <div className="text-xs text-gray-500">我方剩余HP</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-700 rounded-lg px-5 py-3 text-center">
            <div className="text-2xl font-bold text-red-400">{Math.max(0, enemyHp)}</div>
            <div className="text-xs text-gray-500">敌方剩余HP</div>
          </div>
        </div>

        {/* 按钮 */}
        <button
          onClick={onRestart}
          className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-yellow-900/30"
        >
          <RotateCcw className="w-5 h-5" />
          再来一局
        </button>
      </div>
    </div>
  );
}
