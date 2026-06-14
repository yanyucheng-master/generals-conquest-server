import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BoardKey, CardDef, PlayerState, Skill, Unit } from '@/types/game';
import type { useGame } from '@/hooks/useGame';
import { QUALITY_COLORS } from '@/data/cards';
import { parseSkillLabels } from '@/utils/skillLabels';
import RulePanel from './RulePanel';
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  Crosshair,
  Crown,
  Flag,
  Hand,
  Heart,
  Library,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  game: ReturnType<typeof useGame>;
  multiplayer?: boolean;
  isMyTurn?: boolean;
}

const FACTION_ART: Record<string, string> = {
  帝国军团: '/unit_empire_champion.jpg',
  荒野游侠: '/unit_wild_ranger.jpg',
  奥术学院: '/unit_arcane_mage.jpg',
  通用: '/main-menu-war-room.jpg',
};

const FACTION_ACCENT: Record<string, string> = {
  帝国军团: '#ef4444',
  荒野游侠: '#22c55e',
  奥术学院: '#3b82f6',
  通用: '#f59e0b',
};

const PHASE_LABELS = {
  resource: '资源阶段',
  deploy: '部署阶段',
  attack: '攻击结算',
  end: '回合结束',
};

function getHpColor(pct: number): string {
  if (pct > 60) return 'bg-emerald-400';
  if (pct > 30) return 'bg-amber-400';
  return 'bg-rose-500';
}

function getQualityStyle(quality: string) {
  return QUALITY_COLORS[quality] || QUALITY_COLORS.铜;
}

function getFactionArt(faction: string) {
  return FACTION_ART[faction] ?? FACTION_ART.通用;
}

function getFactionAccent(faction: string) {
  return FACTION_ACCENT[faction] ?? FACTION_ACCENT.通用;
}

export default function GameBoard({ game, multiplayer, isMyTurn }: Props) {
  const { gameState } = game;
  const isDisabled = Boolean(multiplayer && !isMyTurn);
  const [logOpen, setLogOpen] = useState(false);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [beamStyle, setBeamStyle] = useState<CSSProperties>({ display: 'none' });
  const [skillBeamStyle, setSkillBeamStyle] = useState<CSSProperties>({ display: 'none' });

  useEffect(() => {
    const line = game.attackLine;
    const frame = requestAnimationFrame(() => {
      if (!line) {
        setBeamStyle({ display: 'none' });
        return;
      }
      const fromEl = cellRefs.current.get(line.from);
      const toEl = cellRefs.current.get(line.to);
      if (!fromEl || !toEl) {
        setBeamStyle({ display: 'none' });
        return;
      }
      const from = fromEl.getBoundingClientRect();
      const to = toEl.getBoundingClientRect();
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      const endX = to.left + to.width / 2;
      const endY = to.top + to.height / 2;
      const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
      setBeamStyle({
        position: 'fixed',
        left: startX,
        top: startY,
        width: length,
        height: 5,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'left center',
        background: 'linear-gradient(90deg, #fff7b2 0%, #f97316 45%, #ef4444 80%, transparent 100%)',
        zIndex: 45,
        pointerEvents: 'none',
        opacity: 0.96,
        boxShadow: '0 0 8px rgba(255,247,178,.9), 0 0 20px rgba(249,115,22,.7)',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [game.attackLine]);

  useEffect(() => {
    const line = game.skillLine;
    const frame = requestAnimationFrame(() => {
      if (!line) {
        setSkillBeamStyle({ display: 'none' });
        return;
      }
      const fromEl = cellRefs.current.get(line.from);
      const toEl = cellRefs.current.get(line.to);
      if (!fromEl || !toEl) {
        setSkillBeamStyle({ display: 'none' });
        return;
      }
      const from = fromEl.getBoundingClientRect();
      const to = toEl.getBoundingClientRect();
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      const endX = to.left + to.width / 2;
      const endY = to.top + to.height / 2;
      const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
      setSkillBeamStyle({
        position: 'fixed',
        left: startX,
        top: startY,
        width: length,
        height: 5,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'left center',
        background: 'linear-gradient(90deg, #f5d0fe 0%, #e879f9 20%, #f43f5e 68%, transparent 100%)',
        zIndex: 46,
        pointerEvents: 'none',
        opacity: 0.98,
        boxShadow: '0 0 9px rgba(245,208,254,.95), 0 0 24px rgba(244,63,94,.82)',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [game.skillLine]);

  const setCellRef = useCallback((key: BoardKey, element: HTMLDivElement | null) => {
    if (element) cellRefs.current.set(key, element);
    else cellRefs.current.delete(key);
  }, []);

  if (!gameState) return null;

  const player = gameState.player;
  const enemy = gameState.enemy;
  const highlightCells = game.getHighlightCells();
  const snipeTargets = game.getSnipeTargets();
  const selectedCard = game.selectedCardIdx === null ? null : player.hand[game.selectedCardIdx];
  const playerUnitCount = Object.keys(player.board).length;
  const enemyUnitCount = Object.keys(enemy.board).length;
  const phaseLabel = PHASE_LABELS[gameState.turnPhase] ?? '战斗中';
  const canEndTurn = !isDisabled
    && gameState.currentPlayer === 'player'
    && !gameState.sniperMode
    && !game.animating;

  const instruction = gameState.sniperMode
    ? `为 ${gameState.sniperQueue.length} 个狙击单位选择共同目标`
    : game.animating
      ? '正在结算攻击，请观察战场'
      : selectedCard
        ? `${selectedCard.name} 已选中 · 点击发光格位`
        : gameState.currentPlayer === 'player'
          ? '选择一张手牌，规划本回合部署'
          : '等待敌方完成部署';

  return (
    <div className="relative flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-[#070a10] text-slate-100">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-45" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(8,15,27,.1)_5%,rgba(3,7,13,.82)_88%)]" />
      <div className="absolute inset-0 z-[1] opacity-25 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px]" />

      {game.attackLine && beamStyle.display !== 'none' && <div data-testid="attack-line" className="battle-beam battle-beam-attack" style={beamStyle} />}
      {game.skillLine && skillBeamStyle.display !== 'none' && <div data-testid="skill-line" className="battle-beam battle-beam-skill" style={skillBeamStyle} />}

      {gameState.showTurnBanner && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="turn-banner rounded-2xl border border-amber-400/25 bg-black/75 px-8 py-4 text-3xl font-black tracking-[0.2em] text-amber-300 shadow-2xl shadow-amber-500/20 sm:text-5xl">
            第 {gameState.showTurnBanner} 回合
          </div>
        </div>
      )}

      {(gameState.showSnipeBanner || game.aiDeploying) && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-black shadow-xl backdrop-blur-xl ${
            gameState.showSnipeBanner
              ? 'border-purple-400/50 bg-purple-950/85 text-purple-200'
              : 'border-blue-400/40 bg-blue-950/85 text-blue-200'
          }`}>
            {gameState.showSnipeBanner ? <Crosshair className="h-4 w-4" /> : <Sparkles className="h-4 w-4 animate-pulse" />}
            {gameState.showSnipeBanner
              ? `${gameState.sniperQueue.length} 个狙击单位待指定目标`
              : '敌方正在部署'}
          </div>
        </div>
      )}

      <RulePanel />

      <header className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/80 px-3 backdrop-blur-xl sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <Swords className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide text-white sm:text-sm">将领：征服</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600">Tactical Command</div>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">回合</span>
          <b className="text-sm text-amber-300">{gameState.turn}</b>
          <span className="h-3 w-px bg-white/10" />
          <span className={`text-[10px] font-bold ${gameState.currentPlayer === 'player' ? 'text-blue-300' : 'text-rose-300'}`}>
            {gameState.currentPlayer === 'player' ? '你的行动' : '敌方行动'}
          </span>
          <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-slate-500 sm:inline">{phaseLabel}</span>
        </div>

        <div className="flex items-center gap-2 pr-0 lg:pr-[265px]">
          <button
            type="button"
            onClick={() => setLogOpen(value => !value)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition ${
              logOpen ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <ScrollText className="h-3.5 w-3.5" />
            战报
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        <aside className="flex w-[154px] shrink-0 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl sm:w-[210px] xl:w-[238px]">
          <div className="shrink-0 border-b border-white/10 px-2.5 py-2.5 sm:px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hand className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">作战手牌</span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400">{player.hand.length}/6</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px]">
              <span className="text-slate-600">可用金币</span>
              <span className="flex items-center gap-1 font-black text-amber-300">
                <Coins className="h-3 w-3" /> {player.gold}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-md border border-amber-400/10 bg-amber-400/5 px-2 py-1 text-[8px]">
              <span className="text-slate-600">本回合基础收入</span>
              <span className="font-black text-amber-300/80">+{player.maxGold}</span>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-1.5 py-2 sm:px-2">
            {player.hand.map((card, index) => {
              const cost = player.discountNext > 0 && card.type === '士兵' ? Math.max(0, card.cost - player.discountNext) : card.cost;
              return (
                <HandCard
                  key={`${card.id}-${index}`}
                  card={card}
                  cost={cost}
                  affordable={cost <= player.gold}
                  selected={game.selectedCardIdx === index}
                  disabled={isDisabled || gameState.currentPlayer !== 'player' || game.animating}
                  onClick={() => game.selectCard(index)}
                />
              );
            })}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black/20 p-2">
            <div className={`rounded-lg border p-2 ${selectedCard ? 'border-amber-400/25 bg-amber-400/10' : 'border-white/5 bg-white/[0.025]'}`}>
              <div className="flex items-start gap-2">
                {selectedCard ? <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> : <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />}
                <div className="min-w-0">
                  <div className={`truncate text-[10px] font-black ${selectedCard ? 'text-white' : 'text-slate-500'}`}>
                    {selectedCard ? selectedCard.name : '尚未选择手牌'}
                  </div>
                  <p className="mt-1 text-[8px] leading-3.5 text-slate-500">
                    {selectedCard ? '战场中的发光格位可作为目标' : '点击手牌查看可部署位置'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col">
          {isDisabled && (
            <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/30 pt-20">
              <div className="rounded-full border border-white/10 bg-black/70 px-5 py-2 text-xs font-black text-slate-300 backdrop-blur-xl">
                等待对手行动
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col px-2 py-1 sm:px-4">
            <CommanderStatus
              side="enemy"
              player={enemy}
              unitCount={enemyUnitCount}
              active={gameState.currentPlayer === 'enemy'}
            />

            <div className="relative mx-auto flex min-h-0 w-full max-w-[760px] flex-1 items-center py-1">
              <div className="w-full space-y-1 sm:space-y-1.5">
                {[0, 1, 2, 3].map(row => {
                  const isEnemy = row <= 1;
                  const isBack = row === 0 || row === 3;
                  const frontEmpty = isEnemy
                    ? !game.getEnemyFrontExists() && row === 1
                    : !game.getPlayerFrontExists() && row === 2;
                  const board = isEnemy ? enemy.board : player.board;
                  const rowLabels = ['敌方底线', '敌方前线', '我方前线', '我方底线'];

                  return (
                    <div key={row} className={`grid grid-cols-[48px_1fr] items-stretch gap-1.5 sm:grid-cols-[64px_1fr] sm:gap-2 ${row === 1 ? 'mb-1.5 sm:mb-2' : ''}`}>
                      <div className="flex flex-col items-center justify-center">
                        <span className={`text-center text-[8px] font-black leading-3 sm:text-[9px] ${isEnemy ? 'text-rose-400/80' : 'text-blue-400/80'}`}>
                          {rowLabels[row]}
                        </span>
                        {frontEmpty && <span className="mt-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-1.5 text-[7px] font-bold text-rose-300">距离跳过</span>}
                      </div>

                      <div className={`grid grid-cols-3 gap-1 rounded-xl border p-1 sm:gap-1.5 sm:p-1.5 ${
                        isEnemy ? 'border-rose-500/10 bg-rose-950/10' : 'border-blue-500/10 bg-blue-950/10'
                      }`}>
                        {[0, 1, 2].map(col => {
                          const key: BoardKey = `${row}-${col}`;
                          const isHQ = isBack && col === 1;
                          const unit = board[key];
                          const occupiedDeployCell = selectedCard?.type === '士兵' && Boolean(unit);
                          const highlighted = highlightCells.has(key) && !occupiedDeployCell;
                          const snipeTarget = snipeTargets.has(key);
                          const attacking = gameState.attackingUnit === key;
                          const defending = game.attackLine?.to === key;
                          const shaking = game.shakeCell === key;
                          const deployFlash = game.deployFlash?.key === key;

                          return (
                            <div
                              key={key}
                              data-testid={`cell-${key}`}
                              ref={element => setCellRef(key, element)}
                              onClick={() => !isDisabled && game.handleCellClick(row, col)}
                              className={`group relative min-h-[54px] overflow-hidden rounded-lg border transition-all duration-200 sm:min-h-[64px] lg:min-h-[76px] xl:min-h-[82px] ${
                                isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                              } ${
                                isHQ
                                  ? 'border-amber-400/25 bg-gradient-to-b from-purple-950/65 to-slate-950/80'
                                  : unit
                                    ? 'border-white/10 bg-slate-950/85'
                                    : 'border-dashed border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.035]'
                              } ${highlighted ? 'battle-cell-valid' : ''} ${snipeTarget ? 'battle-cell-snipe' : ''} ${
                                attacking ? 'attacking-now' : ''
                              } ${shaking ? 'shake-cell' : ''}`}
                            >
                              {attacking && <CellActionLabel tone="attack" text="正在攻击" />}
                              {defending && <CellActionLabel tone="defend" text="受到攻击" />}

                              {isHQ ? (
                                <HQCell
                                  hp={isEnemy ? enemy.hp : player.hp}
                                  maxHp={isEnemy ? enemy.maxHp : player.maxHp}
                                  armor={isEnemy ? enemy.hqArmor : player.hqArmor}
                                  bleed={isEnemy ? enemy.bleed : player.bleed}
                                  poison={isEnemy ? enemy.poison : player.poison}
                                  enemy={isEnemy}
                                />
                              ) : unit ? (
                                <UnitCell unit={unit} owner={isEnemy ? enemy : player} enemy={isEnemy ? player : enemy} />
                              ) : (
                                <EmptyCell
                                  col={col}
                                  enemy={isEnemy}
                                  highlighted={highlighted}
                                  snipeTarget={snipeTarget}
                                  frontEmpty={frontEmpty}
                                />
                              )}

                              {deployFlash && <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"><div className="deploy-flash-ring" /></div>}

                              {game.damagePopups.filter(popup => popup.key === key).map(popup => (
                                <div key={popup.id} className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                                  <span className="damage-float text-2xl font-black text-rose-400 drop-shadow-lg">-{popup.amount}</span>
                                </div>
                              ))}

                              {game.skillFloats.filter(float => float.key === key).map((float, index) => (
                                <div
                                  key={float.id}
                                  className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                                  style={{ marginTop: `${index * 18}px` }}
                                >
                                  <span className={`skill-float text-base font-black drop-shadow-lg ${float.color}`}>{float.text}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <CommanderStatus
              side="player"
              player={player}
              unitCount={playerUnitCount}
              active={gameState.currentPlayer === 'player'}
            />
          </div>

          <footer className="shrink-0 border-t border-white/10 bg-slate-950/90 px-2 py-1.5 backdrop-blur-xl sm:px-4">
            <div className="mx-auto flex max-w-5xl items-center gap-2">
              <div className={`hidden min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 sm:flex ${
                gameState.sniperMode ? 'border-purple-400/30 bg-purple-400/10' : selectedCard ? 'border-amber-400/25 bg-amber-400/10' : 'border-white/5 bg-white/[0.025]'
              }`}>
                {gameState.sniperMode ? <Crosshair className="h-4 w-4 shrink-0 text-purple-300" /> : selectedCard ? <Target className="h-4 w-4 shrink-0 text-amber-300" /> : <Flag className="h-4 w-4 shrink-0 text-slate-600" />}
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-black text-slate-200">{instruction}</div>
                  <div className="mt-0.5 text-[8px] text-slate-600">{phaseLabel} · 场上 {playerUnitCount} 个我方单位</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isDisabled) game.handleSurrender();
                }}
                disabled={isDisabled}
                className="battle-command-secondary"
              >
                认输
              </button>
              <button
                type="button"
                onClick={() => setLogOpen(value => !value)}
                className="battle-command-secondary sm:hidden"
                aria-label="打开战报"
              >
                <ScrollText className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canEndTurn) return;
                  game.handleEndTurn(() => undefined);
                }}
                disabled={!canEndTurn}
                className={`battle-command-primary ${canEndTurn ? '' : 'cursor-not-allowed opacity-40 grayscale'}`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-xs font-black sm:text-sm">
                    {gameState.sniperMode ? <Crosshair className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {gameState.sniperMode ? '选择狙击目标' : game.animating ? '战斗结算中' : '结束部署'}
                  </div>
                  <div className="mt-0.5 hidden text-[8px] font-bold text-amber-100/55 sm:block">
                    {gameState.sniperMode ? '点击敌方发光目标' : `命令 ${playerUnitCount} 个单位开始攻击`}
                  </div>
                </div>
              </button>
            </div>
          </footer>

          {logOpen && (
            <div className="absolute bottom-[72px] right-2 z-50 flex max-h-[55%] w-[min(92%,420px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:right-4">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                  <ScrollText className="h-3.5 w-3.5" /> 战斗战报
                </div>
                <button type="button" onClick={() => setLogOpen(false)} className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="关闭战报">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-3">
                {gameState.log.slice(-30).reverse().map(log => (
                  <div key={log.id} className={`rounded-md border border-white/5 bg-white/[0.025] px-2 py-1.5 text-[9px] leading-4 ${getLogColor(log.type)}`}>
                    {log.msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CommanderStatus({
  side,
  player,
  unitCount,
  active,
}: {
  side: 'player' | 'enemy';
  player: PlayerState;
  unitCount: number;
  active: boolean;
}) {
  const enemy = side === 'enemy';
  const hpPct = Math.max(0, player.hp / player.maxHp * 100);

  return (
    <div className={`mx-auto flex w-full max-w-[760px] shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1 sm:px-2.5 ${
      enemy ? 'border-rose-500/15 bg-rose-950/25' : 'border-blue-500/15 bg-blue-950/25'
    } ${active ? (enemy ? 'shadow-[0_0_20px_rgba(244,63,94,.08)]' : 'shadow-[0_0_20px_rgba(59,130,246,.1)]') : ''}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
        enemy ? 'border-rose-400/25 bg-rose-400/10 text-rose-300' : 'border-blue-400/25 bg-blue-400/10 text-blue-300'
      }`}>
        {enemy ? <Crown className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-[0.14em] ${enemy ? 'text-rose-300' : 'text-blue-300'}`}>
              {enemy ? '敌方指挥部' : '我方指挥部'}
            </span>
            {active && <span className={`h-1.5 w-1.5 rounded-full ${enemy ? 'bg-rose-400' : 'bg-blue-400'} animate-pulse`} />}
          </div>
          <span className="text-[8px] font-bold text-slate-600">{unitCount} 个单位</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full ${getHpColor(hpPct)}`} style={{ width: `${hpPct}%` }} />
          </div>
          <span className="w-10 text-right text-[10px] font-black text-white">{Math.max(0, player.hp)}/{player.maxHp}</span>
        </div>
      </div>
      <StatusChip icon={<Coins className="h-3 w-3" />} value={`${player.gold}`} tone="amber" />
      <StatusChip icon={<Hand className="h-3 w-3" />} value={`${player.hand.length}`} tone="purple" />
      <StatusChip icon={<Library className="h-3 w-3" />} value={`${player.deck.length}`} tone="slate" />
      {player.hqArmor > 0 && <StatusChip icon={<Shield className="h-3 w-3" />} value={`${player.hqArmor}`} tone="blue" />}
    </div>
  );
}

function StatusChip({ icon, value, tone }: { icon: React.ReactNode; value: string; tone: 'amber' | 'purple' | 'slate' | 'blue' }) {
  const styles = {
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    purple: 'border-purple-400/20 bg-purple-400/10 text-purple-300',
    slate: 'border-white/10 bg-white/5 text-slate-400',
    blue: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  };
  return <span className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[9px] font-black ${styles[tone]}`}>{icon}{value}</span>;
}

function CellActionLabel({ tone, text }: { tone: 'attack' | 'defend'; text: string }) {
  return (
    <div className={`absolute left-1/2 top-1 z-30 -translate-x-1/2 rounded-full border px-2 py-0.5 text-[7px] font-black ${
      tone === 'attack' ? 'border-amber-300/50 bg-amber-500/90 text-slate-950' : 'border-rose-300/50 bg-rose-600/90 text-white'
    }`}>
      {text}
    </div>
  );
}

function EmptyCell({
  col,
  enemy,
  highlighted,
  snipeTarget,
  frontEmpty,
}: {
  col: number;
  enemy: boolean;
  highlighted: boolean;
  snipeTarget: boolean;
  frontEmpty: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      {highlighted || snipeTarget ? (
        <>
          {snipeTarget ? <Crosshair className="h-5 w-5 animate-pulse text-purple-300" /> : <Zap className="h-5 w-5 animate-pulse text-amber-300" />}
          <span className={`text-[8px] font-black ${snipeTarget ? 'text-purple-200' : 'text-amber-200'}`}>
            {snipeTarget ? '可选择目标' : enemy ? '可选目标' : '点击部署'}
          </span>
        </>
      ) : (
        <>
          <span className={`h-1.5 w-1.5 rounded-full ${enemy ? 'bg-rose-400/20' : 'bg-blue-400/20'}`} />
          <span className="text-[8px] font-bold text-slate-700">{['左翼', '中路', '右翼'][col]}</span>
          {frontEmpty && <span className="text-[7px] text-rose-400/40">空线</span>}
        </>
      )}
    </div>
  );
}

function HQCell({ hp, maxHp, armor, bleed, poison, enemy }: { hp: number; maxHp: number; armor: number; bleed: number; poison: number; enemy: boolean }) {
  const pct = Math.max(0, hp / maxHp * 100);
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-2">
      <div className={`absolute inset-0 opacity-25 ${enemy ? 'bg-gradient-to-br from-rose-600 to-purple-900' : 'bg-gradient-to-br from-blue-600 to-purple-900'}`} />
      <div className={`relative flex h-8 w-8 items-center justify-center rounded-full border sm:h-10 sm:w-10 ${
        enemy ? 'border-rose-300/35 bg-rose-400/10 text-rose-200' : 'border-blue-300/35 bg-blue-400/10 text-blue-200'
      }`}>
        <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="relative mt-1 text-[9px] font-black text-white sm:text-[10px]">{enemy ? '敌方 HQ' : '我方 HQ'}</div>
      <div className="relative mt-1 flex items-center gap-1.5">
        <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-300"><Heart className="h-3 w-3" />{Math.max(0, hp)}</span>
        {armor > 0 && <span className="flex items-center gap-0.5 text-[9px] font-black text-blue-300"><Shield className="h-3 w-3" />{armor}</span>}
      </div>
      {(bleed > 0 || poison > 0) && (
        <div className="relative mt-1 flex gap-1">
          {bleed > 0 && <StatusBadge label={`流血${bleed}`} />}
          {poison > 0 && <StatusBadge label={`毒${poison}`} />}
        </div>
      )}
      <div className="relative mt-1 h-1 w-full max-w-24 overflow-hidden rounded-full bg-black/40">
        <div className={`h-full rounded-full ${getHpColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function UnitCell({ unit, owner, enemy }: { unit: Unit; owner: PlayerState; enemy: PlayerState }) {
  const quality = getQualityStyle(unit.quality);
  const hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
  const labels = parseSkillLabels(unit.skills as Skill[], unit.desc);
  const art = getFactionArt(unit.faction);
  const factionAccent = getFactionAccent(unit.faction);
  const hasDebuff = unit.bleed > 0 || unit.poison > 0 || unit.silenceTurns > 0 || unit.frozen || unit.frozenTurns > 0;

  let atkBonus = 0;
  for (const ally of Object.values(owner.board)) {
    if (ally.skills.includes('tacticCmd') && unit.subtype === '近战') {
      const match = ally.desc.match(/战术指挥(\d+)/);
      atkBonus += match ? Number.parseInt(match[1], 10) : 1;
    }
    if (ally.skills.includes('shootCmd') && unit.subtype === '弓箭') {
      const match = ally.desc.match(/射击指挥(\d+)/);
      atkBonus += match ? Number.parseInt(match[1], 10) : 1;
    }
  }
  for (const buff of unit.buffs) if (buff.type === 'atk') atkBonus += buff.value;
  if (unit.poison > 0) atkBonus = unit.buffs.filter(buff => buff.type === 'atk').reduce((sum, buff) => sum + buff.value, 0);

  let atkDebuff = 0;
  if (unit.subtype === '近战' || unit.subtype === '弓箭' || unit.subtype === '狙击') {
    for (const opposingUnit of Object.values(enemy.board)) {
      if (opposingUnit.skills.includes('intimidate')) {
        const match = opposingUnit.desc.match(/叱吓(\d+)/);
        atkDebuff += match ? Number.parseInt(match[1], 10) : 2;
      }
    }
  }

  const jammed = unit.subtype === '狙击' && Object.values(enemy.board).some(opposingUnit => opposingUnit.skills.includes('jamming'));

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-md border ${quality.border} ${unit.frozen ? 'opacity-50' : ''}`} style={{ boxShadow: `inset 0 0 0 1px ${factionAccent}33` }}>
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/55 to-slate-950/95" />
      <div className="absolute left-0 top-0 h-full w-0.5" style={{ background: factionAccent }} />

      <div className="relative flex h-full flex-col p-1.5">
        <div className="flex min-h-4 items-start justify-between gap-1">
          <div className="flex min-w-0 flex-wrap gap-0.5">
            {labels.slice(0, 2).map(label => (
              <span key={label} className={`rounded-sm border border-white/10 bg-black/60 px-1 py-0.5 text-[6px] font-black leading-none sm:text-[7px] ${
                unit.silenceTurns > 0 ? 'text-rose-300 line-through opacity-60' : 'text-amber-200'
              }`}>
                {label}
              </span>
            ))}
          </div>
          <span className={`shrink-0 text-[6px] font-black sm:text-[7px] ${quality.text}`}>{unit.quality}</span>
        </div>

        <div className="mt-auto">
          {jammed && <span className="mb-1 inline-flex rounded bg-rose-600/80 px-1 text-[6px] font-black text-white">干扰</span>}
          <div className={`truncate text-[9px] font-black text-white drop-shadow-lg sm:text-[11px]`}>{unit.name}</div>
          <div className="mt-0.5 text-[6px] font-bold uppercase tracking-wider text-slate-400 sm:text-[7px]">{unit.subtype} · {unit.faction.replace('军团', '').replace('学院', '')}</div>

          {hasDebuff && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {unit.bleed > 0 && <StatusBadge label={`流血${unit.bleed}`} />}
              {unit.poison > 0 && <StatusBadge label={`毒${unit.poison}`} />}
              {unit.silenceTurns > 0 && <StatusBadge label={`沉默${unit.silenceTurns}`} />}
              {(unit.frozen || unit.frozenTurns > 0) && <StatusBadge label={`冻结${Math.max(1, unit.frozenTurns)}`} />}
            </div>
          )}

          <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
            <div className={`h-full rounded-full ${getHpColor(hpPct)}`} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="mt-1 flex items-center gap-1">
            <StatBadge icon={<Swords className="h-2.5 w-2.5" />} value={`${unit.atk}${atkBonus ? `+${atkBonus}` : ''}${atkDebuff ? `-${atkDebuff}` : ''}`} tone="rose" />
            <StatBadge icon={<Heart className="h-2.5 w-2.5" />} value={`${unit.hp}`} tone="green" />
            {unit.armor > 0 && <StatBadge icon={<Shield className="h-2.5 w-2.5" />} value={`${unit.armor}`} tone="blue" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon, value, tone }: { icon: React.ReactNode; value: string; tone: 'rose' | 'green' | 'blue' }) {
  const style = {
    rose: 'bg-rose-500/20 text-rose-200',
    green: 'bg-emerald-500/20 text-emerald-200',
    blue: 'bg-blue-500/20 text-blue-200',
  };
  return <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[7px] font-black sm:text-[8px] ${style[tone]}`}>{icon}{value}</span>;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded border border-rose-400/35 bg-rose-950/75 px-1 py-0.5 text-[6px] font-black text-rose-300 shadow-[0_0_8px_rgba(244,63,94,.18)]">
      {label}
    </span>
  );
}

function HandCard({
  card,
  cost,
  affordable,
  selected,
  disabled,
  onClick,
}: {
  card: CardDef;
  cost: number;
  affordable: boolean;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const quality = getQualityStyle(card.quality);
  const labels = parseSkillLabels(card.skills, card.desc);
  const art = getFactionArt(card.faction);
  const accent = getFactionAccent(card.faction);
  const unavailable = !affordable || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[116px] w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-200 sm:min-h-[136px] ${
        selected ? 'translate-x-1 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,.28)]' : `${quality.border} hover:translate-x-0.5 hover:brightness-110`
      } ${unavailable ? 'opacity-45 grayscale' : ''}`}
    >
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-300 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-slate-950/45 to-slate-950/95" />
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      {selected && <div className="absolute inset-0 bg-amber-300/5" />}

      <div className="relative flex h-full min-h-[116px] flex-col p-2 sm:min-h-[136px]">
        <div className="flex items-start justify-between gap-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-300/40 bg-blue-600/90 text-[11px] font-black text-white shadow-lg">{cost}</span>
          <span className={`rounded-full border border-white/10 bg-black/60 px-1.5 py-0.5 text-[7px] font-black ${quality.text}`}>{card.quality}</span>
        </div>

        <div className="mt-auto">
          <div className="truncate text-[10px] font-black text-white drop-shadow-lg sm:text-xs">{card.name}</div>
          <div className="mt-0.5 text-[7px] font-bold text-slate-400 sm:text-[8px]">{card.subtype} · {card.type}</div>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {labels.slice(0, 3).map(label => (
              <span key={label} className="rounded border border-amber-400/15 bg-black/55 px-1 py-0.5 text-[6px] font-bold text-amber-200 sm:text-[7px]">{label}</span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            {card.type === '士兵' ? (
              <>
                <StatBadge icon={<Swords className="h-2.5 w-2.5" />} value={`${card.atk}`} tone="rose" />
                <StatBadge icon={<Heart className="h-2.5 w-2.5" />} value={`${card.hp}`} tone="green" />
                {card.armor > 0 && <StatBadge icon={<Shield className="h-2.5 w-2.5" />} value={`${card.armor}`} tone="blue" />}
              </>
            ) : (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[7px] font-black text-purple-200">法术效果</span>
            )}
          </div>
        </div>
      </div>

      {!affordable && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
          <span className="flex items-center gap-1 rounded-full border border-rose-400/30 bg-black/80 px-2 py-1 text-[7px] font-black text-rose-200">
            <AlertTriangle className="h-2.5 w-2.5" /> 金币不足
          </span>
        </div>
      )}
    </button>
  );
}

function getLogColor(type: string): string {
  switch (type) {
    case 'player': return 'text-blue-300';
    case 'enemy': return 'text-rose-300';
    case 'damage': return 'text-orange-300';
    case 'heal': return 'text-emerald-300';
    case 'gold': return 'text-amber-300';
    default: return 'text-slate-400';
  }
}
