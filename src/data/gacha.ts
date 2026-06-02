// ======== 抽卡系统配置 v1.1 ========

import { ALL_CARDS } from './cards';

// 卡包配置
export const PACK_CONFIG = {
  normal: {
    name: '普通卡包',
    desc: '铜卡为主，梦想出彩',
    icon: '📦',
    probabilities: { copper: 0.75, silver: 0.22, gold: 0.0295, rainbow: 0.0005 },
    guarantee: { every: 30, target: 'gold' as const },
    drawCount: 5,
  },
  noble: {
    name: '贵族卡包',
    desc: '银卡为主，可能出金',
    icon: '🎁',
    probabilities: { copper: 0.50, silver: 0.40, gold: 0.09, rainbow: 0.01 },
    guarantee: { every: 60, target: 'rainbow' as const },
    drawCount: 5,
  },
  master: {
    name: '大师卡包',
    desc: '大概率有金，可能出彩',
    icon: '💎',
    probabilities: { copper: 0.25, silver: 0.50, gold: 0.22, rainbow: 0.03 },
    guarantee: { every: 30, target: 'rainbow' as const },
    drawCount: 5,
  },
  supreme: {
    name: '顶富卡包',
    desc: '几乎必有金彩',
    icon: '👑',
    probabilities: { copper: 0.05, silver: 0.35, gold: 0.50, rainbow: 0.10 },
    guarantee: { every: 10, target: 'rainbow' as const },
    drawCount: 5,
  },
};

export type PackType = keyof typeof PACK_CONFIG;
export type Rarity = 'copper' | 'silver' | 'gold' | 'rainbow';

// 卡池
export const CARD_POOL: Record<Rarity, typeof ALL_CARDS> = {
  copper: ALL_CARDS.filter(c => c.quality === '铜'),
  silver: ALL_CARDS.filter(c => c.quality === '银'),
  gold: ALL_CARDS.filter(c => c.quality === '金'),
  rainbow: ALL_CARDS.filter(c => c.quality === '彩'),
};

// 抽卡结果
export interface DrawResult {
  card: (typeof ALL_CARDS)[number];
  rarity: Rarity;
  isGuaranteed: boolean;
  drawIndex: number;
}

export interface PackResult {
  packIndex: number;
  cards: DrawResult[];
}

// 品质标签颜色
export const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; glow: string; gradient: string }> = {
  copper: {
    bg: 'bg-amber-900',
    border: 'border-amber-700',
    text: 'text-amber-200',
    glow: 'shadow-amber-600/40',
    gradient: 'from-amber-900 to-amber-800',
  },
  silver: {
    bg: 'bg-slate-600',
    border: 'border-slate-400',
    text: 'text-slate-200',
    glow: 'shadow-slate-400/60',
    gradient: 'from-slate-600 to-slate-500',
  },
  gold: {
    bg: 'bg-yellow-700',
    border: 'border-yellow-500',
    text: 'text-yellow-200',
    glow: 'shadow-yellow-500/80',
    gradient: 'from-yellow-700 to-yellow-600',
  },
  rainbow: {
    bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600',
    border: 'border-purple-400',
    text: 'text-white',
    glow: 'shadow-purple-500/90',
    gradient: 'from-purple-600 via-pink-600 to-cyan-600',
  },
};

// 品质中文名
export const RARITY_NAMES: Record<Rarity, string> = {
  copper: '铜',
  silver: '银',
  gold: '金',
  rainbow: '彩',
};

// ======== 保底计数器管理 ========

interface GuaranteeCounters {
  normal: number;
  noble: number;
  master: number;
  supreme: number;
}

const COUNTERS_KEY = 'generals_gacha_counters';
const HISTORY_KEY = 'generals_gacha_history';

export function loadCounters(): GuaranteeCounters {
  try {
    const saved = localStorage.getItem(COUNTERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { normal: 0, noble: 0, master: 0, supreme: 0 };
}

export function saveCounters(counters: GuaranteeCounters): void {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

// ======== 抽卡历史 ========

interface DrawHistoryEntry {
  timestamp: number;
  packType: PackType;
  cards: { id: number; name: string; rarity: Rarity; isGuaranteed: boolean }[];
}

export function loadHistory(): DrawHistoryEntry[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

export function saveHistory(history: DrawHistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)));
}

export function getStats() {
  const history = loadHistory();
  const stats = { total: 0, copper: 0, silver: 0, gold: 0, rainbow: 0 };
  history.forEach(draw => {
    draw.cards.forEach(card => {
      stats.total++;
      stats[card.rarity]++;
    });
  });
  return stats;
}

// ======== 核心抽卡逻辑 ========

/**
 * 根据概率随机抽取品质
 */
function rollRarity(probabilities: typeof PACK_CONFIG.normal.probabilities): Rarity {
  const rand = Math.random();
  let cumulative = 0;
  // 按概率从低到高检查：rainbow → gold → silver → copper
  const order: Rarity[] = ['rainbow', 'gold', 'silver', 'copper'];
  for (const rarity of order) {
    cumulative += probabilities[rarity];
    if (rand < cumulative) return rarity;
  }
  return 'copper';
}

/**
 * 从指定品质卡池随机抽一张卡
 */
function drawRandomCard(rarity: Rarity, excludeIds: Set<number>) {
  const pool = CARD_POOL[rarity].filter(c => !excludeIds.has(c.id));
  if (pool.length === 0) {
    // fallback
    return CARD_POOL[rarity][Math.floor(Math.random() * CARD_POOL[rarity].length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 抽取一个卡包（5张）
 */
export function drawPack(packType: PackType, counters: GuaranteeCounters): { results: DrawResult[]; newCounters: GuaranteeCounters } {
  const config = PACK_CONFIG[packType];
  const newCounters = { ...counters };
  newCounters[packType]++;

  const results: DrawResult[] = [];
  const drawnIds = new Set<number>();

  const isGuaranteed = newCounters[packType] >= config.guarantee.every;
  let guaranteedUsed = false;

  for (let i = 0; i < config.drawCount; i++) {
    let rarity: Rarity;

    // 保底触发：最后1张强制指定品质
    if (isGuaranteed && !guaranteedUsed && i === config.drawCount - 1) {
      rarity = config.guarantee.target;
      guaranteedUsed = true;
      newCounters[packType] = 0;
    } else {
      rarity = rollRarity(config.probabilities);
    }

    const card = drawRandomCard(rarity, drawnIds);
    results.push({
      card,
      rarity,
      isGuaranteed: isGuaranteed && i === config.drawCount - 1 && guaranteedUsed,
      drawIndex: i,
    });
    drawnIds.add(card.id);
  }

  return { results, newCounters };
}

/**
 * 十连抽（10包 = 50张卡）
 */
export function drawTenPacks(packType: PackType, counters: GuaranteeCounters): { results: PackResult[]; newCounters: GuaranteeCounters } {
  const allResults: PackResult[] = [];
  let currentCounters = { ...counters };

  for (let packIndex = 0; packIndex < 10; packIndex++) {
    const { results, newCounters } = drawPack(packType, currentCounters);
    currentCounters = newCounters;
    allResults.push({ packIndex, cards: results });
  }

  return { results: allResults, newCounters: currentCounters };
}

/**
 * 记录抽卡历史
 */
export function recordDrawHistory(packType: PackType, cards: DrawResult[]) {
  const history = loadHistory();
  history.push({
    timestamp: Date.now(),
    packType,
    cards: cards.map(c => ({ id: c.card.id, name: c.card.name, rarity: c.rarity, isGuaranteed: c.isGuaranteed })),
  });
  saveHistory(history);
}
