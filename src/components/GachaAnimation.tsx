import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DrawResult, Rarity } from '@/data/gacha';
import { RARITY_COLORS, RARITY_NAMES } from '@/data/gacha';

// ===================== 类型定义 =====================
type DrawState =
  | 'closed'           // 关闭
  | 'pack_opening'     // 卡包开箱动画中
  | 'cards_showing'    // 卡牌背面展示，等待用户操作
  | 'flipping'         // 单张翻转中
  | 'all_opening'      // 打开全部动画中
  | 'result_showing'   // 结果展示
  | 'sorting'          // 结算排序动画中（十连）
  | 'sorted'           // 已按品质排序（十连）
  | 'restoring';       // 恢复原始顺序动画中（十连）

interface Props {
  results: DrawResult[];
  drawMode: 'single' | 'ten';
  packType: string;
  onClose: () => void;
  onDrawAgain: () => void;
}

// ===================== 常量 =====================
const FLIP_DURATION = 600; // 单张翻转0.6秒
const BATCH_DELAYS: Record<Rarity, number> = {
  copper: 0,
  silver: 100,
  gold: 200,
  rainbow: 300,
};
const FLY_DELAYS: Record<Rarity, number> = {
  rainbow: 0,
  gold: 100,
  silver: 200,
  copper: 300,
};
const COLS = 10; // 十连网格10列

// ===================== 工具函数 =====================
function sortByRarity(cards: DrawResult[]): DrawResult[] {
  const order: Record<string, number> = { rainbow: 4, gold: 3, silver: 2, copper: 1 };
  return [...cards].sort((a, b) => {
    const d = order[b.rarity] - order[a.rarity];
    return d !== 0 ? d : b.card.cost - a.card.cost;
  });
}

// ===================== 子组件 =====================

// ---- 单张抽卡：卡包开箱动画 ----
function PackOpening({ onDone }: { onDone: () => void }) {
  const [shake, setShake] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShake(true), 300);
    const t2 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`w-32 h-44 rounded-xl flex items-center justify-center relative ${shake ? 'animate-pack-shake' : 'animate-pulse'}`}
        style={{
          background: 'linear-gradient(135deg, #8B6914, #DAA520, #8B6914)',
          border: '3px solid #FFD700',
          boxShadow: '0 0 20px rgba(218,165,32,0.5)',
        }}
      >
        <div className="absolute inset-2 rounded-lg border border-amber-300/30" />
        <span className="text-5xl font-bold text-amber-100" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>?</span>
      </div>
      <div className="text-amber-400 text-sm animate-pulse">正在打开卡包...</div>
    </div>
  );
}

// ---- 十连：10个卡包堆叠 ----
function PackStack({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-48 h-56">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="absolute w-32 h-44 rounded-xl flex items-center justify-center animate-pack-burst"
            style={{
              left: `${40 + (i - 4.5) * 6}px`,
              top: `${20 + Math.sin(i * 0.7) * 10}px`,
              zIndex: 10 - i,
              background: 'linear-gradient(135deg, #8B6914, #DAA520, #8B6914)',
              border: '2px solid #FFD700',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <span className="text-3xl font-bold text-amber-100">?</span>
          </div>
        ))}
      </div>
      <div className="text-amber-400 text-lg font-bold animate-pulse">十连召唤！</div>
    </div>
  );
}

// ---- 卡背 ----
function CardBack({ size = 'normal', onClick, disabled = false }: {
  size?: 'normal' | 'small';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isSmall = size === 'small';
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-lg flex items-center justify-center select-none ${
        disabled ? 'cursor-default' : 'cursor-pointer hover:scale-105'
      } ${isSmall ? 'w-16 h-22 sm:w-20 sm:h-28' : 'w-24 h-36 sm:w-28 sm:h-40'}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '2px solid #4a4a6a',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <span
        className={`font-bold opacity-50 ${isSmall ? 'text-2xl' : 'text-4xl'}`}
        style={{ color: '#6a6a8a' }}
      >?</span>
    </div>
  );
}

// ---- 卡牌正面（带翻转动画和光效）----
function CardFront({ result, size = 'normal' }: {
  result: DrawResult;
  size?: 'normal' | 'small';
}) {
  const isSmall = size === 'small';
  const colors = RARITY_COLORS[result.rarity];
  const card = result.card;
  const isUnit = card.type === '士兵';

  return (
    <div
      className={`rounded-lg overflow-hidden relative ${isSmall ? 'w-16 h-22 sm:w-20 sm:h-28' : 'w-24 h-36 sm:w-28 sm:h-40'}`}
      style={{
        border: `2px solid ${result.rarity === 'rainbow' ? '#ff00ff' : result.rarity === 'gold' ? '#FFD700' : result.rarity === 'silver' ? '#C0C0C0' : '#8B7355'}`,
        background: result.rarity === 'rainbow'
          ? 'linear-gradient(135deg, #1a0a2e, #2d1b4e)'
          : result.rarity === 'gold'
          ? 'linear-gradient(135deg, #2a2008, #3a3010)'
          : result.rarity === 'silver'
          ? 'linear-gradient(135deg, #1e1e28, #2a2a36)'
          : 'linear-gradient(135deg, #2a2520, #3a3530)',
      }}
    >
      {/* 品质光效 */}
      {result.rarity === 'silver' && <div className="absolute inset-0 animate-silver-shine pointer-events-none z-20" />}
      {result.rarity === 'gold' && <div className="absolute inset-0 animate-gold-burst pointer-events-none z-20" />}
      {result.rarity === 'rainbow' && <div className="absolute inset-0 animate-rainbow-glow pointer-events-none z-20" />}

      {/* 保底标签 */}
      {result.isGuaranteed && (
        <div className="absolute -top-1.5 -right-1.5 z-30 animate-guarantee-pop">
          <div
            className="px-1.5 py-0.5 rounded text-white font-bold"
            style={{
              fontSize: isSmall ? '7px' : '9px',
              background: 'linear-gradient(135deg, #ff0000, #ff6600)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            保底
          </div>
        </div>
      )}

      {/* 卡牌内容 */}
      <div className="relative z-10 flex flex-col h-full p-0.5">
        <div className={`text-center ${isSmall ? 'text-[7px]' : 'text-[8px]'} ${colors.text} font-bold truncate leading-tight`}>
          {card.name}
        </div>
        <div className="flex justify-between items-center mt-0.5 px-0.5">
          <div
            className={`bg-blue-900 border border-blue-500 rounded-full flex items-center justify-center text-blue-200 font-bold ${isSmall ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[7px]'}`}
          >
            {card.cost}
          </div>
          <div className={`${isSmall ? 'text-[6px]' : 'text-[7px]'} ${colors.text} font-bold`}>
            {RARITY_NAMES[result.rarity]}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <div className={`${isSmall ? 'text-[6px]' : 'text-[7px]'} ${isUnit ? 'text-gray-400' : 'text-purple-300'}`}>
            {isUnit ? card.subtype : '法术'}
          </div>
          <div className={`flex gap-1 ${isSmall ? 'text-[7px]' : 'text-[8px]'}`}>
            {isUnit ? (
              <>
                <span className="text-red-400 font-bold">{card.atk}</span>
                <span className="text-gray-600">/</span>
                <span className="text-green-400 font-bold">{card.hp}</span>
              </>
            ) : (
              <span className="text-purple-400 font-bold">--</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 翻转中的卡牌（卡背→正面过渡）----
function FlippingCard({ result, size = 'normal', delay = 0 }: {
  result: DrawResult;
  size?: 'normal' | 'small';
  delay?: number;
}) {
  const [phase, setPhase] = useState<'back' | 'flipping' | 'front'>('back');
  const isSmall = size === 'small';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flipping'), delay);
    const t2 = setTimeout(() => setPhase('front'), delay + FLIP_DURATION / 2);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay]);

  if (phase === 'back') {
    return <CardBack size={size} disabled />;
  }

  return (
    <div
      className={isSmall ? 'w-16 h-22 sm:w-20 sm:h-28' : 'w-24 h-36 sm:w-28 sm:h-40'}
      style={{
        perspective: '600px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          animation: phase === 'flipping' ? `cardFlip ${FLIP_DURATION}ms ease-in-out forwards` : 'none',
          transform: phase === 'front' ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: phase === 'front' ? 'none' : undefined,
        }}
      >
        <div
          className="absolute inset-0 rounded-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardBack size={size} disabled />
        </div>
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* 父容器已处理翻转，CardFront只负责显示正面 */}
          <CardFront result={result} size={size} />
        </div>
      </div>
    </div>
  );
}

// ---- 可点击翻开的单抽卡牌 ----
function ClickableCard({ result, onFlip, disabled }: {
  result: DrawResult;
  onFlip: () => void;
  disabled: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const handleClick = () => {
    if (flipped || flipping || disabled) return;
    setFlipping(true);
    setTimeout(() => {
      setFlipping(false);
      setFlipped(true);
      onFlip();
    }, FLIP_DURATION);
  };

  if (!flipped && !flipping) {
    return <CardBack size="normal" onClick={handleClick} />;
  }

  if (flipping) {
    return (
      <div style={{ perspective: '600px', transformStyle: 'preserve-3d' }}>
        <div
          className="w-24 h-36 sm:w-28 sm:h-40"
          style={{
            transformStyle: 'preserve-3d',
            animation: `cardFlip ${FLIP_DURATION}ms ease-in-out forwards`,
          }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            <CardBack size="normal" disabled />
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardFront result={result} size="normal" />
          </div>
        </div>
      </div>
    );
  }

  return <CardFront result={result} size="normal" />;
}

// ---- 十连统计层（含结算功能）----
function TenResultLayer({
  results,
  onClose,
  onDrawAgain,
}: {
  results: DrawResult[];
  onClose: () => void;
  onDrawAgain: () => void;
}) {
  const [sortState, setSortState] = useState<'original' | 'sorted'>('original');

  const stats = useMemo(() => ({
    copper: results.filter(r => r.rarity === 'copper').length,
    silver: results.filter(r => r.rarity === 'silver').length,
    gold: results.filter(r => r.rarity === 'gold').length,
    rainbow: results.filter(r => r.rarity === 'rainbow').length,
  }), [results]);

  // 原始顺序的卡片
  const originalCards = useMemo(() => results, [results]);
  // 按品质排序的卡片
  const sortedCards = useMemo(() => sortByRarity(results), [results]);

  const displayCards = sortState === 'sorted' ? sortedCards : originalCards;

  const handleSort = () => {
    if (sortState !== 'original') return;
    setSortState('sorted');
  };

  const handleRestore = () => {
    if (sortState !== 'sorted') return;
    setSortState('original');
  };

  // 计算分区信息
  const zoneInfo = useMemo(() => {
    let idx = 0;
    const zones: { label: string; color: string; count: number }[] = [];
    if (stats.rainbow > 0) { zones.push({ label: '彩卡区', color: 'text-purple-400', count: stats.rainbow }); idx += stats.rainbow; }
    if (stats.gold > 0) { zones.push({ label: '金卡区', color: 'text-yellow-400', count: stats.gold }); idx += stats.gold; }
    if (stats.silver > 0) { zones.push({ label: '银卡区', color: 'text-slate-300', count: stats.silver }); idx += stats.silver; }
    if (stats.copper > 0) { zones.push({ label: '铜卡区', color: 'text-amber-400', count: stats.copper }); }
    return zones;
  }, [stats]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-6xl px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">十连召唤结果</h2>
      <div className="flex justify-center gap-6 text-sm">
        <span className="text-purple-400 font-bold">彩:{stats.rainbow}</span>
        <span className="text-yellow-400 font-bold">金:{stats.gold}</span>
        <span className="text-slate-300 font-bold">银:{stats.silver}</span>
        <span className="text-amber-400 font-bold">铜:{stats.copper}</span>
      </div>
      {results.some(r => r.isGuaranteed) && (
        <div className="text-red-400 text-xs font-bold animate-pulse">本次触发了保底机制！</div>
      )}

      {/* 卡牌网格 + 分区标签 */}
      <div className="relative w-full flex">
        {/* 分区标签 */}
        {sortState === 'sorted' && (
          <div className="flex flex-col shrink-0 w-8 mr-1">
            {zoneInfo.map((zone, i) => (
              <div
                key={i}
                className={`${zone.color} text-xs font-bold flex items-center justify-center`}
                style={{
                  height: `${(zone.count / displayCards.length) * 100}%`,
                  minHeight: '30px',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                }}
              >
                {zone.label}
              </div>
            ))}
          </div>
        )}

        {/* 卡片网格 */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 p-1">
            {displayCards.map((result, i) => (
              <div
                key={`${sortState}-${i}`}
                className="transition-all duration-300"
                style={{
                  transitionDelay: sortState === 'sorted'
                    ? `${FLY_DELAYS[result.rarity]}ms`
                    : '0ms',
                }}
              >
                <CardFront result={result} size="small" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <button onClick={onDrawAgain} className="px-5 py-2 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-600 hover:to-pink-500 border border-purple-400 rounded-lg text-white font-bold cursor-pointer hover:scale-105 transition-transform text-sm">再抽十连</button>
        {sortState === 'original' ? (
          <button onClick={handleSort} className="px-5 py-2 bg-blue-800 hover:bg-blue-700 border border-blue-500 rounded-lg text-white font-bold cursor-pointer hover:scale-105 transition-transform text-sm">结算</button>
        ) : (
          <button onClick={handleRestore} className="px-5 py-2 bg-blue-800 hover:bg-blue-700 border border-blue-500 rounded-lg text-white font-bold cursor-pointer hover:scale-105 transition-transform text-sm">恢复</button>
        )}
        <button onClick={onClose} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-pointer hover:scale-105 transition-transform text-sm">关闭</button>
      </div>
    </div>
  );
}

// ---- 单抽结果统计 ----
function SingleResultLayer({
  results,
  onClose,
  onDrawAgain,
}: {
  results: DrawResult[];
  onClose: () => void;
  onDrawAgain: () => void;
}) {
  const stats = useMemo(() => ({
    copper: results.filter(r => r.rarity === 'copper').length,
    silver: results.filter(r => r.rarity === 'silver').length,
    gold: results.filter(r => r.rarity === 'gold').length,
    rainbow: results.filter(r => r.rarity === 'rainbow').length,
  }), [results]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">召唤结果</h2>
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-purple-400 font-bold">彩:{stats.rainbow}</span>
        <span className="text-yellow-400 font-bold">金:{stats.gold}</span>
        <span className="text-slate-300 font-bold">银:{stats.silver}</span>
        <span className="text-amber-400 font-bold">铜:{stats.copper}</span>
      </div>
      {results.some(r => r.isGuaranteed) && (
        <div className="text-red-400 text-xs font-bold animate-pulse">本次触发了保底机制！</div>
      )}
      <div className="flex gap-3">
        {results.map((r, i) => (
          <CardFront key={i} result={r} size="normal" />
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        <button
          onClick={onDrawAgain}
          className="px-5 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 border border-amber-500 rounded-lg text-white font-bold cursor-pointer hover:scale-105 transition-transform"
        >
          再抽一次
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-pointer hover:scale-105 transition-transform"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

// ===================== 主组件 =====================
export default function GachaAnimation({ results, drawMode, packType: _packType, onClose, onDrawAgain }: Props) {
  void _packType; // 当前未使用，保留接口兼容性
  const [state, setState] = useState<DrawState>('pack_opening');
  const [flippedCount, setFlippedCount] = useState(0);
  const [closeConfirm, setCloseConfirm] = useState(false);

  const totalCards = results.length;
  const isAllFlipped = flippedCount >= totalCards;

  // 当results变化（再抽）时，重置所有状态重新开始动画
  useEffect(() => {
    setState('pack_opening');
    setFlippedCount(0);
    setCloseConfirm(false);
  }, [results]);

  // 卡包开箱动画完成后进入cards_showing
  useEffect(() => {
    if (state !== 'pack_opening') return;
    const timer = setTimeout(() => {
      setState('cards_showing');
    }, drawMode === 'single' ? 2000 : 1000);
    return () => clearTimeout(timer);
  }, [state, drawMode]);

  // 十连：cards_showing 后自动进入 all_opening（自动翻转）
  useEffect(() => {
    if (state !== 'cards_showing' || drawMode !== 'ten') return;
    // 短暂延迟让用户看到卡背，然后开始自动翻转
    const timer = setTimeout(() => {
      setState('all_opening');
    }, 500);
    return () => clearTimeout(timer);
  }, [state, drawMode]);

  // all_opening 完成后进入 result_showing
  useEffect(() => {
    if (state !== 'all_opening') return;
    // 计算最大翻转延迟 + 翻转动画时间
    const maxBatchDelay = Math.max(...results.map(r => BATCH_DELAYS[r.rarity]));
    const totalTime = maxBatchDelay + FLIP_DURATION + 500;
    const timer = setTimeout(() => {
      setFlippedCount(totalCards);
      setState('result_showing');
    }, totalTime);
    return () => clearTimeout(timer);
  }, [state, results, totalCards]);

  // 单抽：逐张翻开回调
  const handleCardFlipped = useCallback(() => {
    setFlippedCount(prev => {
      const next = prev + 1;
      if (next >= totalCards) {
        setTimeout(() => setState('result_showing'), 300);
      }
      return next;
    });
  }, [totalCards]);

  // 单抽：打开全部
  const handleOpenAll = useCallback(() => {
    if (state !== 'cards_showing') return;
    setState('all_opening');
    // 按品质分批翻转所有未翻开卡片
    const maxDelay = 300 + FLIP_DURATION;
    setTimeout(() => {
      setFlippedCount(totalCards);
      setState('result_showing');
    }, maxDelay + 100);
  }, [state, flippedCount, totalCards, results]);

  // 关闭处理
  const handleClose = useCallback(() => {
    if (drawMode === 'single' && !isAllFlipped && state !== 'result_showing') {
      setCloseConfirm(true);
      return;
    }
    onClose();
  }, [drawMode, isAllFlipped, state, onClose]);

  const confirmClose = useCallback(() => {
    setCloseConfirm(false);
    onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0,0,0,0.95)',
      }}
    >
      {/* 全局CSS动画 */}
      <style>{`
        @keyframes cardFlip {
          0% { transform: rotateY(0deg) scale(1); }
          50% { transform: rotateY(90deg) scale(1.15); }
          100% { transform: rotateY(180deg) scale(1); }
        }
        @keyframes packShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-8deg); }
          20% { transform: rotate(8deg); }
          30% { transform: rotate(-6deg); }
          40% { transform: rotate(6deg); }
          50% { transform: rotate(-4deg); }
          60% { transform: rotate(4deg); }
          70% { transform: rotate(-2deg); }
          80% { transform: rotate(2deg); }
          90% { transform: rotate(-1deg); }
        }
        @keyframes packBurst {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
          100% { transform: scale(0) rotate(20deg); opacity: 0; }
        }
        @keyframes silverShine {
          0%, 100% { box-shadow: inset 0 0 5px rgba(192,192,192,0.3); }
          50% { box-shadow: inset 0 0 15px rgba(255,255,255,0.6), 0 0 10px rgba(192,192,192,0.5); }
        }
        @keyframes goldBurst {
          0% { box-shadow: 0 0 0 rgba(255,215,0,0); }
          30% { box-shadow: 0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,165,0,0.4); }
          100% { box-shadow: 0 0 10px rgba(255,215,0,0.3); }
        }
        @keyframes rainbowGlow {
          0% { box-shadow: 0 0 20px rgba(255,0,0,0.6); border-color: #ff0000; }
          20% { box-shadow: 0 0 25px rgba(255,165,0,0.6); border-color: #ffa500; }
          40% { box-shadow: 0 0 30px rgba(255,255,0,0.6); border-color: #ffff00; }
          60% { box-shadow: 0 0 25px rgba(0,255,0,0.6); border-color: #00ff00; }
          80% { box-shadow: 0 0 20px rgba(0,0,255,0.6); border-color: #0000ff; }
          100% { box-shadow: 0 0 30px rgba(128,0,128,0.6); border-color: #800080; }
        }
        @keyframes guaranteePop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes cardFly {
          0% { transform: translate(var(--fly-dx, 0), var(--fly-dy, 0)) scale(1); }
          50% { transform: translate(calc(var(--fly-dx, 0) * 0.5), calc(var(--fly-dy, 0) * 0.5)) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pushAway {
          0% { transform: translate(0, 0); }
          50% { transform: translate(var(--push-dx, 0px), var(--push-dy, 0px)); }
          100% { transform: translate(0, 0); }
        }
        .animate-pack-shake { animation: packShake 1.5s ease-in-out; }
        .animate-pack-burst { animation: packBurst 0.6s ease-out forwards; }
        .animate-card-flip { animation: cardFlip 0.6s ease-in-out forwards; }
        .animate-silver-shine { animation: silverShine 2s ease-in-out 1; }
        .animate-gold-burst { animation: goldBurst 1.5s ease-out forwards; }
        .animate-rainbow-glow { animation: rainbowGlow 2s linear infinite; }
        .animate-guarantee-pop { animation: guaranteePop 0.5s ease-out 0.3s both; }
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>

      {/* 屏幕震动效果（彩卡出现时） */}
      {(state === 'cards_showing' || state === 'flipping' || state === 'all_opening') && results.some(r => r.rarity === 'rainbow') && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ animation: 'screenShake 0.3s ease-in-out' }}
        />
      )}

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className="fixed top-4 right-4 z-[100000] p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-pointer transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* 主内容区 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-10 px-4 gap-6">

        {/* ====== 单抽 ====== */}
        {drawMode === 'single' && (
          <>
            {/* 步骤1：卡包开箱 */}
            {state === 'pack_opening' && <PackOpening onDone={() => {}} />}

            {/* 步骤2：5张背面 + 按钮 */}
            {state === 'cards_showing' && (
              <div className="flex flex-col items-center gap-6">
                <h2 className="text-xl font-bold text-gray-200">卡牌召唤</h2>
                <div className="flex gap-3 sm:gap-4 flex-wrap justify-center">
                  {results.map((result, i) => (
                    <ClickableCard
                      key={i}
                      result={result}
                      onFlip={handleCardFlipped}
                      disabled={false}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenAll}
                    className="px-6 py-2 bg-blue-800 hover:bg-blue-700 border border-blue-500 rounded-lg text-white font-bold cursor-pointer hover:scale-105 transition-transform text-sm"
                  >
                    打开全部
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-pointer hover:scale-105 transition-transform text-sm"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}

            {/* 打开全部动画中 */}
            {state === 'all_opening' && (
              <div className="flex flex-col items-center gap-6">
                <h2 className="text-xl font-bold text-gray-200">正在翻开...</h2>
                <div className="flex gap-3 sm:gap-4 flex-wrap justify-center">
                  {results.map((result, i) => (
                    <FlippingCard
                      key={i}
                      result={result}
                      size="normal"
                      delay={BATCH_DELAYS[result.rarity]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 结果展示 */}
            {state === 'result_showing' && (
              <SingleResultLayer
                results={results}
                onClose={onClose}
                onDrawAgain={onDrawAgain}
              />
            )}
          </>
        )}

        {/* ====== 十连 ====== */}
        {drawMode === 'ten' && (
          <>
            {/* 步骤1：卡包堆叠 */}
            {state === 'pack_opening' && <PackStack onDone={() => {}} />}

            {/* 步骤2：50张网格 + 自动翻转 */}
            {(state === 'cards_showing' || state === 'all_opening') && (
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-bold text-gray-200">十连召唤</h2>
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(COLS, 10)}, 1fr)`,
                    maxWidth: '1000px',
                  }}
                >
                  {results.map((result, i) => (
                    <FlippingCard
                      key={i}
                      result={result}
                      size="small"
                      delay={BATCH_DELAYS[result.rarity]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 步骤3：结果统计层（含结算功能） */}
            {(state === 'result_showing' || state === 'sorted' || state === 'sorting' || state === 'restoring') && (
              <TenResultLayer
                results={results}
                onClose={onClose}
                onDrawAgain={onDrawAgain}
              />
            )}
          </>
        )}
      </div>

      {/* 关闭确认弹窗 */}
      {closeConfirm && (
        <div
          className="fixed inset-0 z-[100001] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div className="bg-gray-900 border border-gray-600 rounded-xl p-6 max-w-sm mx-4 text-center">
            <p className="text-white mb-4">还有未翻开的卡牌，确定要关闭吗？</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setCloseConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-lg text-gray-300 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg text-white cursor-pointer"
              >
                确定关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
