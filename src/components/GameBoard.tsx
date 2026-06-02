import { useState, useRef, useCallback, useEffect } from 'react';
import type { BoardKey, Unit, Skill, PlayerState } from '@/types/game';
import type { useGame } from '@/hooks/useGame';
import { QUALITY_COLORS } from '@/data/cards';
import { parseSkillLabels } from '@/utils/skillLabels';
import RulePanel from './RulePanel';
import {
  Heart, Shield, Swords, Coins, Library,
  Crosshair, ChevronRight, ScrollText,
  Droplets, Skull, VolumeX,
} from 'lucide-react';

interface Props {
  game: ReturnType<typeof useGame>;
  multiplayer?: boolean;
  isMyTurn?: boolean;
}

function getHpColor(pct: number): string {
  if (pct > 60) return 'bg-emerald-500';
  if (pct > 30) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getQualityStyle(q: string) {
  return QUALITY_COLORS[q] || QUALITY_COLORS['铜'];
}

export default function GameBoard({ game, multiplayer, isMyTurn }: Props) {
  const { gameState } = game;
  const isDisabled = multiplayer && !isMyTurn;
  const [logOpen, setLogOpen] = useState(true);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [beamStyle, setBeamStyle] = useState<React.CSSProperties>({ display: 'none' });

  // 动态计算攻击连线坐标
  useEffect(() => {
    const line = game.attackLine;
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
    requestAnimationFrame(() => {
      const f = fromEl.getBoundingClientRect();
      const t = toEl.getBoundingClientRect();
      const sx = f.left + f.width / 2;
      const sy = f.top + f.height / 2;
      const ex = t.left + t.width / 2;
      const ey = t.top + t.height / 2;
      const len = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
      const ang = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
      setBeamStyle({
        position: 'fixed', left: sx, top: sy,
        width: len, height: 2.5,
        transform: `rotate(${ang}deg)`, transformOrigin: 'left center',
        background: 'linear-gradient(90deg, #ff3333 0%, #ff8800 60%, transparent 100%)',
        zIndex: 45, pointerEvents: 'none', opacity: 0.9,
        boxShadow: '0 0 6px rgba(255,50,50,0.6), 0 0 12px rgba(255,136,0,0.3)',
      });
    });
  }, [game.attackLine]);

  const setCellRef = useCallback((key: BoardKey, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  if (!gameState) return null;

  const p = gameState.player;
  const e = gameState.enemy;
  const highlightCells = game.getHighlightCells();
  const snipeTargets = game.getSnipeTargets();
  const playerHpPct = Math.max(0, p.hp / p.maxHp * 100);
  const enemyHpPct = Math.max(0, e.hp / e.maxHp * 100);

  const attackerKey = gameState.attackingUnit;
  const defenderKey = game.attackLine?.to || null;

  return (
    <div className="relative w-full overflow-hidden flex select-none bg-[#0B0D14]" style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}>
      {/* 背景 */}
      <div className="absolute inset-0 bg-cover bg-center z-0 opacity-35" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />

      {/* 攻击光束 */}
      {game.attackLine && beamStyle.display !== 'none' && <div style={beamStyle} />}

      {/* 回合提示 */}
      {gameState.showTurnBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="turn-banner text-5xl font-bold text-yellow-400 tracking-wider"
            style={{ fontFamily: "'Cinzel', serif", textShadow: '0 0 40px rgba(234,179,8,0.6)' }}>
            第 {gameState.showTurnBanner} 回合
          </div>
        </div>
      )}

      {/* 狙击横幅 */}
      {gameState.showSnipeBanner && (
        <div className="fixed top-[6%] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="snipe-banner">
            <Crosshair className="w-4 h-4 inline mr-1.5" />
            {gameState.sniperQueue.length}个狙击单位，请点击敌方目标
          </div>
        </div>
      )}

      {/* AI部署提示 */}
      {game.aiDeploying && (
        <div className="fixed top-[6%] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="px-5 py-2 bg-black/70 border border-blue-500/40 rounded-lg text-blue-400 text-sm font-bold animate-pulse">
            🤖 AI正在部署...
          </div>
        </div>
      )}

      <RulePanel />

      {/* ====== 左侧手牌区 ====== */}
      <div className="relative z-10 w-[110px] sm:w-[148px] shrink-0 flex flex-col border-r border-gray-800/50 bg-black/40">
        {/* 手牌标题 */}
        <div className="px-2 py-1 border-b border-gray-800/50 flex items-center justify-between">
          <span className="text-[11px] text-gray-300 font-bold">🎴 手牌 {p.hand.length}/6</span>
          {p.discountNext > 0 && <span className="text-[9px] text-yellow-400 font-bold">-{p.discountNext}费</span>}
        </div>
        {/* 手牌列表（竖向可滚动） */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-1.5 py-1 space-y-1.5">
          {p.hand.map((card, i) => {
            const qStyle = getQualityStyle(card.quality);
            const cost = p.discountNext > 0 && card.type === '士兵' ? Math.max(0, card.cost - p.discountNext) : card.cost;
            const affordable = cost <= p.gold;
            const isSelected = game.selectedCardIdx === i;
            return (
              <HandCardLarge
                key={i}
                card={card}
                cost={cost}
                affordable={affordable}
                isSelected={isSelected}
                qStyle={qStyle}
                onClick={() => game.selectCard(i)}
              />
            );
          })}
        </div>
        {gameState.sniperMode && (
          <div className="px-2 py-1 bg-purple-900/40 border-t border-purple-700/30 text-center">
            <span className="text-[9px] text-purple-300 animate-pulse flex items-center justify-center gap-1">
              <Crosshair className="w-3 h-3" />选择狙击目标
            </span>
          </div>
        )}
      </div>

      {/* ====== 右侧主区域 ====== */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* 联机模式：对方回合遮罩 */}
        {isDisabled && (
          <div className="absolute inset-0 z-50 bg-black/20 pointer-events-none flex items-start justify-center pt-16">
            <div className="px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-gray-400 text-sm font-bold animate-pulse">
              🤖 对手回合中...
            </div>
          </div>
        )}
        {/* 顶部：标题+敌方状态 */}
        <div className="flex items-center justify-between px-1.5 sm:px-2 shrink-0 h-5 sm:h-6">
          <span className="text-[9px] sm:text-[10px] font-bold text-yellow-500/80 shrink-0" style={{ fontFamily: "'Cinzel', serif" }}>
            将领：征服<span className="text-[7px] sm:text-[8px] text-gray-500 ml-1">第{gameState.turn}回合</span>
          </span>
          {/* 敌方状态 - 醒目显示在右上角 */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-red-950/40 px-1.5 sm:px-2 py-px rounded border border-red-800/30">
            <span className="text-[9px] sm:text-[10px] text-red-400 font-bold">🤖 AI</span>
            {/* HP */}
            <div className="flex items-center gap-0.5">
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <div className="w-10 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${getHpColor(enemyHpPct)}`} style={{ width: `${enemyHpPct}%` }} />
              </div>
              <span className="text-[9px] text-gray-200 font-bold">{Math.max(0, e.hp)}</span>
            </div>
            {e.hqArmor > 0 && <span className="text-[8px] text-blue-400"><Shield className="w-2.5 h-2.5 inline" />{e.hqArmor}</span>}
            {/* 金币 - 黄色高亮 */}
            <div className="flex items-center gap-0.5 px-1.5 py-px bg-yellow-900/50 rounded border border-yellow-600/30">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-300 font-bold">{e.gold}</span>
            </div>
            {/* 牌库 */}
            <div className="flex items-center gap-0.5">
              <Library className="w-2.5 h-2.5 text-gray-500" />
              <span className="text-[8px] text-gray-400">{e.deck.length}</span>
            </div>
          </div>
        </div>

        {/* 战场 */}
        <div className="relative flex-1 flex flex-col justify-center max-w-lg mx-auto w-full min-h-0 px-1">
          {/* 敌方状态条 - 显示在敌方HQ上方 */}
          <div className="flex justify-end items-center gap-1 mb-0.5 px-0">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-red-950/50 px-2 sm:px-3 py-0.5 rounded border border-red-700/40">
              <span className="text-[9px] sm:text-[10px] text-red-400 font-bold">🤖 敌方</span>
              <div className="flex items-center gap-0.5">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <div className="w-12 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${getHpColor(enemyHpPct)}`} style={{ width: `${enemyHpPct}%` }} />
                </div>
                <span className="text-[10px] text-gray-200 font-bold">{Math.max(0, e.hp)}</span>
              </div>
              {e.hqArmor > 0 && (
                <span className="text-[9px] text-blue-400 flex items-center gap-px">
                  <Shield className="w-3 h-3 inline" />{e.hqArmor}
                </span>
              )}
              <div className="flex items-center gap-0.5 px-1.5 py-px bg-yellow-900/60 rounded border border-yellow-500/30">
                <Coins className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-300 font-bold">{e.gold}</span>
              </div>
              {/* 敌方手牌 */}
              <div className="flex items-center gap-0.5 px-1.5 py-px bg-purple-900/40 rounded border border-purple-600/30">
                <span className="text-[10px]">🎴</span>
                <span className="text-[10px] text-purple-300 font-bold">{e.hand.length}</span>
              </div>
            </div>
          </div>

          {[0, 1, 2, 3].map(row => {
            const isEnemy = row <= 1;
            const isBack = row === 0 || row === 3;
            const frontEmpty = isEnemy
              ? !game.getEnemyFrontExists() && row === 1
              : !game.getPlayerFrontExists() && row === 2;
            const board = isEnemy ? e.board : p.board;
            const labels = ['敌HQ', '敌前线', '我前线', '我HQ'];

            return (
              <div key={row} className="flex items-stretch gap-0.5 py-px">
                <div className="w-5 sm:w-6 flex flex-col items-center justify-center shrink-0">
                  <span className={`text-[7px] sm:text-[8px] font-bold text-center leading-none ${isEnemy ? 'text-red-400' : 'text-blue-400'}`}>
                    {labels[row]}
                  </span>
                  {frontEmpty && <span className="text-[7px] text-red-500 animate-pulse leading-none">空</span>}
                  {!isEnemy && row === 2 && gameState.sniperMode && (
                    <Crosshair className="w-3 h-3 text-purple-400 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 grid grid-cols-3 gap-0.5">
                  {[0, 1, 2].map(col => {
                    const key: BoardKey = `${row}-${col}`;
                    const isHQ = isBack && col === 1;
                    const unit = board[key];
                    const isHighlighted = highlightCells.has(key);
                    const isSnipeTarget = snipeTargets.has(key);
                    const isAttacking = attackerKey === key;
                    const isDefending = defenderKey === key;
                    const isShaking = game.shakeCell === key;
                    const hasDeployFlash = game.deployFlash?.key === key;

                    return (
                      <div
                        key={key}
                        ref={el => setCellRef(key, el)}
                        onClick={() => !isDisabled && game.handleCellClick(row, col)}
                        className={`
                          relative rounded border overflow-hidden
                          flex items-center justify-center
                          transition-all duration-150
                          min-h-[40px] sm:min-h-[44px]
                          ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                          ${isHQ
                            ? 'border-yellow-600/40 bg-gradient-to-b from-purple-900/30 to-purple-950/50'
                            : unit
                              ? 'border-gray-600/30 bg-gray-900/60'
                              : 'border-gray-700/20 bg-gray-950/20 hover:border-gray-500/30'
                          }
                          ${isHighlighted ? 'ring-1 ring-yellow-400/70' : ''}
                          ${isSnipeTarget ? 'ring-1 ring-purple-400/70 animate-pulse' : ''}
                          ${isAttacking ? 'attacking-now' : ''}
                          ${isShaking ? 'shake-cell' : ''}
                          ${frontEmpty && !isBack && !isHQ ? 'border-dashed border-red-800/20' : ''}
                        `}
                        style={{ aspectRatio: '4/3' }}
                      >
                        {isAttacking && (
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-30 px-1 py-px bg-red-600 rounded-sm text-[7px] text-white font-bold whitespace-nowrap shadow-lg animate-pulse">
                            ⚔️攻击中
                          </div>
                        )}
                        {isDefending && (
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-30 px-1 py-px bg-orange-600 rounded-sm text-[7px] text-white font-bold whitespace-nowrap shadow-lg animate-pulse">
                            🎯被攻击
                          </div>
                        )}

                        {isHQ ? (
                          <HQCell hp={isEnemy ? e.hp : p.hp} maxHp={isEnemy ? e.maxHp : p.maxHp} armor={isEnemy ? e.hqArmor : p.hqArmor} isEnemy={isEnemy} />
                        ) : unit ? (
                          <UnitCell unit={unit} owner={isEnemy ? e : p} enemy={isEnemy ? p : e} />
                        ) : (
                          <span className="text-gray-700 text-[9px]">{['左', '中', '右'][col]}</span>
                        )}

                        {hasDeployFlash && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="deploy-flash-ring" />
                          </div>
                        )}

                        {game.damagePopups
                          .filter(dp => dp.key === key)
                          .map(dp => (
                            <div key={dp.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                              <span className="damage-float text-red-500 font-black text-lg drop-shadow-lg"
                                style={{ textShadow: '0 0 6px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)' }}>
                                -{dp.amount}
                              </span>
                            </div>
                          ))}

                        {game.skillFloats
                          .filter(sf => sf.key === key)
                          .map(sf => (
                            <div key={sf.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                              <span className={`skill-float ${sf.color} font-black text-sm drop-shadow-lg`}
                                style={{ textShadow: '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)' }}>
                                {sf.text}
                              </span>
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

        {/* 我方状态 */}
        <div className="flex items-center gap-1.5 sm:gap-3 px-1.5 sm:px-2 py-0.5 bg-blue-950/30 rounded border border-blue-900/20 shrink-0 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] text-blue-400 font-bold">😎 玩家</span>
          <div className="flex items-center gap-0.5">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <div className="w-12 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${getHpColor(playerHpPct)}`} style={{ width: `${playerHpPct}%` }} />
            </div>
            <span className="text-[9px] text-gray-200 font-bold">{Math.max(0, p.hp)}</span>
          </div>
          {p.hqArmor > 0 && <span className="text-[8px] text-blue-400"><Shield className="w-2.5 h-2.5 inline" />{p.hqArmor}</span>}
          {/* 金币放在HP旁边 */}
          <div className="flex items-center gap-0.5 px-1.5 py-px bg-yellow-900/30 rounded border border-yellow-700/20">
            <Coins className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-bold">{p.gold}</span>
            <span className="text-[8px] text-yellow-600">/{p.maxGold}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Library className="w-2.5 h-2.5 text-gray-500" />
            <span className="text-[8px] text-gray-400">{p.deck.length}</span>
          </div>
          <div className="flex-1" />
          <span className="text-[9px] text-gray-500">💡 选中手牌后点击战场格子部署</span>
        </div>

        {/* 按钮 */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-0.5 shrink-0">
          <button onClick={() => {
              // P0: 确认后才发送 surrender；非自己回合禁止操作
              if (isDisabled) return;
              const confirmed = game.handleSurrender();
              if (confirmed) { /* 本地逻辑已处理 */ }
            }}
            disabled={isDisabled}
            className={`px-2 sm:px-3 py-0.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-400 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
            🏳️认输
          </button>
          <button onClick={() => {
              // P0: 狙击模式下禁止结束回合；非自己回合禁止
              if (gameState.sniperMode || isDisabled) return;
              // P0: 攻击完成后再发 end_turn，避免竞态
              game.handleEndTurn(() => {
                /* end_turn 回调 */
              });
            }}
            disabled={isDisabled || gameState.currentPlayer !== 'player' || gameState.sniperMode || game.animating}
            className={`px-3 sm:px-5 py-0.5 rounded text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer
              ${!isDisabled && gameState.currentPlayer === 'player' && !gameState.sniperMode && !game.animating
                ? 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'}`}>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {gameState.sniperMode ? '选择目标' : game.animating ? (multiplayer ? '战斗中...' : 'AI中...') : '结束回合'}
          </button>
          <button onClick={() => setLogOpen(!logOpen)}
            className="px-1.5 sm:px-2 py-0.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-400 text-[10px] sm:text-xs font-bold cursor-pointer flex items-center gap-1">
            <ScrollText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />日志
          </button>
        </div>

        {/* 日志 */}
        {logOpen && (
          <div className="h-10 sm:h-14 bg-black/70 border-t border-yellow-900/20 overflow-hidden shrink-0">
            <div className="h-full overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
              {gameState.log.slice(-15).map(log => (
                <div key={log.id} className={`text-[9px] leading-tight ${getLogColor(log.type)}`}>• {log.msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== 子组件 ==================== */

function HQCell({ hp, maxHp, armor, isEnemy }: { hp: number; maxHp: number; armor: number; isEnemy: boolean }) {
  const pct = Math.max(0, hp / maxHp * 100);
  return (
    <div className="flex flex-col items-center gap-px w-full px-1">
      <span className={`text-[9px] font-bold ${isEnemy ? 'text-red-300' : 'text-blue-300'}`} style={{ fontFamily: "'Cinzel', serif" }}>
        🏛️{isEnemy ? '敌' : '我'}HQ
      </span>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <div className={`h-full ${getHpColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-gray-200 font-bold">{Math.max(0, hp)}</span>
        {armor > 0 && <span className="text-[8px] text-blue-400"><Shield className="w-2.5 h-2.5 inline" />{armor}</span>}
      </div>
    </div>
  );
}

function UnitCell({ unit, owner, enemy }: { unit: Unit; owner: PlayerState; enemy: PlayerState }) {
  const qStyle = getQualityStyle(unit.quality);
  const hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
  const skillLabels = parseSkillLabels(unit.skills as Skill[], unit.desc);

  // 计算debuff
  const hasDebuff = unit.bleed > 0 || unit.poison > 0 || unit.silenceTurns > 0;

  // 计算光环加成（战术指挥/射击指挥）
  const unitSubtype = unit.subtype as string;
  let atkBonus = 0;
  for (const u of Object.values(owner.board)) {
    if (u.skills.includes('tacticCmd') && unitSubtype === '近战') {
      const m = u.desc.match(/战术指挥(\d+)/);
      atkBonus += m ? parseInt(m[1], 10) : 1;
    }
    if (u.skills.includes('shootCmd') && unitSubtype === '弓箭') {
      const m = u.desc.match(/射击指挥(\d+)/);
      atkBonus += m ? parseInt(m[1], 10) : 1;
    }
  }
  // 增益buff（魔力增幅等）
  for (const buff of unit.buffs) {
    if (buff.type === 'atk') atkBonus += buff.value;
  }
  // 中毒时战术指挥/射击指挥失效，但buff加成仍有效
  if (unit.poison > 0) {
    atkBonus = 0;
    for (const buff of unit.buffs) {
      if (buff.type === 'atk') atkBonus += buff.value;
    }
  }

  // 计算叱吓减攻（敌方叱吓降低我方物理单位攻击力）
  let atkDebuff = 0;
  if (unitSubtype === '近战' || unitSubtype === '弓箭' || unitSubtype === '狙击') {
    for (const u of Object.values(enemy.board)) {
      if (u.skills.includes('intimidate')) {
        const m = u.desc.match(/叱吓(\d+)/);
        atkDebuff += m ? parseInt(m[1], 10) : 2;
      }
    }
  }

  // 敌方是否有干扰（只影响狙击单位）
  const isSniper = unit.subtype === '狙击';
  const hasEnemyJamming = isSniper && Object.values(enemy.board).some(u => u.skills.includes('jamming'));

  // 构建攻击力显示文本
  const atkParts: string[] = [];
  if (atkBonus > 0) atkParts.push(`+${atkBonus}`);
  if (atkDebuff > 0) atkParts.push(`-${atkDebuff}`);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-between py-px px-0.5 rounded-sm ${qStyle.bg} border ${qStyle.border} ${unit.frozen ? 'opacity-50' : ''}`}>
      {/* 干扰图标：敌方有干扰且本单位是狙击时显示 */}
      {hasEnemyJamming && (
        <div className="absolute -top-1.5 -left-1.5 z-20 px-1 py-px bg-red-700 rounded-[2px] flex items-center justify-center text-[7px] font-bold text-red-200 shadow border border-red-500 whitespace-nowrap leading-none">
          干扰中
        </div>
      )}
      {skillLabels.length > 0 && (
        <div className="absolute top-0 left-0 right-0 flex gap-0.5 justify-center flex-wrap px-0.5 z-10">
          {skillLabels.map((label, i) => (
            <span key={i} className={`relative px-0.5 rounded-[1px] text-[7px] leading-none whitespace-nowrap font-bold overflow-hidden ${unit.silenceTurns > 0 ? 'bg-red-900/60 text-red-300/50' : 'bg-black/60 text-yellow-300'}`}>
              {unit.silenceTurns > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-red-500 font-black z-10">❌</span>
              )}
              <span className={unit.silenceTurns > 0 ? 'line-through opacity-40' : ''}>{label}</span>
            </span>
          ))}
        </div>
      )}
      {/* 右上角品质标识 */}
      <div className={`absolute top-0 right-0 text-[6px] px-px ${qStyle.text} font-bold opacity-70`}>{unit.quality}</div>

      <div className="mt-2.5 text-center w-full">
        <div className={`text-[9px] font-bold leading-tight ${qStyle.text} truncate`}>{unit.name}</div>
        <div className="text-[7px] text-gray-400">{unit.subtype}</div>
      </div>

      {/* Debuff显示条 */}
      {hasDebuff && (
        <div className="w-full flex gap-px justify-center mb-px">
          {unit.bleed > 0 && (
            <span className="flex items-center gap-px px-1 bg-red-900/80 rounded-[2px] text-[8px] text-red-300 leading-none font-bold border border-red-700/60">
              <Droplets className="w-2 h-2" />{unit.bleed}
            </span>
          )}
          {unit.poison > 0 && (
            <span className="flex items-center gap-px px-1 bg-green-900/80 rounded-[2px] text-[8px] text-green-300 leading-none font-bold border border-green-700/60">
              <Skull className="w-2 h-2" />{unit.poison}
            </span>
          )}
          {unit.silenceTurns > 0 && (
            <span className="flex items-center gap-px px-1 bg-gray-700/90 rounded-[2px] text-[8px] text-gray-300 leading-none font-bold border border-gray-500/60">
              <VolumeX className="w-2 h-2 text-red-400" />{unit.silenceTurns}
            </span>
          )}
        </div>
      )}

      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${getHpColor(hpPct)}`} style={{ width: `${hpPct}%` }} />
      </div>
      <div className="flex items-center gap-1">
        {atkParts.length > 0 ? (
          <span className="flex items-center gap-px text-[9px] font-bold text-red-400">
            <Swords className="w-2.5 h-2.5" />{unit.atk}
            <span className="text-[7px]">
              ({atkParts.join(' ')})
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-px text-[9px] font-bold text-red-400"><Swords className="w-2.5 h-2.5" />{unit.atk}</span>
        )}
        <span className="flex items-center gap-px text-[9px] font-bold text-emerald-400"><Heart className="w-2.5 h-2.5" />{unit.hp}</span>
        {unit.armor > 0 && <span className="flex items-center gap-px text-[9px] font-bold text-blue-400"><Shield className="w-2.5 h-2.5" />{unit.armor}</span>}
      </div>
    </div>
  );
}

/* ======== 大手牌卡片（左侧竖排） ======== */
function HandCardLarge({
  card,
  cost,
  affordable,
  isSelected,
  qStyle,
  onClick,
}: {
  card: { name: string; cost: number; quality: string; type: string; subtype: string; atk: number; hp: number; desc: string; skills: string[] };
  cost: number; affordable: boolean; isSelected: boolean;
  qStyle: { bg: string; border: string; text: string; glow: string };
  onClick: () => void;
}) {
  // 解析技能标签
  const skillLabels = parseSkillLabels(card.skills as Skill[], card.desc);

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full rounded-lg border-2 transition-all duration-150 cursor-pointer
        flex flex-col items-center overflow-hidden
        ${qStyle.bg} ${qStyle.border}
        ${isSelected ? 'scale-[1.02] shadow-lg shadow-yellow-500/25 border-yellow-400 z-10' : 'hover:brightness-110'}
        ${!affordable ? 'opacity-45 grayscale' : ''}
      `}
      style={{ minHeight: '108px' }}
    >
      {/* 费用圆圈 */}
      <div className="absolute top-1 left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow">
        {cost}
      </div>
      {/* 品质星星 */}
      <div className="absolute top-1 right-1 text-[8px] text-yellow-400">
        {card.quality === '铜' ? '★' : card.quality === '银' ? '★★' : card.quality === '金' ? '★★★' : '★★★★'}
      </div>

      {/* 卡牌名称 */}
      <div className="mt-5 text-center w-full px-1">
        <div className={`text-[11px] font-bold leading-tight ${qStyle.text} truncate`}>{card.name}</div>
        <div className="text-[8px] text-gray-400">{card.subtype} {card.type}</div>
      </div>

      {/* 技能标签 */}
      {skillLabels.length > 0 && (
        <div className="flex gap-0.5 justify-center flex-wrap px-1 mt-0.5">
          {skillLabels.map((label, i) => (
            <span key={i} className="px-1 bg-black/50 rounded text-[8px] text-yellow-300 font-bold whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* 描述 */}
      <div className="text-[8px] text-gray-400 text-center px-1 mt-0.5 line-clamp-2 leading-tight flex-1 flex items-center justify-center">
        {card.desc}
      </div>

      {/* 攻防数值 */}
      {card.type === '士兵' && (
        <div className="flex items-center gap-2 mt-0.5 mb-1">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400"><Swords className="w-3 h-3" />{card.atk}</span>
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400"><Heart className="w-3 h-3" />{card.hp}</span>
        </div>
      )}
    </button>
  );
}

function getLogColor(type: string): string {
  switch (type) {
    case 'player': return 'text-blue-300';
    case 'enemy': return 'text-red-300';
    case 'damage': return 'text-orange-400';
    case 'heal': return 'text-emerald-400';
    case 'gold': return 'text-yellow-400';
    default: return 'text-gray-400';
  }
}
