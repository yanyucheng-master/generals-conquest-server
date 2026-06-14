import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, BookOpen, Wand2, Save, AlertTriangle, CheckCircle, X, Edit3, Search } from 'lucide-react';
import { ALL_CARDS } from '@/data/cards';
import type { CardDef } from '@/data/cards';
import {
  loadDIYCards, loadDeck, saveDeck, clearDeck, validateDeck, getDeckCards,
  deleteDIYCard, REPEAT_LIMITS
} from '@/data/diySystem';
import type { DIYCard, DeckEntry } from '@/data/diySystem';
import CardGallery from './CardGallery';
import CardCreator from './CardCreator';
import { getVisibleSkillLabels } from '@/utils/skillLabels';

interface Props {
  onBack: () => void;
}

type SubPage = 'builder' | 'gallery' | 'creator';



export default function DeckBuilder({ onBack }: Props) {
  const [subPage, setSubPage] = useState<SubPage>('builder');
  const [poolTab, setPoolTab] = useState<'official' | 'diy'>('official');
  const [deck, setDeck] = useState<DeckEntry[]>(loadDeck);
  const [diyCards, setDiyCards] = useState<DIYCard[]>(loadDIYCards);
  const [campFilter, setCampFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [detailCard, setDetailCard] = useState<(CardDef | DIYCard) | null>(null);
  const [, setEditingDIY] = useState<DIYCard | null>(null);

  // 官方卡池筛选
  const officialPool = useMemo(() => {
    return ALL_CARDS.filter(card => {
      if (campFilter && card.faction !== campFilter) return false;
      if (qualityFilter && card.quality !== qualityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return card.name.toLowerCase().includes(q) || getVisibleSkillLabels(card.skills, card.desc).some(skill => skill.toLowerCase().includes(q));
      }
      return true;
    });
  }, [campFilter, qualityFilter, search]);

  // DIY卡池筛选
  const diyPool = useMemo(() => {
    return diyCards.filter(card => {
      if (subtypeFilter && card.subtype !== subtypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return card.name.toLowerCase().includes(q) || getVisibleSkillLabels(card.skills, card.desc).some(skill => skill.toLowerCase().includes(q));
      }
      return true;
    });
  }, [diyCards, subtypeFilter, search]);

  // 卡组验证
  const validation = useMemo(() => validateDeck(deck, ALL_CARDS, diyCards), [deck, diyCards]);

  // 卡组中的完整卡牌数据
  const deckCards = useMemo(() => getDeckCards(deck, ALL_CARDS, diyCards), [deck, diyCards]);

  // 检查能否添加卡牌（只检查重复限制和40张上限）
  const canAddCard = useCallback((card: CardDef | DIYCard): boolean => {
    if (deck.length >= 40) return false;

    const isDIY = 'isDIY' in card && card.isDIY;
    const cardId = String(card.id);

    // 检查同卡重复数量
    const sameCardCount = deck.filter(e => String(e.cardId) === cardId).length;
    if (isDIY) {
      if (sameCardCount >= REPEAT_LIMITS.diy) return false;
    } else {
      const limit = REPEAT_LIMITS[card.quality as keyof typeof REPEAT_LIMITS];
      if (limit && sameCardCount >= limit) return false;
    }

    return true;
  }, [deck]);

  // 添加卡牌到卡组
  const addToDeck = useCallback((card: CardDef | DIYCard) => {
    if (!canAddCard(card)) return;

    const isDIY = 'isDIY' in card && card.isDIY;
    const entry: DeckEntry = { cardId: String(card.id), isDIY };

    setDeck(prev => [...prev, entry]);
  }, [canAddCard]);

  // 从卡组移除
  const removeFromDeck = useCallback((index: number) => {
    setDeck(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 清空卡组
  const handleClear = useCallback(() => {
    setDeck([]);
    clearDeck();
  }, []);

  // 保存卡组
  const handleSave = useCallback(() => {
    if (validation.valid) {
      saveDeck(deck);
      setShowValidation(true);
      setTimeout(() => setShowValidation(false), 2000);
    }
  }, [deck, validation.valid]);

  // 刷新DIY卡
  const refreshDIY = useCallback(() => {
    setDiyCards(loadDIYCards());
  }, []);

  // P2-10: 删除DIY卡
  const handleDeleteDIY = useCallback((id: string) => {
    if (!confirm('确定要删除这张DIY卡吗？它会同时从卡组中移除。')) return;
    deleteDIYCard(id);
    refreshDIY();
    // 重新加载卡组（可能已被级联更新）
    setDeck(loadDeck());
  }, [refreshDIY]);

  // P2-10: 编辑DIY卡（简化版：跳转到创造器并预填充）
  const handleEditDIY = useCallback((card: DIYCard) => {
    setEditingDIY(card);
    setSubPage('creator');
  }, []);

  // 子页面路由
  if (subPage === 'gallery') return <CardGallery onBack={() => setSubPage('builder')} />;
  if (subPage === 'creator') return (
    <CardCreator
      onBack={() => { setSubPage('builder'); setEditingDIY(null); refreshDIY(); }}
      onSaved={() => { setSubPage('builder'); setEditingDIY(null); refreshDIY(); }}
    />
  );

  return (
    <div className="relative w-full min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="fixed inset-0 bg-black/88 z-[1]" />

      <div className="relative z-10 flex flex-col h-screen">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-gray-950/90 border-b border-gray-800 shrink-0">
          <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 text-sm transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            我的卡组
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setSubPage('gallery')} className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800/60 border border-blue-700 rounded-lg text-blue-300 text-xs cursor-pointer transition-all flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> 图鉴
            </button>
            <button onClick={() => { setEditingDIY(null); setSubPage('creator'); }} className="px-2.5 py-1.5 bg-purple-900/60 hover:bg-purple-800/60 border border-purple-700 rounded-lg text-purple-300 text-xs cursor-pointer transition-all flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> 创造
            </button>
          </div>
        </div>

        {/* 主内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧卡池 */}
          <div className="w-1/2 lg:w-3/5 flex flex-col border-r border-gray-800">
            {/* 卡池Tab */}
            <div className="flex border-b border-gray-800">
              <button onClick={() => setPoolTab('official')} className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer ${poolTab === 'official' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
                官方卡池 ({officialPool.length})
              </button>
              <button onClick={() => setPoolTab('diy')} className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer ${poolTab === 'diy' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>
                我的创造 ({diyCards.length})
              </button>
            </div>

            {/* 筛选 */}
            <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-800">
              {poolTab === 'official' ? (
                <>
                  <select value={campFilter} onChange={e => setCampFilter(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 text-[10px] outline-none cursor-pointer">
                    <option value="">全部阵营</option>
                    <option value="帝国军团">帝国</option>
                    <option value="荒野游侠">荒野</option>
                    <option value="奥术学院">奥术</option>
                    <option value="通用">通用</option>
                  </select>
                  <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 text-[10px] outline-none cursor-pointer">
                    <option value="">全部品质</option>
                    <option value="铜">铜</option>
                    <option value="银">银</option>
                    <option value="金">金</option>
                    <option value="彩">彩</option>
                  </select>
                </>
              ) : (
                /* P2-08: DIY卡池筛选 */
                <select value={subtypeFilter} onChange={e => setSubtypeFilter(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 text-[10px] outline-none cursor-pointer">
                  <option value="">全部类型</option>
                  <option value="近战">近战</option>
                  <option value="弓箭">弓箭</option>
                  <option value="狙击">狙击</option>
                  <option value="魔法">魔法</option>
                  <option value="随机">随机</option>
                </select>
              )}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded flex-1 min-w-[80px]">
                <Search className="w-3 h-3 text-gray-500 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="bg-transparent text-gray-300 text-[10px] outline-none w-full" />
                {search && <X className="w-3 h-3 text-gray-500 cursor-pointer shrink-0" onClick={() => setSearch('')} />}
              </div>
            </div>

            {/* 卡池列表 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {poolTab === 'official' ? (
                officialPool.map(card => (
                  <PoolCardItem
                    key={card.id}
                    card={card}
                    isDIY={false}
                    onAdd={() => addToDeck(card)}
                    canAdd={canAddCard(card)}
                    onPreview={() => setDetailCard(card)}
                  />
                ))
              ) : (
                diyPool.length > 0 ? diyPool.map(card => (
                  <PoolCardItem
                    key={card.id}
                    card={card}
                    isDIY={true}
                    onAdd={() => addToDeck(card)}
                    canAdd={canAddCard(card)}
                    onDelete={() => handleDeleteDIY(card.id)}
                    onEdit={() => handleEditDIY(card)}
                    onPreview={() => setDetailCard(card)}
                  />
                )) : (
                  <div className="text-center text-gray-500 text-xs py-10">
                    <p>还没有DIY卡牌</p>
                    <button onClick={() => { setEditingDIY(null); setSubPage('creator'); }} className="mt-2 px-3 py-1.5 bg-purple-900/60 border border-purple-600 rounded text-purple-300 text-xs cursor-pointer">
                      去创造
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 右侧卡组 */}
          <div className="w-1/2 lg:w-2/5 flex flex-col bg-gray-950/50">
            {/* 统计 */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-white">当前卡组</h2>
                <span className={`text-xs font-bold ${validation.valid ? 'text-green-400' : deck.length === 40 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {deck.length}/40
                </span>
              </div>
              {/* 统计：显示各品质卡牌数量 / 该品质的重复上限（仅提示，不限制总数） */}
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {([
                  { key: 'copper', label: '铜', color: 'text-amber-400', repeatLimit: 4 },
                  { key: 'silver', label: '银', color: 'text-slate-300', repeatLimit: 3 },
                  { key: 'gold', label: '金', color: 'text-yellow-400', repeatLimit: 2 },
                  { key: 'rainbow', label: '彩', color: 'text-purple-400', repeatLimit: 1 },
                  { key: 'diy', label: 'DIY', color: 'text-cyan-400', repeatLimit: 1 },
                ]).map(({ key, label, color, repeatLimit }) => {
                  const count = validation.counts[key as keyof typeof validation.counts];
                  return (
                    <div key={key} className="text-center p-1 rounded bg-gray-900/60 border border-gray-700">
                      <div className={`${color} font-bold`}>{label}</div>
                      <div className="text-gray-300">{count}/{repeatLimit}</div>
                    </div>
                  );
                })}
              </div>

              {/* 重复限制错误提示 */}
              {validation.repeatErrors.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {validation.repeatErrors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {/* 其他验证错误（如未满40张） */}
              {validation.errors.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-yellow-400">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} disabled={!validation.valid} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${validation.valid ? 'bg-green-800 hover:bg-green-700 border border-green-600 text-green-200' : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  <Save className="w-3 h-3" /> 保存
                </button>
                <button onClick={handleClear} className="px-2 py-1.5 bg-red-900/60 hover:bg-red-800/60 border border-red-700 rounded text-red-300 text-xs cursor-pointer transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 卡组列表 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {deckCards.length === 0 && (
                <div className="text-center text-gray-600 text-xs py-10">
                  从左侧选择卡牌添加到卡组<br />(共需40张)
                </div>
              )}
              {deckCards.map((card, index) => (
                <div
                  key={`${card.id}-${index}`}
                  onClick={() => setDetailCard(card)}
                  className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all hover:bg-gray-800 ${
                    'isDIY' in card ? 'bg-purple-950/30 border-purple-800/50' : card.quality === '彩' ? 'bg-purple-950/30 border-purple-800/50' : card.quality === '金' ? 'bg-yellow-950/30 border-yellow-800/50' : card.quality === '银' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-amber-950/30 border-amber-800/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-[11px] font-bold truncate">{card.name}</span>
                      {'isDIY' in card && <span className="text-[8px] text-cyan-400 bg-cyan-900/40 px-1 rounded">DIY</span>}
                    </div>
                    <div className="flex gap-1.5 text-[9px] text-gray-400">
                      <span className="text-blue-400">{card.cost}费</span>
                      {card.type === '士兵' ? (
                        <>
                          <span className="text-red-400">{card.atk}攻</span>
                          <span className="text-green-400">{card.hp}血</span>
                        </>
                      ) : (
                        <span className="text-purple-400">法术</span>
                      )}
                      <span>{card.subtype}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFromDeck(index); }} className="p-1 hover:bg-red-900/40 rounded text-red-400 cursor-pointer shrink-0">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 保存成功提示 */}
        {showValidation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-900/90 border border-green-600 rounded-lg text-green-300 text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4" /> 卡组已保存！
          </div>
        )}

        {/* P2-09: 卡牌详情弹窗 */}
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
                    <span className="text-cyan-400">DIY卡</span>
                  ) : (
                    <span>{detailCard.faction}</span>
                  )}
                  <span>|</span>
                  <span className={detailCard.quality === '彩' ? 'text-purple-400' : detailCard.quality === '金' ? 'text-yellow-400' : detailCard.quality === '银' ? 'text-slate-300' : 'text-amber-400'}>{detailCard.quality}</span>
                  <span>|</span>
                  <span>{detailCard.subtype}</span>
                </div>
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

              {'damageType' in detailCard && detailCard.damageType && detailCard.damageType !== '物理' && (
                <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-2 mb-3 text-center">
                  <span className="text-purple-400 text-xs">伤害类型: {detailCard.damageType}</span>
                </div>
              )}

              {getVisibleSkillLabels(detailCard.skills, detailCard.desc).length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-xs text-gray-400 font-bold">技能</div>
                  {getVisibleSkillLabels(detailCard.skills, detailCard.desc).map((skill: string, i: number) => (
                    <div key={i} className="bg-gray-800/60 rounded-lg p-2">
                      <span className="text-yellow-400 text-xs font-bold">{skill}</span>
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
    </div>
  );
}

// 卡池中的卡牌项 - P1-11: 移除as any，使用类型守卫
interface PoolCardItemProps {
  card: CardDef | DIYCard;
  isDIY: boolean;
  onAdd: () => void;
  canAdd: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onPreview: () => void;
}

function PoolCardItem({ card, isDIY, onAdd, canAdd, onDelete, onEdit, onPreview }: PoolCardItemProps) {
  const qualityColors: Record<string, string> = {
    '铜': 'border-amber-700/50',
    '银': 'border-slate-600/50',
    '金': 'border-yellow-600/50',
    '彩': 'border-purple-600/50',
  };
  const color = isDIY ? 'border-cyan-700/50' : (qualityColors[card.quality] || 'border-gray-700/50');
  const skillLabels = getVisibleSkillLabels(card.skills, card.desc);

  const handleAddFromRow = () => {
    if (canAdd) onAdd();
  };

  return (
    <div
      onClick={handleAddFromRow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleAddFromRow();
        }
      }}
      role="button"
      tabIndex={canAdd ? 0 : -1}
      aria-disabled={!canAdd}
      title={canAdd ? `添加${card.name}到当前卡组` : '已达添加上限'}
      className={`flex min-h-12 items-center gap-2 rounded border p-1.5 transition-all ${color} ${
        canAdd
          ? 'cursor-pointer bg-gray-900/40 hover:bg-gray-800/70 hover:border-green-500/45'
          : 'cursor-not-allowed bg-gray-950/55 opacity-60'
      }`}
    >
      <div className="w-36 min-w-0 shrink-0 sm:w-44 lg:w-48">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            className="truncate text-left text-[11px] font-bold text-white underline-offset-2 transition-colors hover:text-amber-300 hover:underline"
            title={`查看${card.name}详情`}
          >
            {card.name}
          </button>
          {isDIY && <span className="text-[8px] text-cyan-400 bg-cyan-900/40 px-1 rounded shrink-0">DIY</span>}
          <span className={`text-[8px] shrink-0 ${card.quality === '彩' ? 'text-purple-400' : card.quality === '金' ? 'text-yellow-400' : card.quality === '银' ? 'text-slate-300' : 'text-amber-400'}`}>{card.quality}</span>
        </div>
        <div className="flex gap-1.5 text-[9px] text-gray-400">
          <span className="text-blue-400">{card.cost}费</span>
          {card.type === '士兵' ? (
            <>
              <span className="text-red-400">{card.atk}攻</span>
              <span className="text-green-400">{card.hp}血</span>
            </>
          ) : (
            <span className="text-purple-400">法术</span>
          )}
          <span>{card.subtype}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {skillLabels.map(skill => (
          <span
            key={skill}
            className="rounded border border-amber-400/20 bg-amber-950/35 px-1.5 py-0.5 text-[8px] font-bold text-amber-200"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* P2-10: DIY卡编辑删除按钮 */}
      {isDIY && onEdit && onDelete && (
        <div className="flex gap-1 shrink-0">
          <button onClick={(event) => { event.stopPropagation(); onEdit(); }} className="p-1 hover:bg-blue-900/40 rounded text-blue-400 cursor-pointer transition-all" title="编辑">
            <Edit3 className="w-3 h-3" />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-900/40 rounded text-red-400 cursor-pointer transition-all" title="删除">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      <button
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        disabled={!canAdd}
        className={`p-1 rounded cursor-pointer shrink-0 transition-all ${canAdd ? 'hover:bg-green-900/40 text-green-400' : 'text-gray-600 cursor-not-allowed'}`}
        title={!canAdd ? '已达上限' : '添加'}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
