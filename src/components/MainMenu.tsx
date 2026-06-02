import { Swords, Globe, BookOpen, Sparkles, Layers } from 'lucide-react';

interface Props {
  onLocalGame: () => void;
  onMultiplayer: () => void;
  onTutorial: () => void;
  onGacha: () => void;
  onDeckBuilder: () => void;
}

export default function MainMenu({ onLocalGame, onMultiplayer, onTutorial, onGacha, onDeckBuilder }: Props) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* 背景 */}
      <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="absolute inset-0 bg-black/70 z-[1]" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Logo + 标题 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="将领：征服"
              className="w-48 h-auto object-contain drop-shadow-[0_0_20px_rgba(217,119,6,0.5)] hover:drop-shadow-[0_0_30px_rgba(217,119,6,0.7)] transition-all duration-500 hover:scale-105"
              draggable={false}
            />
          </div>
          <p className="text-gray-400 text-sm tracking-wider">v1.0 — 战术卡牌对决</p>
          <p className="text-gray-500 text-xs">支持本地对战 & 联机对战</p>
        </div>

        {/* 菜单按钮 */}
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={onLocalGame}
            className="w-full py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 border border-red-600 rounded-lg text-white font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <Swords className="w-5 h-5" />
            本地对战
          </button>

          <button
            onClick={onMultiplayer}
            className="w-full py-3 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 border border-blue-600 rounded-lg text-white font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <Globe className="w-5 h-5" />
            联机对战
          </button>

          <button
            onClick={onTutorial}
            className="w-full py-2.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <BookOpen className="w-4 h-4" />
            新手教程
          </button>

          <button
            onClick={onGacha}
            className="w-full py-2.5 bg-gradient-to-r from-amber-900/90 to-amber-800/90 hover:from-amber-800 hover:to-amber-700 border border-amber-600 rounded-lg text-amber-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            抽卡体验
          </button>

          <button
            onClick={onDeckBuilder}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-900/90 to-emerald-800/90 hover:from-emerald-800 hover:to-emerald-700 border border-emerald-600 rounded-lg text-emerald-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <Layers className="w-4 h-4" />
            我的卡组
          </button>
        </div>

        {/* 底部提示 */}
        <div className="text-center text-gray-500 text-[10px] max-w-sm leading-relaxed mt-4">
          <p>💡 精确距离 | 前线不存在则跳过 | 护甲破碎抵挡溢出</p>
          <p>法伤/真伤无视护甲 | 狙击距离1盲区</p>
        </div>
      </div>
    </div>
  );
}
