import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ChevronRight,
  Crown,
  Eye,
  Gem,
  Gift,
  Package,
  RotateCcw,
  SkipForward,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import type { DrawResult, Rarity } from '@/data/gacha';
import { RARITY_NAMES } from '@/data/gacha';
import { getVisibleSkillLabels } from '@/utils/skillLabels';

type Stage = 'opening' | 'forecast' | 'reveal' | 'spotlight' | 'results';

interface Props {
  results: DrawResult[];
  drawMode: 'single' | 'ten';
  packType: string;
  onClose: () => void;
  onDrawAgain: () => void;
}

interface PackTheme {
  label: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  shell: string;
  accent: string;
  border: string;
  glow: string;
}

const PACK_THEMES: Record<string, PackTheme> = {
  普通卡包: {
    label: '前线补给',
    subtitle: '基础军备征召',
    icon: Package,
    shell: 'linear-gradient(145deg, #3b291c, #8b5a2b 48%, #261a14)',
    accent: '#d6a56a',
    border: '#8b633a',
    glow: 'rgba(180, 116, 56, .42)',
  },
  贵族卡包: {
    label: '贵族军函',
    subtitle: '银辉精锐征召',
    icon: Gift,
    shell: 'linear-gradient(145deg, #1d2734, #718096 48%, #111827)',
    accent: '#d9e2ec',
    border: '#94a3b8',
    glow: 'rgba(148, 163, 184, .48)',
  },
  大师卡包: {
    label: '大师秘藏',
    subtitle: '高阶战术征召',
    icon: Gem,
    shell: 'linear-gradient(145deg, #111c3d, #2456a6 48%, #090e25)',
    accent: '#75b7ff',
    border: '#3b82f6',
    glow: 'rgba(59, 130, 246, .5)',
  },
  顶富卡包: {
    label: '王庭宝库',
    subtitle: '至高荣耀征召',
    icon: Crown,
    shell: 'linear-gradient(145deg, #2c1247, #7e22ce 45%, #180925)',
    accent: '#f3b7ff',
    border: '#c084fc',
    glow: 'rgba(192, 132, 252, .55)',
  },
};

const DEFAULT_THEME = PACK_THEMES.普通卡包;

const RARITY_META: Record<Rarity, {
  label: string;
  forecast: string;
  color: string;
  border: string;
  soft: string;
  glow: string;
}> = {
  copper: {
    label: '铜',
    forecast: '军备封印稳定',
    color: '#e2a665',
    border: '#9a6234',
    soft: 'rgba(154, 98, 52, .18)',
    glow: 'rgba(194, 119, 57, .35)',
  },
  silver: {
    label: '银',
    forecast: '银辉正在汇聚',
    color: '#dce6f2',
    border: '#94a3b8',
    soft: 'rgba(148, 163, 184, .18)',
    glow: 'rgba(203, 213, 225, .42)',
  },
  gold: {
    label: '金',
    forecast: '金色共鸣出现',
    color: '#ffd65c',
    border: '#eab308',
    soft: 'rgba(234, 179, 8, .16)',
    glow: 'rgba(250, 204, 21, .62)',
  },
  rainbow: {
    label: '彩',
    forecast: '检测到虹彩异象',
    color: '#f5d0fe',
    border: '#d946ef',
    soft: 'rgba(217, 70, 239, .16)',
    glow: 'rgba(217, 70, 239, .68)',
  },
};

const RARITY_ORDER: Record<Rarity, number> = {
  copper: 1,
  silver: 2,
  gold: 3,
  rainbow: 4,
};

const FACTION_ART: Record<string, string> = {
  帝国军团: '/unit_empire_champion.jpg',
  荒野游侠: '/unit_wild_ranger.jpg',
  奥术学院: '/unit_arcane_mage.jpg',
  通用: '/main-menu-war-room.jpg',
};

function getHighest(results: DrawResult[]) {
  return [...results].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])[0];
}

function groupPacks(results: DrawResult[]) {
  const packs: DrawResult[][] = [];
  for (let index = 0; index < results.length; index += 5) {
    packs.push(results.slice(index, index + 5));
  }
  return packs;
}

function RarityPips({ results }: { results: DrawResult[] }) {
  const counts = useMemo(() => ({
    copper: results.filter(result => result.rarity === 'copper').length,
    silver: results.filter(result => result.rarity === 'silver').length,
    gold: results.filter(result => result.rarity === 'gold').length,
    rainbow: results.filter(result => result.rarity === 'rainbow').length,
  }), [results]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {(Object.keys(counts) as Rarity[]).map((rarity) => (
        <div
          key={rarity}
          className="flex items-center gap-1.5 rounded-full border bg-black/30 px-2.5 py-1 text-[10px] font-black"
          style={{ borderColor: `${RARITY_META[rarity].border}66`, color: RARITY_META[rarity].color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: RARITY_META[rarity].color }} />
          {RARITY_NAMES[rarity]} {counts[rarity]}
        </div>
      ))}
    </div>
  );
}

function PackSeal({ theme, opened = false, delay = 0 }: { theme: PackTheme; opened?: boolean; delay?: number }) {
  const Icon = theme.icon;
  return (
    <div
      className={`gacha-pack relative flex h-52 w-36 items-center justify-center overflow-hidden rounded-2xl sm:h-64 sm:w-44 ${opened ? 'gacha-pack-opened' : ''}`}
      style={{
        background: theme.shell,
        border: `2px solid ${theme.border}`,
        boxShadow: `0 0 65px ${theme.glow}, inset 0 0 35px rgba(255,255,255,.08)`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="absolute inset-2 rounded-xl border border-white/15" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25 shadow-[0_0_14px_rgba(255,255,255,.8)]" />
      <div className="absolute -left-10 top-5 h-16 w-56 rotate-[-15deg] bg-white/5" />
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full border bg-black/35 sm:h-24 sm:w-24"
        style={{ borderColor: `${theme.accent}88`, color: theme.accent }}
      >
        <Icon className="h-9 w-9 sm:h-11 sm:w-11" />
        <div className="absolute inset-1 rounded-full border border-dashed border-white/20" />
      </div>
      <div className="absolute bottom-5 left-3 right-3 text-center">
        <div className="text-sm font-black tracking-[0.16em] text-white">{theme.label}</div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/45">{theme.subtitle}</div>
      </div>
    </div>
  );
}

function CardFace({
  result,
  compact = false,
  featured = false,
  onClick,
}: {
  result: DrawResult;
  compact?: boolean;
  featured?: boolean;
  onClick?: () => void;
}) {
  const card = result.card;
  const meta = RARITY_META[result.rarity];
  const art = FACTION_ART[card.faction] ?? FACTION_ART.通用;
  const isUnit = card.type === '士兵';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`gacha-card-face group relative overflow-hidden rounded-xl text-left ${
        featured
          ? 'h-[380px] w-[250px] sm:h-[460px] sm:w-[302px]'
          : compact
            ? 'h-[108px] w-full min-w-0 sm:h-[132px]'
            : 'h-52 w-36 sm:h-64 sm:w-44'
      } ${onClick ? 'cursor-pointer transition hover:-translate-y-1' : 'cursor-default'}`}
      style={{
        border: `2px solid ${meta.border}`,
        background: '#080b12',
        boxShadow: featured ? `0 0 80px ${meta.glow}` : `0 0 24px ${meta.glow}`,
      }}
    >
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#06080d] from-0% via-45% to-78%" />
      {result.rarity === 'rainbow' && <div className="gacha-rainbow-sheen absolute inset-0" />}
      {result.rarity === 'gold' && <div className="gacha-gold-sheen absolute inset-0" />}

      <div className="relative z-10 flex h-full flex-col p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <span
            className={`flex items-center justify-center rounded-full border bg-black/65 font-black text-blue-100 ${
              compact ? 'h-5 w-5 text-[9px]' : featured ? 'h-9 w-9 text-base' : 'h-7 w-7 text-xs'
            }`}
            style={{ borderColor: '#60a5fa88' }}
          >
            {card.cost}
          </span>
          <span
            className={`rounded-full border bg-black/65 font-black ${compact ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[9px]'}`}
            style={{ borderColor: `${meta.border}88`, color: meta.color }}
          >
            {meta.label} · {card.faction.replace('军团', '').replace('学院', '')}
          </span>
        </div>

        <div className="mt-auto">
          <div className={`font-black text-white drop-shadow-lg ${compact ? 'truncate text-[10px]' : featured ? 'text-xl' : 'text-sm'}`}>
            {card.name}
          </div>
          {!compact && (
            <>
              <div className={`mt-1 font-bold uppercase tracking-wider ${featured ? 'text-xs' : 'text-[9px]'}`} style={{ color: meta.color }}>
                {card.subtype} · {card.type}
              </div>
              <p className={`mt-2 line-clamp-3 leading-4 text-slate-300 ${featured ? 'text-xs sm:text-sm sm:leading-5' : 'text-[9px]'}`}>
                {card.desc}
              </p>
            </>
          )}
          <div className={`mt-2 flex items-center gap-1.5 ${compact ? 'text-[8px]' : featured ? 'text-sm' : 'text-[10px]'}`}>
            {isUnit ? (
              <>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-black text-rose-300">{card.atk} 攻</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-black text-emerald-300">{card.hp} 血</span>
                {card.armor > 0 && <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-black text-sky-300">{card.armor} 甲</span>}
              </>
            ) : (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-black text-purple-300">法术</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function OpeningStage({ theme, highest }: { theme: PackTheme; highest: DrawResult }) {
  return (
    <div className="relative flex flex-col items-center gap-7">
      <div
        className="gacha-opening-aura absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: RARITY_META[highest.rarity].glow }}
      />
      <div className="relative">
        <div className="gacha-orbit absolute -inset-12 rounded-full border border-dashed border-white/15" />
        <PackSeal theme={theme} opened />
      </div>
      <div className="relative text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>正在解除军备封印</div>
        <div className="mt-2 text-lg font-black text-white">{theme.label}</div>
      </div>
    </div>
  );
}

function ForecastStage({ highest }: { highest: DrawResult }) {
  const meta = RARITY_META[highest.rarity];
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`gacha-forecast-core flex h-32 w-32 items-center justify-center rounded-full border-2 sm:h-44 sm:w-44 ${
          highest.rarity === 'rainbow' ? 'gacha-rainbow-core' : ''
        }`}
        style={{ borderColor: meta.border, background: meta.soft, boxShadow: `0 0 90px ${meta.glow}` }}
      >
        <Sparkles className="h-12 w-12 sm:h-16 sm:w-16" style={{ color: meta.color }} />
      </div>
      <div className="mt-8 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">封印响应</div>
      <h2 className="mt-2 text-2xl font-black sm:text-4xl" style={{ color: meta.color }}>{meta.forecast}</h2>
      <p className="mt-3 text-xs text-slate-400">本次征召的最高品质已被感知</p>
    </div>
  );
}

function SingleReveal({ results }: { results: DrawResult[] }) {
  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">逐一确认征召结果</div>
        <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">五枚军印正在响应</h2>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4">
        {results.map((result, index) => (
          <div key={`${result.card.id}-${index}`} className="gacha-card-arrive" style={{ animationDelay: `${index * 180}ms` }}>
            <CardFace result={result} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TenReveal({ results, theme }: { results: DrawResult[]; theme: PackTheme }) {
  const packs = useMemo(() => groupPacks(results), [results]);
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">十包连续征召</div>
        <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">军备封印依次开启</h2>
      </div>
      <div className="grid w-full grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-3">
        {packs.map((pack, index) => {
          const highest = getHighest(pack);
          const meta = RARITY_META[highest.rarity];
          const Icon = theme.icon;
          return (
            <div
              key={index}
              className="gacha-mini-pack relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-xl border bg-slate-950/90"
              style={{
                animationDelay: `${index * 110}ms`,
                borderColor: meta.border,
                boxShadow: `0 0 24px ${meta.glow}`,
              }}
            >
              <div className="absolute inset-0 opacity-40" style={{ background: theme.shell }} />
              <Icon className="relative h-5 w-5 text-white/80 sm:h-7 sm:w-7" />
              <span className="relative mt-2 text-[9px] font-black sm:text-[10px]" style={{ color: meta.color }}>
                {index + 1}
              </span>
              <span className="relative mt-0.5 text-[7px] text-white/45">最高 {meta.label}</span>
            </div>
          );
        })}
      </div>
      <RarityPips results={results} />
    </div>
  );
}

function SpotlightStage({ result }: { result: DrawResult }) {
  const meta = RARITY_META[result.rarity];
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="gacha-spotlight-beam pointer-events-none absolute -top-40 h-[700px] w-[420px]"
        style={{ background: `linear-gradient(to bottom, ${meta.glow}, transparent 72%)` }}
      />
      <div className="relative mb-5 text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: meta.color }}>
          {result.rarity === 'rainbow' ? '虹彩传奇降临' : '金色精锐应召'}
        </div>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{result.card.name}</h2>
      </div>
      <div className="gacha-featured-arrive relative">
        <CardFace result={result} featured />
      </div>
      {result.isGuaranteed && (
        <div className="mt-4 rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-1.5 text-[10px] font-black text-rose-200">
          本次触发保底征召
        </div>
      )}
    </div>
  );
}

function CardDetail({ result, onClose }: { result: DrawResult; onClose: () => void }) {
  const card = result.card;
  return (
    <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="flex max-h-[90vh] max-w-2xl flex-col gap-5 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-4 sm:flex-row sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="shrink-0 self-center">
          <CardFace result={result} featured />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: RARITY_META[result.rarity].color }}>
                {RARITY_META[result.rarity].label} · {card.faction}
              </div>
              <h3 className="mt-1 text-xl font-black text-white">{card.name}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white" aria-label="关闭卡牌详情">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">{card.desc}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 p-3 text-blue-200"><b>{card.cost}</b> 费用</div>
            <div className="rounded-lg border border-purple-400/20 bg-purple-400/10 p-3 text-purple-200">{card.subtype}</div>
            <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200"><b>{card.atk}</b> 攻击</div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200"><b>{card.hp}</b> 生命</div>
          </div>
          <div className="mt-5">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">技能关键词</div>
            <div className="flex flex-wrap gap-2">
              {getVisibleSkillLabels(card.skills, card.desc).length > 0 ? getVisibleSkillLabels(card.skills, card.desc).map(skill => (
                <span key={skill} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">{skill}</span>
              )) : <span className="text-xs text-slate-600">无额外技能</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultStage({
  results,
  packType,
  drawMode,
  onDrawAgain,
  onClose,
  onSelect,
}: {
  results: DrawResult[];
  packType: string;
  drawMode: 'single' | 'ten';
  onDrawAgain: () => void;
  onClose: () => void;
  onSelect: (result: DrawResult) => void;
}) {
  const sorted = useMemo(() => [...results].sort((a, b) => {
    const rarity = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
    return rarity || b.card.cost - a.card.cost;
  }), [results]);
  const featured = sorted.slice(0, Math.min(drawMode === 'ten' ? 3 : 1, sorted.length));

  return (
    <div className="flex w-full max-w-6xl flex-col gap-5 px-1 pb-24 pt-4 sm:px-4">
      <div className="text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">{packType} · 征召完成</div>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">本次军备已送达</h2>
        <p className="mt-2 text-xs text-slate-500">点击任意卡牌可查看完整信息</p>
      </div>

      <RarityPips results={results} />

      <section>
        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          本次焦点
        </div>
        <div className={`grid gap-3 ${featured.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {featured.map((result, index) => (
            <button
              type="button"
              key={`${result.card.id}-feature-${index}`}
              onClick={() => onSelect(result)}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                style={{ borderColor: RARITY_META[result.rarity].border, background: RARITY_META[result.rarity].soft, color: RARITY_META[result.rarity].color }}
              >
                {result.rarity === 'rainbow' ? <Crown className="h-5 w-5" /> : result.rarity === 'gold' ? <Sparkles className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-white">{result.card.name}</div>
                <div className="mt-1 text-[10px] text-slate-500">{result.card.faction} · {result.card.subtype}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <Eye className="h-3.5 w-3.5 text-blue-400" />
            全部结果 · 已按品质排序
          </div>
          <span className="text-[10px] text-slate-600">{results.length} 张</span>
        </div>
        <div className={`grid gap-1.5 ${drawMode === 'ten' ? 'grid-cols-5 sm:grid-cols-8 lg:grid-cols-10' : 'grid-cols-3 sm:grid-cols-5'}`}>
          {sorted.map((result, index) => (
            <CardFace key={`${result.card.id}-${index}`} result={result} compact onClick={() => onSelect(result)} />
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-[100005] border-t border-white/10 bg-slate-950/90 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            返回卡包
          </button>
          <button
            type="button"
            onClick={onDrawAgain}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-300 px-5 text-xs font-black text-slate-950 transition hover:brightness-110"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            再次{drawMode === 'ten' ? '十连征召' : '开启一包'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GachaAnimation({ results, drawMode, packType, onClose, onDrawAgain }: Props) {
  const [stage, setStage] = useState<Stage>('opening');
  const [detailCard, setDetailCard] = useState<DrawResult | null>(null);
  const theme = PACK_THEMES[packType] ?? DEFAULT_THEME;
  const highest = useMemo(() => getHighest(results), [results]);
  const hasSpotlight = highest.rarity === 'gold' || highest.rarity === 'rainbow';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStage('opening');
      setDetailCard(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [results]);

  useEffect(() => {
    const timings: Partial<Record<Stage, number>> = {
      opening: 1650,
      forecast: 1150,
      reveal: drawMode === 'ten' ? 2200 : 2800,
      spotlight: 2400,
    };
    const delay = timings[stage];
    if (!delay) return;

    const timer = window.setTimeout(() => {
      if (stage === 'opening') setStage('forecast');
      else if (stage === 'forecast') setStage('reveal');
      else if (stage === 'reveal') setStage(hasSpotlight ? 'spotlight' : 'results');
      else if (stage === 'spotlight') setStage('results');
    }, delay);
    return () => window.clearTimeout(timer);
  }, [stage, drawMode, hasSpotlight]);

  return (
    <div data-gacha-animation="v1" className="fixed inset-0 z-[99999] overflow-y-auto bg-[#03050a] text-slate-100">
      <style>{`
        @keyframes gachaPackOpen {
          0%, 32% { transform: translateY(0) rotate(0); filter: brightness(1); }
          44% { transform: translateY(-8px) rotate(-3deg); }
          54% { transform: translateY(5px) rotate(3deg); filter: brightness(1.35); }
          72% { transform: scale(1.08); filter: brightness(1.8); }
          100% { transform: scale(1.22); filter: brightness(2.5); opacity: 0; }
        }
        @keyframes gachaAura { 0%,100% { transform: translate(-50%,-50%) scale(.78); opacity: .35; } 50% { transform: translate(-50%,-50%) scale(1.2); opacity: .8; } }
        @keyframes gachaOrbit { to { transform: rotate(360deg); } }
        @keyframes gachaForecast { 0% { transform: scale(.25); opacity: 0; } 58% { transform: scale(1.14); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes gachaRainbow { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes gachaCardArrive { 0% { transform: translateY(60px) rotateY(90deg) scale(.75); opacity: 0; } 70% { transform: translateY(-8px) rotateY(0) scale(1.04); opacity: 1; } 100% { transform: translateY(0) rotateY(0) scale(1); opacity: 1; } }
        @keyframes gachaMiniPack { 0% { transform: translateY(-30px) scale(.72); opacity: 0; filter: brightness(2); } 70% { transform: translateY(4px) scale(1.05); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes gachaFeatured { 0% { transform: translateY(80px) scale(.55) rotateY(90deg); opacity: 0; } 65% { transform: translateY(-10px) scale(1.08) rotateY(0); opacity: 1; } 100% { transform: translateY(0) scale(1) rotateY(0); opacity: 1; } }
        @keyframes gachaSheen { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes gachaBeam { 0% { opacity: 0; transform: scaleX(.2); } 100% { opacity: .8; transform: scaleX(1); } }
        .gacha-pack-opened { animation: gachaPackOpen 1.65s cubic-bezier(.2,.8,.2,1) forwards; }
        .gacha-opening-aura { animation: gachaAura 1.2s ease-in-out infinite; }
        .gacha-orbit { animation: gachaOrbit 7s linear infinite; }
        .gacha-forecast-core { animation: gachaForecast .7s cubic-bezier(.2,.9,.2,1) both; }
        .gacha-rainbow-core, .gacha-rainbow-sheen { animation: gachaRainbow 2.4s linear infinite; }
        .gacha-card-arrive { opacity: 0; animation: gachaCardArrive .75s cubic-bezier(.2,.9,.2,1) forwards; perspective: 900px; }
        .gacha-mini-pack { opacity: 0; animation: gachaMiniPack .6s cubic-bezier(.2,.9,.2,1) forwards; }
        .gacha-featured-arrive { animation: gachaFeatured .9s cubic-bezier(.2,.9,.2,1) both; perspective: 1000px; }
        .gacha-gold-sheen::after, .gacha-rainbow-sheen::after { content:''; position:absolute; inset:-20%; width:38%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent); animation:gachaSheen 2.1s ease-in-out infinite; }
        .gacha-spotlight-beam { animation: gachaBeam .8s ease-out both; clip-path: polygon(43% 0,57% 0,100% 100%,0 100%); filter: blur(12px); }
        @media (prefers-reduced-motion: reduce) {
          .gacha-pack-opened, .gacha-opening-aura, .gacha-orbit, .gacha-forecast-core, .gacha-rainbow-core,
          .gacha-card-arrive, .gacha-mini-pack, .gacha-featured-arrive, .gacha-gold-sheen::after,
          .gacha-rainbow-sheen::after, .gacha-spotlight-beam { animation-duration: .01ms !important; animation-delay: 0ms !important; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,.12),transparent_35%),radial-gradient(circle_at_50%_110%,rgba(37,99,235,.14),transparent_42%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:44px_44px]" />

      {stage !== 'results' && (
        <>
          <button
            type="button"
            onClick={() => setStage('results')}
            className="fixed right-3 top-3 z-[100005] flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[10px] font-bold text-slate-400 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
            跳过演出
          </button>
          <div className="fixed left-3 top-3 z-[100005] rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
            <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: theme.accent }}>{theme.label}</div>
            <div className="mt-0.5 text-[8px] text-slate-600">{drawMode === 'ten' ? '十连征召 · 50 张' : '开启一包 · 5 张'}</div>
          </div>
        </>
      )}

      <main className={`relative z-10 mx-auto flex min-h-screen w-full items-center justify-center px-3 py-16 ${stage === 'results' ? 'items-start' : ''}`}>
        {stage === 'opening' && <OpeningStage theme={theme} highest={highest} />}
        {stage === 'forecast' && <ForecastStage highest={highest} />}
        {stage === 'reveal' && (drawMode === 'single' ? <SingleReveal results={results} /> : <TenReveal results={results} theme={theme} />)}
        {stage === 'spotlight' && <SpotlightStage result={highest} />}
        {stage === 'results' && (
          <ResultStage
            results={results}
            packType={packType}
            drawMode={drawMode}
            onDrawAgain={onDrawAgain}
            onClose={onClose}
            onSelect={setDetailCard}
          />
        )}
      </main>

      {detailCard && <CardDetail result={detailCard} onClose={() => setDetailCard(null)} />}

      {stage === 'spotlight' && (
        <div className="pointer-events-none fixed inset-0 z-[1]">
          <Zap className="absolute left-[12%] top-[22%] h-6 w-6 text-amber-300/25" />
          <Sparkles className="absolute right-[15%] top-[30%] h-8 w-8 text-purple-300/30" />
          <Crown className="absolute bottom-[20%] left-[18%] h-7 w-7 text-yellow-300/20" />
        </div>
      )}
    </div>
  );
}
