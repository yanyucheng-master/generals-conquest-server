import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Filter, X, Zap, Shield } from 'lucide-react';
import { ALL_CARDS } from '@/data/cards';
import type { CardDef } from '@/data/cards';
import { loadDIYCards } from '@/data/diySystem';
import type { DIYCard } from '@/data/diySystem';
import { SKILL_NAMES } from '@/types/game';

interface Props {
  onBack: () => void;
}

const CAMPS = [
  { key: '', label: '全部阵营' },
  { key: '帝国军团', label: '帝国军团' },
  { key: '荒野游侠', label: '荒野游侠' },
  { key: '奥术学院', label: '奥术学院' },
  { key: '通用', label: '通用' },
];

const QUALITIES = [
  { key: '', label: '全部品质' },
  { key: '铜', label: '铜' },
  { key: '银', label: '银' },
  { key: '金', label: '金' },
  { key: '彩', label: '彩' },
];

const SUBTYPES = [
  { key: '', label: '全部类型' },
  { key: '近战', label: '近战' },
  { key: '弓箭', label: '弓箭' },
  { key: '狙击', label: '狙击' },
  { key: '魔法', label: '魔法士兵' },
  { key: '法术卡', label: '法术卡' },
  { key: '随机', label: '随机' },
];

const QUALITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '铜': { bg: 'bg-amber-900/80', text: 'text-amber-200', border: 'border-amber-600' },
  '银': { bg: 'bg-slate-700/80', text: 'text-slate-200', border: 'border-slate-500' },
  '金': { bg: 'bg-yellow-800/80', text: 'text-yellow-200', border: 'border-yellow-500' },
  '彩': { bg: 'bg-gradient-to-br from-purple-700 to-pink-700', text: 'text-white', border: 'border-purple-400' },
};

export default function CardGallery({ onBack }: Props) {
  // P1-10: 支持切换官方/DIY卡池
  const [activeTab, setActiveTab] = useState<'official' | 'diy'>('official');
  const [campFilter, setCampFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detailCard, setDetailCard] = useState<CardDef | DIYCard | null>(null);

  // 加载DIY卡
  const diyCards = useMemo(() => loadDIYCards(), []);

  // 官方卡池筛选
  const filteredOfficial = useMemo(() => {
    return ALL_CARDS.filter(card => {
      if (campFilter && card.faction !== campFilter) return false;
      if (qualityFilter && card.quality !== qualityFilter) return false;
      if (subtypeFilter && card.subtype !== subtypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(q);
        const skillMatch = card.skills.some(s => {
          const sn = SKILL_NAMES[s as keyof typeof SKILL_NAMES] || s;
          return sn.toLowerCase().includes(q) || s.toLowerCase().includes(q);
        });
        if (!nameMatch && !skillMatch) return false;
      }
      return true;
    });
  }, [campFilter, qualityFilter, subtypeFilter, search]);

  // DIY卡池筛选
  const filteredDIY = useMemo(() => {
    return diyCards.filter(card => {
      if (subtypeFilter && card.subtype !== subtypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(q);
        const skillMatch = card.skills.some(s => {
          const sn = SKILL_NAMES[s as keyof typeof SKILL_NAMES] || s;
          return sn.toLowerCase().includes(q) || s.toLowerCase().includes(q);
        });
        const descMatch = card.desc.toLowerCase().includes(q);
        if (!nameMatch && !skillMatch && !descMatch) return false;
      }
      return true;
    });
  }, [diyCards, subtypeFilter, search]);

  const displayCards = activeTab === 'official' ? filteredOfficial : filteredDIY;
  const totalCount = activeTab === 'official' ? ALL_CARDS.length : diyCards.length;

  return (
    <div className="relative w-full min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="fixed inset-0 bg-black/85 z-[1]" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-3 sm:px-4 py-6 pb-20">
        {/* 顶部栏 */}
        <div className="w-full max-w-6xl flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            卡牌图鉴
          </h1>
          <div className="text-gray-400 text-sm">{displayCards.length}/{totalCount}张</div>
        </div>

        {/* P1-10: 官方/DIY标签页 */}
        <div className="w-full max-w-6xl flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('official')}
            className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'official' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            官方卡牌 ({filteredOfficial.length}/{ALL_CARDS.length})
          </button>
          <button
            onClick={() => setActiveTab('diy')}
            className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'diy' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            我的创造 ({filteredDIY.length}/{diyCards.length})
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="w-full max-w-6xl flex flex-wrap gap-2 items-center">
          {activeTab === 'official' && (
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select value={campFilter} onChange={e => setCampFilter(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none cursor-pointer">
                {CAMPS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'official' && (
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg">
              <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none cursor-pointer">
                {QUALITIES.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg">
            <select value={subtypeFilter} onChange={e => setSubtypeFilter(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none cursor-pointer">
              {SUBTYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索名称或技能..."
              className="bg-transparent text-gray-300 text-xs outline-none w-full"
            />
            {search && <X className="w-3.5 h-3.5 text-gray-500 cursor-pointer shrink-0" onClick={() => setSearch('')} />}
          </div>
        </div>

        {/* 卡牌网格 */}
        <div className="w-full max-w-6xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {displayCards.map(card => {
            const colors = QUALITY_COLORS[card.quality] || QUALITY_COLORS['铜'];
            const isDIY = 'isDIY' in card;
            return (
              <div
                key={isDIY ? card.id : `official-${card.id}`}
                onClick={() => setDetailCard(card)}
                className={`relative rounded-lg border ${isDIY ? 'border-cyan-600 bg-cyan-950/30' : `${colors.border} ${colors.bg}`} p-1.5 cursor-pointer transition-all hover:scale-105 hover:brightness-110`}
              >
                <div className={`text-[10px] ${isDIY ? 'text-cyan-200' : colors.text} font-bold truncate`}>{card.name}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[8px] text-gray-400">{isDIY ? 'DIY' : card.faction}</span>
                  <span className="text-[8px] text-gray-400">{card.quality}</span>
                </div>
                <div className="flex gap-1 text-[9px] mt-0.5">
                  <span className="text-blue-400">{card.cost}费</span>
                  {card.type === '士兵' ? (
                    <>
                      <span className="text-red-400">{card.atk}攻</span>
                      <span className="text-green-400">{card.hp}血</span>
                    </>
                  ) : (
                    <span className="text-purple-400">法术</span>
                  )}
                </div>
                {card.skills.length > 0 && (
                  <div className="text-[7px] text-gray-400 truncate mt-0.5">
                    {card.skills.slice(0, 2).map((s, i) => {
                      const sn = SKILL_NAMES[s as keyof typeof SKILL_NAMES] || s;
                      return <span key={i}>{sn} </span>;
                    })}
                  </div>
                )}
                {isDIY && (
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" title="DIY卡牌" />
                )}
              </div>
            );
          })}
        </div>

        {displayCards.length === 0 && (
          <div className="text-gray-500 text-sm mt-10">
            {activeTab === 'diy' ? '还没有DIY卡牌，去创造一张吧！' : '没有找到匹配的卡牌'}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setDetailCard(null)}>
          <div className="relative w-full max-w-sm bg-gray-900 border border-gray-600 rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailCard(null)} className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded cursor-pointer">
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="text-center mb-3">
              <h2 className="text-xl font-bold text-white">{detailCard.name}</h2>
              <div className="flex justify-center gap-2 mt-1 text-xs text-gray-400">
                {'isDIY' in detailCard ? (
                  <span className="text-cyan-400">DIY卡 | 自定义</span>
                ) : (
                  <span>{detailCard.faction}</span>
                )}
                <span>|</span>
                <span className={detailCard.quality === '彩' ? 'text-purple-400' : detailCard.quality === '金' ? 'text-yellow-400' : detailCard.quality === '银' ? 'text-slate-300' : 'text-amber-400'}>{detailCard.quality}</span>
                <span>|</span>
                <span>{detailCard.subtype}</span>
              </div>
              {'isDIY' in detailCard && detailCard.judgeResult && (
                <div className={`text-xs mt-1 ${detailCard.judgeResult.color === 'green' ? 'text-green-400' : detailCard.judgeResult.color === 'red' ? 'text-red-400' : 'text-orange-400'}`}>
                  评判: {detailCard.judgeResult.verdict} (偏差{Number(detailCard.judgeResult.deviation) > 0 ? '+' : ''}{detailCard.judgeResult.deviation})
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-2 text-center">
                <div className="text-blue-400 text-xs">费用</div>
                <div className="text-white text-lg font-bold">{detailCard.cost}</div>
              </div>
              {detailCard.type === '士兵' ? (
                <>
                  <div className="bg-red-900/40 border border-red-700 rounded-lg p-2 text-center">
                    <div className="text-red-400 text-xs">攻击</div>
                    <div className="text-white text-lg font-bold">{detailCard.atk}</div>
                  </div>
                  <div className="bg-green-900/40 border border-green-700 rounded-lg p-2 text-center">
                    <div className="text-green-400 text-xs">生命</div>
                    <div className="text-white text-lg font-bold">{detailCard.hp}</div>
                  </div>
                </>
              ) : (
                <div className="bg-purple-900/40 border border-purple-700 rounded-lg p-2 text-center col-span-2">
                  <div className="text-purple-400 text-xs">类型</div>
                  <div className="text-white text-lg font-bold">法术卡</div>
                </div>
              )}
            </div>

            {detailCard.armor > 0 && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-2 mb-3 text-center">
                <Shield className="w-3 h-3 text-blue-400 inline mr-1" />
                <span className="text-blue-400 text-xs">护甲 {detailCard.armor}</span>
              </div>
            )}

            {'damageType' in detailCard && detailCard.damageType && detailCard.damageType !== '物理' && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-2 mb-3 text-center">
                <span className="text-purple-400 text-xs">伤害类型: {detailCard.damageType}</span>
              </div>
            )}

            {detailCard.skills.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <div className="text-xs text-gray-400 font-bold">技能</div>
                {detailCard.skills.map((skill: string, i: number) => (
                  <div key={i} className="bg-gray-800/60 rounded-lg p-2 flex items-start gap-2">
                    <Zap className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-yellow-400 text-xs font-bold">{SKILL_NAMES[skill as keyof typeof SKILL_NAMES] || skill}</span>
                      <span className="text-gray-500 text-[10px] ml-1">({skill})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-800/40 rounded-lg p-2">
              <div className="text-gray-500 text-[10px]">{detailCard.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
