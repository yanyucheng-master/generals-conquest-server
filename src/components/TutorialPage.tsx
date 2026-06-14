import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Crosshair,
  Eye,
  Flag,
  Hand,
  Heart,
  Lightbulb,
  Map,
  MousePointerClick,
  Move,
  Play,
  Shield,
  Sparkles,
  Swords,
  Target,
  X,
  Zap,
} from 'lucide-react';

interface TutorialPageProps {
  onClose: () => void;
  onBack?: () => void;
}

interface Chapter {
  title: string;
  shortTitle: string;
  kicker: string;
  icon: ReactNode;
  content: ReactNode;
}

function InfoCard({
  icon,
  title,
  children,
  tone = 'slate',
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' | 'purple';
}) {
  const tones = {
    slate: 'border-slate-700/70 bg-slate-900/65',
    amber: 'border-amber-500/25 bg-amber-500/10',
    blue: 'border-blue-500/25 bg-blue-500/10',
    emerald: 'border-emerald-500/25 bg-emerald-500/10',
    rose: 'border-rose-500/25 bg-rose-500/10',
    purple: 'border-purple-500/25 bg-purple-500/10',
  };

  return (
    <div className={`rounded-xl border p-3.5 sm:p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
        {icon}
        {title}
      </div>
      <div className="text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{children}</div>
    </div>
  );
}

function BattlefieldDiagram() {
  const rows = [
    { label: '敌方底线', side: 'enemy', cells: ['远程位', '敌方 HQ', '远程位'] },
    { label: '敌方前线', side: 'enemy', cells: ['单位位', '单位位', '单位位'] },
    { label: '我方前线', side: 'player', cells: ['单位位', '单位位', '单位位'] },
    { label: '我方底线', side: 'player', cells: ['远程位', '我方 HQ', '远程位'] },
  ];

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-3 shadow-2xl shadow-black/30 sm:p-5">
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <span>敌方阵地</span>
        <span className="text-amber-400">精确距离战场</span>
        <span>我方阵地</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, rowIndex) => (
          <div key={row.label} className="grid grid-cols-[58px_1fr] items-center gap-2 sm:grid-cols-[72px_1fr]">
            <span className={`text-[10px] font-bold sm:text-xs ${row.side === 'enemy' ? 'text-rose-300' : 'text-blue-300'}`}>
              {row.label}
            </span>
            <div className={`grid grid-cols-3 gap-1.5 rounded-xl border p-1.5 ${
              row.side === 'enemy'
                ? 'border-rose-500/20 bg-rose-950/35'
                : 'border-blue-500/20 bg-blue-950/35'
            } ${rowIndex === 1 ? 'mb-3' : ''}`}>
              {row.cells.map((cell, cellIndex) => {
                const isHq = cell.includes('HQ');
                return (
                  <div
                    key={`${row.label}-${cellIndex}`}
                    className={`flex min-h-12 items-center justify-center rounded-lg border text-center text-[10px] font-bold sm:min-h-16 sm:text-xs ${
                      isHq
                        ? 'border-amber-400/60 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.12)]'
                        : row.side === 'enemy'
                          ? 'border-rose-400/20 bg-rose-400/5 text-rose-200/70'
                          : 'border-blue-400/20 bg-blue-400/5 text-blue-200/70'
                    }`}
                  >
                    {isHq ? <><Flag className="mr-1 h-3.5 w-3.5" />{cell}</> : cell}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2.5 text-[11px] leading-5 text-amber-100/80 sm:text-xs">
        <Move className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        某一整条前线没有单位时，这条前线会在距离计算中被跳过，双方会瞬间靠近。
      </div>
    </div>
  );
}

function FirstTurnGuide() {
  const steps = [
    {
      number: '01',
      icon: <Hand className="h-5 w-5" />,
      title: '观察手牌与金币',
      text: '开局进入部署阶段时有 5 张手牌和 3 金币。优先选择费用不超过当前金币的士兵。',
      tone: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
    },
    {
      number: '02',
      icon: <MousePointerClick className="h-5 w-5" />,
      title: '点击部署，不用拖动',
      text: '先点击一张士兵牌，再点击亮起的蓝色己方格位。法术牌选中后按牌面提示选择目标。',
      tone: 'text-blue-300 border-blue-400/25 bg-blue-400/10',
    },
    {
      number: '03',
      icon: <Play className="h-5 w-5" />,
      title: '结束回合，自动攻击',
      text: '确认阵型后点击“结束回合”。单位会按固定顺序出手；若有狙击单位，还需统一指定目标。',
      tone: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
    },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {steps.map((step) => (
        <div key={step.number} className={`relative overflow-hidden rounded-2xl border p-4 ${step.tone}`}>
          <span className="absolute right-3 top-1 text-4xl font-black text-white/5">{step.number}</span>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/20">{step.icon}</div>
          <h4 className="mb-1.5 text-sm font-black text-white">{step.title}</h4>
          <p className="text-xs leading-5 text-slate-300">{step.text}</p>
        </div>
      ))}
    </div>
  );
}

function RangeGuide() {
  const ranges = [
    { name: '近战', range: '= 1', note: '只打相邻行', color: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
    { name: '弓箭', range: '= 2', note: '只打隔一行', color: 'border-orange-500/30 bg-orange-500/10 text-orange-300' },
    { name: '狙击', range: '≥ 2', note: '距离 1 是盲区', color: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
    { name: '魔法', range: '不限', note: '优先最近目标', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' },
    { name: '随机', range: '不限', note: '随机选择目标', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
      {ranges.map((item) => (
        <div key={item.name} className={`rounded-xl border p-3 text-center ${item.color}`}>
          <div className="mb-2 text-xs font-black">{item.name}</div>
          <div className="mb-1 text-xl font-black text-white sm:text-2xl">{item.range}</div>
          <div className="text-[10px] leading-4 text-slate-400">{item.note}</div>
        </div>
      ))}
    </div>
  );
}

function DistanceExample() {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-black text-white">距离示例</div>
          <div className="mt-1 text-[10px] text-slate-500">从我方前线单位向敌方计算</div>
        </div>
        <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">前线存在</span>
      </div>
      <div className="flex items-center gap-1.5 text-center text-[10px] sm:gap-3 sm:text-xs">
        <div className="flex h-14 flex-1 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-400/15 font-bold text-blue-200">我方单位</div>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex h-14 flex-1 flex-col items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/5 text-rose-200/80">
          <b className="text-amber-300">距离 1</b>敌方前线
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex h-14 flex-1 flex-col items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/5 text-rose-200/80">
          <b className="text-amber-300">距离 2</b>敌方底线 / HQ
        </div>
      </div>
    </div>
  );
}

function CombatGuide() {
  const order = ['前左', '前中', '前右', '后左', '后中', '后右'];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-white">
          <Zap className="h-4 w-4 text-amber-400" />
          固定攻击顺序
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {order.map((label, index) => (
            <div key={label} className={`rounded-lg border px-1 py-2.5 text-center ${
              index < 3 ? 'border-rose-400/25 bg-rose-400/10' : 'border-orange-400/25 bg-orange-400/10'
            }`}>
              <div className="mb-1 text-[10px] font-black text-amber-300">{index + 1}</div>
              <div className="text-[10px] font-bold text-white sm:text-xs">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          部署后的士兵本回合即可攻击。射程内有嘲讽单位时优先攻击嘲讽，否则通常优先最近且正前方的目标。
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <InfoCard icon={<Shield className="h-4 w-4 text-rose-300" />} title="物理伤害" tone="rose">
          先扣护甲。普通攻击击碎护甲时，溢出伤害不会继续扣生命。
        </InfoCard>
        <InfoCard icon={<Sparkles className="h-4 w-4 text-purple-300" />} title="魔法伤害" tone="purple">
          无视护甲，直接扣除生命值，适合处理重甲单位。
        </InfoCard>
        <InfoCard icon={<Crosshair className="h-4 w-4 text-slate-200" />} title="狙击选择" tone="slate">
          结束回合后，为本回合所有狙击单位指定一个共同目标。
        </InfoCard>
      </div>
    </div>
  );
}

function SkillGuide() {
  const skills = [
    { name: '嘲讽', desc: '射程内优先攻击它，用于保护关键单位。', color: 'text-blue-300', icon: <Shield className="h-4 w-4" /> },
    { name: '闪击', desc: '部署时立刻额外攻击一次，适合抢节奏。', color: 'text-rose-300', icon: <Zap className="h-4 w-4" /> },
    { name: '护甲', desc: '抵挡物理伤害，被击碎时通常可挡住溢出。', color: 'text-amber-300', icon: <Shield className="h-4 w-4" /> },
    { name: '流血', desc: '在回合开始阶段持续结算伤害。', color: 'text-orange-300', icon: <Heart className="h-4 w-4" /> },
    { name: '隐蔽', desc: '保护底线单位，HQ 不受隐蔽保护。', color: 'text-emerald-300', icon: <Eye className="h-4 w-4" /> },
    { name: '沉默', desc: '暂时关闭单位技能，属性与基础攻击仍保留。', color: 'text-purple-300', icon: <X className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <div key={skill.name} className="rounded-xl border border-slate-700/70 bg-slate-900/65 p-3.5">
          <div className={`mb-1.5 flex items-center gap-2 text-sm font-black ${skill.color}`}>
            {skill.icon}
            {skill.name}
          </div>
          <p className="text-xs leading-5 text-slate-400">{skill.desc}</p>
        </div>
      ))}
    </div>
  );
}

function TurnGuide() {
  const phases = [
    { number: '1', title: '资源', desc: '获得金币、抽牌并结算回合开始效果', color: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
    { number: '2', title: '部署', desc: '打出士兵或法术，调整阵型', color: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
    { number: '3', title: '攻击', desc: '点击结束回合后，单位依次自动出手', color: 'border-rose-400/30 bg-rose-400/10 text-rose-300' },
    { number: '4', title: '换边', desc: '对手部署与攻击，然后开始下一回合', color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {phases.map((phase) => (
          <div key={phase.number} className={`rounded-xl border p-3 ${phase.color}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/25 text-xs font-black">{phase.number}</span>
              <b className="text-sm text-white">{phase.title}</b>
            </div>
            <p className="text-[11px] leading-5 text-slate-400">{phase.desc}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-amber-200">
          <Coins className="h-4 w-4 text-amber-400" />
          每回合基础金币
        </div>
        <div className="grid grid-cols-6 gap-1.5 text-center">
          {[
            ['1–2', '3'],
            ['3–4', '4'],
            ['5–6', '5'],
            ['7–8', '6'],
            ['9–10', '7'],
            ['11+', '8'],
          ].map(([turn, gold]) => (
            <div key={turn} className="rounded-lg border border-amber-400/15 bg-black/15 px-1 py-2">
              <div className="text-[9px] text-amber-200/60">回合 {turn}</div>
              <div className="mt-1 text-base font-black text-amber-300">{gold}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CHAPTERS: Chapter[] = [
  {
    title: '先记住唯一目标',
    shortTitle: '战场目标',
    kicker: '01 · 战场与胜负',
    icon: <Map className="h-5 w-5" />,
    content: (
      <div className="space-y-4">
        <BattlefieldDiagram />
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard icon={<Target className="h-4 w-4 text-amber-400" />} title="如何获胜" tone="amber">
            将敌方 HQ 的 <b className="text-white">40 点生命</b>降至 0。单位只是通往 HQ 的防线，不必消灭所有敌军。
          </InfoCard>
          <InfoCard icon={<Shield className="h-4 w-4 text-blue-300" />} title="如何布阵" tone="blue">
            前线更早接敌，适合保护队友；底线更安全，适合远程、辅助和需要成长的单位。
          </InfoCard>
        </div>
      </div>
    ),
  },
  {
    title: '第一回合，照着这三步做',
    shortTitle: '首次部署',
    kicker: '02 · 实际操作',
    icon: <MousePointerClick className="h-5 w-5" />,
    content: (
      <div className="space-y-4">
        <FirstTurnGuide />
        <InfoCard icon={<Lightbulb className="h-4 w-4 text-amber-400" />} title="第一次部署建议" tone="amber">
          没有明确思路时，先把耐打或带“嘲讽”的单位放前线，再把远程单位放底线。不要为了花完金币而打乱射程。
        </InfoCard>
      </div>
    ),
  },
  {
    title: '距离决定谁能打到谁',
    shortTitle: '精确距离',
    kicker: '03 · 核心机制',
    icon: <Move className="h-5 w-5" />,
    content: (
      <div className="space-y-4">
        <RangeGuide />
        <DistanceExample />
        <InfoCard icon={<Eye className="h-4 w-4 text-blue-300" />} title="先看射程，再决定位置" tone="blue">
          近战放得太后可能无目标可打；狙击离敌人太近会进入盲区；普通弓箭必须保持距离 2。空前线会让距离缩短，可能同时打开近战突破口并让狙击失去目标。
        </InfoCard>
      </div>
    ),
  },
  {
    title: '结束回合后会发生什么',
    shortTitle: '攻击结算',
    kicker: '04 · 自动战斗',
    icon: <Swords className="h-5 w-5" />,
    content: <CombatGuide />,
  },
  {
    title: '先掌握六个常见关键词',
    shortTitle: '技能状态',
    kicker: '05 · 读懂卡牌',
    icon: <Sparkles className="h-5 w-5" />,
    content: (
      <div className="space-y-4">
        <SkillGuide />
        <InfoCard icon={<BookOpen className="h-4 w-4 text-purple-300" />} title="不需要一次背完" tone="purple">
          对战时可打开右上角的规则面板查看完整技能词典。新手阶段只需重点观察：射程、费用、攻击、生命、护甲和技能关键词。
        </InfoCard>
      </div>
    ),
  },
  {
    title: '完成一个回合循环',
    shortTitle: '回合资源',
    kicker: '06 · 准备出征',
    icon: <Clock3 className="h-5 w-5" />,
    content: (
      <div className="space-y-4">
        <TurnGuide />
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />} title="回合结束前检查" tone="emerald">
            确认每个单位都有可攻击目标、狙击没有贴脸、关键后排受到保护，再点击“结束回合”。
          </InfoCard>
          <InfoCard icon={<Target className="h-4 w-4 text-rose-300" />} title="最重要的策略" tone="rose">
            每次部署都会改变距离。先想清楚“这张牌放下后，谁能打到谁”，再考虑单张牌有多强。
          </InfoCard>
        </div>
      </div>
    ),
  },
];

export default function TutorialPage({ onClose, onBack }: TutorialPageProps) {
  const [page, setPage] = useState(0);
  const current = CHAPTERS[page];
  const progress = ((page + 1) / CHAPTERS.length) * 100;

  const goTo = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 0), CHAPTERS.length - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#070a10] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,158,11,0.14),transparent_40%),radial-gradient(circle_at_90%_70%,rgba(37,99,235,0.1),transparent_35%)]" />

      <header className="relative z-10 shrink-0 border-b border-white/10 bg-slate-950/85 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">返回</span>
              </button>
            )}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-black tracking-wide text-white sm:text-sm">战争学院 · 新兵手册</div>
              <div className="mt-0.5 hidden items-center gap-1 text-[9px] text-slate-500 sm:flex">
                <Clock3 className="h-3 w-3" /> 预计阅读 4 分钟
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500">{page + 1} / {CHAPTERS.length}</span>
            <button
              onClick={onClose}
              aria-label="关闭教程"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-amber-400 transition-all duration-300" style={{ width: `${progress}%` }} />
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-white/10 px-3 py-5 lg:block">
          <div className="mb-3 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">学习路线</div>
          <nav className="space-y-1.5">
            {CHAPTERS.map((chapter, index) => (
              <button
                key={chapter.shortTitle}
                onClick={() => goTo(index)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  index === page
                    ? 'border-amber-400/30 bg-amber-400/10 text-white'
                    : index < page
                      ? 'border-transparent text-slate-400 hover:bg-white/5'
                      : 'border-transparent text-slate-600 hover:bg-white/5 hover:text-slate-400'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  index === page ? 'bg-amber-400 text-slate-950' : index < page ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5'
                }`}>
                  {index < page ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="text-xs font-bold">{chapter.shortTitle}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {CHAPTERS.map((chapter, index) => (
                <button
                  key={chapter.shortTitle}
                  onClick={() => goTo(index)}
                  aria-label={`前往${chapter.shortTitle}`}
                  className={`h-1.5 shrink-0 rounded-full transition-all ${
                    index === page ? 'w-8 bg-amber-400' : index < page ? 'w-4 bg-emerald-400/60' : 'w-4 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400/80">
                {current.icon}
                {current.kicker}
              </div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-3xl">{current.title}</h1>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
                用清晰的战场图解掌握规则。先理解位置与距离，再学习卡牌组合。
              </p>
            </div>

            {current.content}
          </div>
        </main>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950/90 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            上一章
          </button>
          <span className="hidden text-[10px] text-slate-600 sm:block">{current.shortTitle}</span>
          {page < CHAPTERS.length - 1 ? (
            <button
              onClick={() => goTo(page + 1)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-400 px-4 text-xs font-black text-slate-950 transition hover:bg-amber-300"
            >
              下一章
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-400 px-4 text-xs font-black text-slate-950 transition hover:bg-emerald-300"
            >
              <Swords className="h-4 w-4" />
              我已了解，开始战斗
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
