import {
  BookOpen, ChevronRight, Globe, Layers, ShieldCheck,
  Sparkles, Swords, Trophy,
} from 'lucide-react';

interface Props {
  onLocalGame: () => void;
  onMultiplayer: () => void;
  onTutorial: () => void;
  onGacha: () => void;
  onDeckBuilder: () => void;
}

interface MenuActionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  accent?: 'blue' | 'emerald' | 'violet';
}

function MenuAction({ title, subtitle, icon, onClick, primary, accent = 'blue' }: MenuActionProps) {
  return (
    <button
      onClick={onClick}
      className={`release-menu-action ${primary ? 'release-menu-action-primary' : ''} release-menu-action-${accent}`}
    >
      <span className="release-menu-icon">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm sm:text-base font-bold tracking-wide text-white">{title}</span>
        <span className="block mt-0.5 text-[10px] sm:text-[11px] text-slate-400">{subtitle}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-amber-300/70 transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  );
}

export default function MainMenu({ onLocalGame, onMultiplayer, onTutorial, onGacha, onDeckBuilder }: Props) {
  return (
    <main className="release-screen">
      <div className="release-backdrop release-backdrop-menu" />
      <div className="release-vignette" />
      <div className="release-grain" />

      <div className="relative z-10 w-full min-h-[100dvh] flex flex-col px-4 sm:px-8 lg:px-12 py-5 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="release-status-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            战争议会已就绪
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500/80" />
            Early Access Build 1.0
          </div>
        </header>

        <div className="flex-1 grid lg:grid-cols-[minmax(320px,480px)_minmax(280px,1fr)] items-center gap-8 lg:gap-16 max-w-7xl w-full mx-auto py-8">
          <section className="flex flex-col items-center lg:items-start">
            <div className="relative mb-3">
              <div className="absolute inset-4 bg-amber-500/15 blur-3xl rounded-full" />
              <img
                src="/logo.png"
                alt="将领：征服"
                className="relative w-56 sm:w-72 lg:w-80 h-auto object-contain release-logo"
                draggable={false}
              />
            </div>

            <div className="release-title-rule w-full max-w-sm mb-5">
              <span>精确距离战术卡牌对决</span>
            </div>

            <div className="w-full max-w-sm space-y-2.5">
              <MenuAction
                title="开始征服"
                subtitle="选择阵营，与战术 AI 展开完整对局"
                icon={<Swords className="w-5 h-5" />}
                onClick={onLocalGame}
                primary
              />
              <MenuAction
                title="联机战场"
                subtitle="创建房间，与好友实时交锋"
                icon={<Globe className="w-5 h-5" />}
                onClick={onMultiplayer}
                accent="blue"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <MenuAction
                  title="我的军团"
                  subtitle="构筑卡组"
                  icon={<Layers className="w-4 h-4" />}
                  onClick={onDeckBuilder}
                  accent="emerald"
                />
                <MenuAction
                  title="征召卡包"
                  subtitle="体验抽卡"
                  icon={<Sparkles className="w-4 h-4" />}
                  onClick={onGacha}
                  accent="violet"
                />
              </div>
              <button onClick={onTutorial} className="release-text-action">
                <BookOpen className="w-4 h-4" />
                查看战争学院与完整规则
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          </section>

          <aside className="hidden lg:flex justify-end">
            <div className="release-intel-panel">
              <div className="release-panel-eyebrow">COMMANDER BRIEFING</div>
              <h2 className="mt-2 text-2xl font-bold text-amber-100 release-display">掌控战线，击溃总部</h2>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                每一次部署都会改变攻击距离。保护后排、突破前线，并在正确的时机发动技能组合。
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="release-stat"><strong>80</strong><span>现役卡牌</span></div>
                <div className="release-stat"><strong>3</strong><span>特色阵营</span></div>
                <div className="release-stat"><strong>40</strong><span>军团卡组</span></div>
              </div>
              <div className="mt-5 pt-4 border-t border-amber-200/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-amber-400/30 bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">今日战术提示</div>
                  <div className="text-[10px] text-slate-500 mt-1">前线被清空后，近战单位将直接威胁总部。</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-600 uppercase tracking-[0.14em]">
          <span>Generals Conquest</span>
          <span>本地对战 · 好友联机 · 自定义军团</span>
        </footer>
      </div>
    </main>
  );
}
