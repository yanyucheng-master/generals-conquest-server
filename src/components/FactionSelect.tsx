import { useState } from 'react';
import type { Faction } from '@/types/game';
import { FACTIONS } from '@/data/cards';
import { Shield, Crosshair, Sparkles, Swords, BookOpen, Layers, AlertTriangle, ArrowLeft } from 'lucide-react';
import { loadDeck, loadDIYCards, validateDeck } from '@/data/diySystem';
import { ALL_CARDS } from '@/data/cards';
import TutorialPage from './TutorialPage';

interface Props {
  onSelect: (faction: Faction) => void;
  onSelectCustom?: () => void;
  onBack?: () => void;
}

// ======== 我的军团卡片（手机端小版）========
function CustomFactionCardMobile({ onSelect }: { onSelect: () => void }) {
  const deck = loadDeck();
  const isReady = validateDeck(deck, ALL_CARDS, loadDIYCards()).valid;

  return (
    <button
      onClick={onSelect}
      className="faction-card-release relative w-full h-full rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform active:scale-[0.98]"
      style={{ boxShadow: `0 6px 20px rgba(0,0,0,0.5)` }}
    >
      <div className="absolute inset-0 bg-[url('/unit-custom-commander.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,45,35,0.96) 0%, rgba(5,60,45,0.68) 35%, rgba(0,0,0,0.08) 72%)' }} />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>我的军团</h3>
        </div>
        <p className="text-white/70 text-[10px]">使用自定义卡组出战</p>
        <div className="mt-1.5">
          {isReady ? (
            <span className="px-1 py-px bg-emerald-900/80 rounded text-[8px] text-emerald-200">40张就绪</span>
          ) : (
            <span className="px-1 py-px bg-red-900/80 rounded text-[8px] text-red-200">{deck.length}/40张</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ======== 我的军团卡片（桌面端）========
function CustomFactionCard({ onSelect }: { onSelect: () => void }) {
  const deck = loadDeck();
  const counts = validateDeck(deck, ALL_CARDS, loadDIYCards());
  const isReady = counts.valid;

  return (
    <button
      onClick={onSelect}
      className="faction-card-release relative w-56 h-72 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1"
      style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.5)` }}
    >
      <div className="absolute inset-0 bg-[url('/unit-custom-commander.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,45,35,0.96) 0%, rgba(5,60,45,0.68) 35%, rgba(0,0,0,0.08) 72%)' }} />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
        <div className="flex items-center gap-2 mb-1.5">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>我的军团</h3>
        </div>
        <p className="text-white/70 text-xs">使用自定义卡组出战</p>
        <div className="mt-2">
          {isReady ? (
            <div className="flex gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 bg-emerald-900/80 rounded text-[9px] text-emerald-200">40张就绪</span>
              <span className="px-1.5 py-0.5 bg-amber-900/80 rounded text-[9px] text-amber-200">铜:{counts.counts.copper}</span>
              <span className="px-1.5 py-0.5 bg-slate-800/80 rounded text-[9px] text-slate-200">银:{counts.counts.silver}</span>
              <span className="px-1.5 py-0.5 bg-yellow-900/80 rounded text-[9px] text-yellow-200">金:{counts.counts.gold}</span>
            </div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 bg-red-900/80 rounded text-[9px] text-red-200">{deck.length}/40张</span>
              <span className="px-1.5 py-0.5 bg-gray-800/80 rounded text-[9px] text-gray-400">未就绪</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function FactionSelect({ onSelect, onSelectCustom, onBack }: Props) {
  const [selected, setSelected] = useState<Faction | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCustomWarning, setShowCustomWarning] = useState(false);

  const handleSelect = (f: Faction) => {
    setSelected(f);
    setTimeout(() => onSelect(f), 400);
  };

  const handleCustomSelect = () => {
    const deck = loadDeck();
    if (validateDeck(deck, ALL_CARDS, loadDIYCards()).valid) {
      if (onSelectCustom) onSelectCustom();
    } else {
      setShowCustomWarning(true);
      setTimeout(() => setShowCustomWarning(false), 3000);
    }
  };

  const factionImages: Record<Faction, string> = {
    empire: '/unit_empire_champion.jpg',
    wild: '/unit_wild_ranger.jpg',
    arcane: '/unit_arcane_mage.jpg',
  };

  const factionIcons: Record<Faction, React.ReactNode> = {
    empire: <Shield className="w-5 h-5" />,
    wild: <Crosshair className="w-5 h-5" />,
    arcane: <Sparkles className="w-5 h-5" />,
  };

  return (
    <div className="release-screen w-full min-h-screen overflow-y-auto">
      <div className="release-backdrop release-backdrop-menu" />
      <div className="release-vignette" />
      <div className="release-grain" />

      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-5 px-3 sm:px-4 py-6 sm:py-8">
        {/* 返回按钮 */}
        {onBack && (
          <div className="w-full max-w-3xl shrink-0">
            <button
              onClick={onBack}
              className="release-back-button"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回主菜单
            </button>
          </div>
        )}

        {/* 标题 */}
        <div className="text-center space-y-1 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-widest"
              style={{
                fontFamily: "'Cinzel', serif",
                background: 'linear-gradient(180deg, #FDE68A 0%, #D97706 50%, #92400E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 6px rgba(217,119,6,0.4))',
              }}
            >将领：征服</h1>
            <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 scale-x-[-1]" />
          </div>
          <p className="text-gray-400 text-[11px] sm:text-xs tracking-wider">V1.0 — 精确距离战术对决</p>
          <p className="text-gray-500 text-[10px]">选择阵营开始战斗</p>
        </div>

        {/* 阵营卡片 - 手机端水平滑动，桌面端flex-wrap */}
        <div className="w-full max-w-3xl">
          {/* 手机端：水平滑动容器 */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:hidden snap-x snap-mandatory -mx-3 px-3 scrollbar-hide"
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FACTIONS.map(f => {
              const isSelected = selected === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSelect(f.id)}
                  className={`faction-card-release relative w-40 shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform ${isSelected ? 'scale-[1.02] ring-2 ring-yellow-500' : 'active:scale-[0.98]'}`}
                  style={{ boxShadow: `0 6px 20px rgba(0,0,0,0.5)`, aspectRatio: '3/4' }}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${factionImages[f.id]})` }} />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${f.accent}ee 0%, ${f.accent}99 30%, transparent 70%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-yellow-400">{factionIcons[f.id]}</span>
                      <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>{f.name}</h3>
                    </div>
                    <p className="text-white/70 text-[10px] leading-tight">{f.desc}</p>
                    <div className="mt-1.5 flex gap-1 flex-wrap">
                      {f.id === 'empire' && <><span className="px-1 py-px bg-red-900/80 rounded text-[8px] text-red-200">嘲讽</span><span className="px-1 py-px bg-red-900/80 rounded text-[8px] text-red-200">指挥</span></>}
                      {f.id === 'wild' && <><span className="px-1 py-px bg-green-900/80 rounded text-[8px] text-green-200">DOT</span><span className="px-1 py-px bg-green-900/80 rounded text-[8px] text-green-200">狙击</span></>}
                      {f.id === 'arcane' && <><span className="px-1 py-px bg-blue-900/80 rounded text-[8px] text-blue-200">魔法</span><span className="px-1 py-px bg-blue-900/80 rounded text-[8px] text-blue-200">控制</span></>}
                    </div>
                  </div>
                </button>
              );
            })}
            {/* 手机端自定义卡组卡片 */}
            <div className="shrink-0 snap-center w-40" style={{ aspectRatio: '3/4' }}>
              <CustomFactionCardMobile onSelect={handleCustomSelect} />
            </div>
          </div>

          {/* 桌面端：flex-wrap */}
          <div className="hidden sm:flex gap-4 flex-wrap justify-center">
            {FACTIONS.map(f => {
              const isSelected = selected === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSelect(f.id)}
                  className={`faction-card-release relative w-56 h-72 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform ${isSelected ? 'scale-105 ring-3 ring-yellow-500' : 'hover:scale-[1.03] hover:-translate-y-1'}`}
                  style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.5)` }}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${factionImages[f.id]})` }} />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${f.accent}ee 0%, ${f.accent}99 30%, transparent 70%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-yellow-400">{factionIcons[f.id]}</span>
                      <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>{f.name}</h3>
                    </div>
                    <p className="text-white/70 text-xs">{f.desc}</p>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {f.id === 'empire' && <><span className="px-1.5 py-0.5 bg-red-900/80 rounded text-[9px] text-red-200">嘲讽</span><span className="px-1.5 py-0.5 bg-red-900/80 rounded text-[9px] text-red-200">指挥</span><span className="px-1.5 py-0.5 bg-red-900/80 rounded text-[9px] text-red-200">重甲</span></>}
                      {f.id === 'wild' && <><span className="px-1.5 py-0.5 bg-green-900/80 rounded text-[9px] text-green-200">DOT</span><span className="px-1.5 py-0.5 bg-green-900/80 rounded text-[9px] text-green-200">狙击</span><span className="px-1.5 py-0.5 bg-green-900/80 rounded text-[9px] text-green-200">飞翔</span></>}
                      {f.id === 'arcane' && <><span className="px-1.5 py-0.5 bg-blue-900/80 rounded text-[9px] text-blue-200">魔法</span><span className="px-1.5 py-0.5 bg-blue-900/80 rounded text-[9px] text-blue-200">控制</span><span className="px-1.5 py-0.5 bg-blue-900/80 rounded text-[9px] text-blue-200">利息</span></>}
                    </div>
                  </div>
                </button>
              );
            })}
            <CustomFactionCard onSelect={handleCustomSelect} />
          </div>
        </div>

        {showCustomWarning && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-900/90 border border-red-600 rounded-lg text-red-300 text-sm flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4" /> 请先完成40张卡组
          </div>
        )}

        <button onClick={() => setShowTutorial(true)} className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-blue-900/60 hover:bg-blue-800/60 border border-blue-700/40 rounded-lg text-blue-300 text-xs sm:text-sm font-bold transition-all cursor-pointer hover:scale-[1.02] shrink-0">
          <BookOpen className="w-4 h-4" />新手教程（推荐先阅读）
        </button>

        <div className="text-center text-gray-500 text-[9px] sm:text-[10px] max-w-sm leading-relaxed px-2 shrink-0">
          精确距离 | 前线不存在则跳过 | 护甲破碎抵挡溢出 | 法伤/真伤无视护甲 | 狙击距离1盲区
        </div>
      </div>

      {showTutorial && (
        <TutorialPage
          onClose={() => setShowTutorial(false)}
          onBack={onBack}
        />
      )}
    </div>
  );
}
