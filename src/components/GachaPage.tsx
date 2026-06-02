import { useState, useCallback } from 'react';
import { ArrowLeft, Package, Gift, Diamond, Crown, Sparkles } from 'lucide-react';
import { PACK_CONFIG, drawPack, drawTenPacks, recordDrawHistory, loadCounters, saveCounters, getStats } from '@/data/gacha';
import type { PackType, DrawResult, PackResult } from '@/data/gacha';
import GachaAnimation from './GachaAnimation';

const PACK_ICONS: Record<PackType, typeof Package> = {
  normal: Package,
  noble: Gift,
  master: Diamond,
  supreme: Crown,
};

const PACK_BG: Record<PackType, string> = {
  normal: 'from-amber-900/80 to-amber-950/80 border-amber-700',
  noble: 'from-slate-700/80 to-slate-900/80 border-slate-500',
  master: 'from-blue-900/80 to-blue-950/80 border-blue-500',
  supreme: 'from-purple-900/80 to-purple-950/80 border-purple-500',
};

interface Props {
  onBack: () => void;
}

export default function GachaPage({ onBack }: Props) {
  const [counters, setCounters] = useState(loadCounters);
  const [stats, setStats] = useState(getStats);
  const [currentDraw, setCurrentDraw] = useState<{
    results: DrawResult[] | PackResult[];
    mode: 'single' | 'ten';
    packType: PackType;
    packName: string;
  } | null>(null);

  const handleDraw = useCallback((packType: PackType, mode: 'single' | 'ten') => {
    if (mode === 'single') {
      const { results, newCounters } = drawPack(packType, counters);
      setCounters(newCounters);
      saveCounters(newCounters);
      recordDrawHistory(packType, results);
      setCurrentDraw({
        results,
        mode,
        packType,
        packName: PACK_CONFIG[packType].name,
      });
    } else {
      const { results, newCounters } = drawTenPacks(packType, counters);
      setCounters(newCounters);
      saveCounters(newCounters);
      results.forEach(pack => recordDrawHistory(packType, pack.cards));
      setCurrentDraw({
        results,
        mode,
        packType,
        packName: PACK_CONFIG[packType].name,
      });
    }
    setStats(getStats());
  }, [counters]);

  const handleDrawAgain = useCallback(() => {
    if (!currentDraw) return;
    handleDraw(currentDraw.packType, currentDraw.mode);
  }, [currentDraw, handleDraw]);

  return (
    <div className="relative w-full min-h-screen">
      {/* 背景 */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="fixed inset-0 bg-black/80 z-[1]" />

      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 px-3 sm:px-4 py-6 sm:py-8 pb-20">
        {/* 顶部栏 */}
        <div className="w-full max-w-4xl flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 transition-all cursor-pointer hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              卡牌召唤
              <Sparkles className="w-6 h-6 text-amber-400" />
            </h1>
          </div>

          <div className="w-20" /> {/* spacer */}
        </div>

        {/* 统计信息 */}
        <div className="w-full max-w-4xl flex justify-center gap-6 text-sm">
          <div className="px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg">
            <span className="text-gray-400">累计:</span>
            <span className="text-white font-bold ml-1">{stats.total}</span>
            <span className="text-gray-400 text-xs">次</span>
          </div>
          <div className="px-4 py-2 bg-amber-950/60 border border-amber-800 rounded-lg">
            <span className="text-amber-400">铜:</span>
            <span className="text-white font-bold ml-1">{stats.copper}</span>
          </div>
          <div className="px-4 py-2 bg-slate-800/60 border border-slate-600 rounded-lg">
            <span className="text-slate-300">银:</span>
            <span className="text-white font-bold ml-1">{stats.silver}</span>
          </div>
          <div className="px-4 py-2 bg-yellow-950/60 border border-yellow-700 rounded-lg">
            <span className="text-yellow-400">金:</span>
            <span className="text-white font-bold ml-1">{stats.gold}</span>
          </div>
          <div className="px-4 py-2 bg-purple-950/60 border border-purple-700 rounded-lg">
            <span className="text-purple-400">彩:</span>
            <span className="text-white font-bold ml-1">{stats.rainbow}</span>
          </div>
        </div>

        {/* 卡包选择区 */}
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {(Object.entries(PACK_CONFIG) as [PackType, typeof PACK_CONFIG.normal][]).map(([type, config]) => {
            const Icon = PACK_ICONS[type];
            const guaranteeTarget = (config.guarantee.target as string) === 'rainbow' ? '彩' : '金';
            const currentCount = counters[type];
            const guaranteeEvery = config.guarantee.every;

            return (
              <div
                key={type}
                className={`relative flex flex-col p-4 rounded-xl border bg-gradient-to-b ${PACK_BG[type]} backdrop-blur-sm transition-all hover:scale-[1.02]`}
              >
                {/* 卡包图标 */}
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-amber-400" />
                  </div>
                </div>

                {/* 名称 */}
                <h3 className="text-center text-lg font-bold text-white mb-1">{config.name}</h3>
                <p className="text-center text-xs text-gray-400 mb-3">{config.desc}</p>

                {/* 概率 */}
                <div className="space-y-1 mb-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-400">铜卡</span>
                    <span className="text-gray-300">{(config.probabilities.copper * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">银卡</span>
                    <span className="text-gray-300">{(config.probabilities.silver * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">金卡</span>
                    <span className="text-gray-300">{(config.probabilities.gold * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400">彩卡</span>
                    <span className="text-gray-300">{(config.probabilities.rainbow * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 保底进度 */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">保底进度</span>
                    <span className="text-gray-300">{currentCount}/{guaranteeEvery}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.min((currentCount / guaranteeEvery) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 text-center">
                    每{guaranteeEvery}包必出{guaranteeTarget}
                  </div>
                </div>

                {/* 按钮 */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleDraw(type, 'single')}
                    className="flex-1 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 text-sm font-bold transition-all cursor-pointer hover:scale-105"
                  >
                    单抽 (5张)
                  </button>
                  <button
                    onClick={() => handleDraw(type, 'ten')}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 border border-amber-600 rounded-lg text-white text-sm font-bold transition-all cursor-pointer hover:scale-105"
                  >
                    十连 (50张)
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="text-center text-gray-500 text-xs mt-4">
          <p>Demo模式：无限抽卡，无需消耗货币 | 保底计数跨会话保存</p>
          <p className="mt-1">不同品质卡牌有不同的翻转特效：铜(普通) 银(微光) 金(爆发) 彩(彩虹)</p>
        </div>
      </div>

      {/* 抽卡动画覆盖层 */}
      {currentDraw && (
        <GachaAnimation
          results={currentDraw.mode === 'ten'
            ? (currentDraw.results as PackResult[]).flatMap(p => p.cards)
            : currentDraw.results as DrawResult[]
          }
          drawMode={currentDraw.mode}
          packType={currentDraw.packName}
          onClose={() => {
            setCurrentDraw(null);
            setStats(getStats());
          }}
          onDrawAgain={handleDrawAgain}
        />
      )}
    </div>
  );
}
