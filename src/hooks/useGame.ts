import { useState, useCallback, useRef } from 'react';
import { SKILL_LABELS } from '@/types/game';
import type { GameState, Faction, BoardKey, AttackLine, CardDef, Skill, LogEntry } from '@/types/game';
import {
  createGame,
  deployUnit,
  castSpell,
  endTurn,
  resolveSniper,
  getTargetsInRange,
  isRowEmpty,
  getAttackOrder,
  executeSingleAttack,
  clearAttackingUnit,
  pickAutoTarget,
  doAITurnDeploy,
  doAITurnResource,
  advanceToPlayerTurn,
  moveAgileUnit,
  mirrorEnemyDeploy,
  mirrorEnemySpell,
  combatPhaseStart,
} from '@/engine/gameEngine';

// 飘字条目
interface FloatText {
  id: number;
  key: BoardKey;
  text: string;
  color: string; // tailwind text color class
}

interface SkillTriggerRule {
  skill: Skill;
  pattern: RegExp;
}

const SKILL_TRIGGER_RULES: SkillTriggerRule[] = [
  { skill: 'refreshBoost', pattern: /刷新增幅/ },
  { skill: 'cleanseSilence', pattern: /净化沉默/ },
  { skill: 'aoeHeal', pattern: /群体治疗\d+/ },
  { skill: 'healHQ', pattern: /(?:总部|敌方HQ)(?:恢复|回复)\d+点生命/ },
  { skill: 'flashStrike', pattern: /\s闪击！/ },
  { skill: 'magicSwap', pattern: /(?:魔术：|疾风步：|：交换了|交换位置)/ },
  { skill: 'bleed', pattern: /(?:流血\+\d+|附加流血\+\d+|流血\s+\d+点伤害)/ },
  { skill: 'poison', pattern: /(?:中毒\+\d+|附加中毒\+\d+)/ },
  { skill: 'poisonBurst', pattern: /毒爆！/ },
  { skill: 'tear', pattern: /撕裂！/ },
  { skill: 'growth', pattern: /生长\d+/ },
  { skill: 'balance', pattern: /均衡\d+/ },
  { skill: 'magicBoost', pattern: /法力增幅(?:\d+|：|再)/ },
  { skill: 'silence', pattern: /沉默\d+：/ },
  { skill: 'holyLight', pattern: /圣光：/ },
  { skill: 'riddleRealm', pattern: /谜境激活/ },
  { skill: 'lifesteal', pattern: /吸血：恢复/ },
  { skill: 'dodge', pattern: /闪避了攻击/ },
  { skill: 'fly', pattern: /飞翔闪避/ },
  { skill: 'spellReflect', pattern: /反弹法术/ },
  { skill: 'piercePlus', pattern: /强化贯穿：/ },
  { skill: 'ambush', pattern: /\s伏击\s.+\s\d+点/ },
  { skill: 'counter', pattern: /\s反击\s.+\s\d+点/ },
  { skill: 'extract', pattern: /萃取\s+\+\d+金币/ },
  { skill: 'bounty', pattern: /悬赏：/ },
  { skill: 'revenge', pattern: /复仇攻击/ },
  { skill: 'jamming', pattern: /干扰生效/ },
  { skill: 'agile', pattern: /疾行移动/ },
  { skill: 'interest', pattern: /\s利息\s+\+\d+金币/ },
  { skill: 'heal', pattern: /(?:^|\s)治疗\d+\s*→/ },
  { skill: 'armor', pattern: /获得\d+点护甲/ },
  { skill: 'shield', pattern: /护盾术\s*→/ },
  { skill: 'focusFire', pattern: /集火目标已标记/ },
  { skill: 'immune', pattern: /免疫(?:法术|末日审判)/ },
  { skill: 'destroy', pattern: /末日审判\s*→.+被消灭/ },
  { skill: 'drawCard', pattern: /：抽取?\d+张/ },
  { skill: 'discard', pattern: /：(?:对手|我方)弃掉/ },
  { skill: 'fog', pattern: /迷雾：/ },
];

const SKILL_VALUE_PATTERNS: Partial<Record<Skill, RegExp[]>> = {
  bleed: [/流血\+(\d+)/, /附加流血\+(\d+)/, /流血\s+(\d+)点伤害/],
  poison: [/中毒\+(\d+)/, /附加中毒\+(\d+)/],
  ambush: [/伏击.*?(\d+)点/],
  growth: [/生长(\d+)/],
  balance: [/均衡(\d+)/],
  magicBoost: [/法力增幅(\d+)/, /法力增幅.*?\+(\d+)攻/],
  silence: [/沉默(\d+)/],
  interest: [/利息\s+\+(\d+)金币/],
  heal: [/治疗(\d+)/],
  aoeHeal: [/群体治疗(\d+)/],
  armor: [/获得(\d+)点护甲/],
  shield: [/\+(\d+)护甲/],
  drawCard: [/抽取?(\d+)张/],
  healHQ: [/(?:总部|敌方HQ)(?:恢复|回复)(\d+)点生命/],
  extract: [/萃取\s+\+(\d+)金币/],
};

const SKILL_FLOAT_COLORS: Partial<Record<Skill, string>> = {
  flashStrike: 'text-yellow-300',
  bleed: 'text-red-500',
  tear: 'text-red-400',
  poison: 'text-emerald-400',
  poisonBurst: 'text-green-400',
  heal: 'text-green-400',
  aoeHeal: 'text-green-400',
  shield: 'text-blue-400',
  armor: 'text-blue-400',
  magicBoost: 'text-purple-300',
  destroy: 'text-red-500',
  silence: 'text-slate-300',
  fog: 'text-slate-300',
  dodge: 'text-cyan-300',
  fly: 'text-cyan-300',
  counter: 'text-orange-400',
  ambush: 'text-yellow-400',
};

function getSkillFloatColor(skill: Skill): string {
  return SKILL_FLOAT_COLORS[skill] ?? 'text-amber-300';
}

function getSkillFloatText(skill: Skill, msg: string): string {
  const value = SKILL_VALUE_PATTERNS[skill]
    ?.map(pattern => msg.match(pattern)?.[1])
    .find(Boolean);
  return `${SKILL_LABELS[skill] ?? skill}${value ?? ''}`;
}

function hasVisibleSkill(skills: Skill[]): boolean {
  return skills.some(skill => Boolean(SKILL_LABELS[skill]));
}

function hasTriggeredSkill(logs: LogEntry[]): boolean {
  return logs.some(log => SKILL_TRIGGER_RULES.some(rule => rule.pattern.test(log.msg)));
}

function findTriggerUnitKeysByName(state: GameState, msg: string): BoardKey[] {
  const matches: { key: BoardKey; index: number }[] = [];
  for (const [key, unit] of Object.entries(state.enemy.board)) {
    const index = msg.indexOf(unit.name);
    if (index >= 0) matches.push({ key, index });
  }
  for (const [key, unit] of Object.entries(state.player.board)) {
    const index = msg.indexOf(unit.name);
    if (index >= 0) matches.push({ key, index });
  }
  if (matches.length === 0) return [];
  const firstIndex = Math.min(...matches.map(match => match.index));
  const firstMatches = matches.filter(match => match.index === firstIndex);
  return firstMatches.length === 1 ? [firstMatches[0].key] : [];
}

function findUniqueUnitKeyByExactName(state: GameState, name: string): BoardKey[] {
  const matches = [
    ...Object.entries(state.enemy.board),
    ...Object.entries(state.player.board),
  ].filter(([, unit]) => unit.name === name);
  return matches.length === 1 ? [matches[0][0]] : [];
}

function getExplicitSourceName(skill: Skill, msg: string): string | null {
  const patterns: Partial<Record<Skill, RegExp>> = {
    flashStrike: /⚡\s(.+?)\s闪击！/,
    ambush: /⚡\s(.+?)\s伏击\s/,
    counter: /🔄\s(.+?)\s反击\s/,
    revenge: /😠\s(.+?)\s复仇攻击/,
    interest: /💰\s(.+?)\s利息\s/,
    agile: /🏃\s(.+?)\s疾行移动/,
    magicBoost: /✨\s(.+?)\s法力增幅/,
    armor: /🛡️\s(.+?)\s获得\d+点护甲/,
    drawCard: /📥\s(.+?)：抽取\d+张/,
    silence: /🔇\s(.+?)\s沉默\d+：/,
    holyLight: /✨\s(.+?)\s圣光：/,
    riddleRealm: /🔮\s(.+?)\s谜境激活/,
    magicSwap: /🪄\s(.+?)：/,
    lifesteal: /💚\s(.+?)\s吸血：/,
    extract: /💰\s(.+?)\s萃取\s/,
    heal: /💚\s(.+?)\s治疗\d+\s*→/,
    bleed: /🩸\s(.+?)\s对(?:总部|\s.+?\s)附加流血\+\d+/,
    poison: /☠️\s(.+?)\s对(?:总部|\s.+?\s)附加中毒\+\d+/,
    tear: /🔪\s(.+?)\s撕裂！/,
    poisonBurst: /💣\s(.+?)\s毒爆！/,
    piercePlus: /💥\s(.+?)\s强化贯穿：/,
  };
  return msg.match(patterns[skill] ?? /$a/)?.[1] ?? null;
}

function getSideHqKey(log: LogEntry): BoardKey | null {
  if (log.type === 'player') return '3-1';
  if (log.type === 'enemy') return '0-1';
  return null;
}

function getExplicitHqKey(log: LogEntry): BoardKey | null {
  return /(?:HQ|总部)/.test(log.msg) ? getSideHqKey(log) : null;
}

function isSourceOnlyTrigger(skill: Skill): boolean {
  return skill === 'lifesteal'
    || skill === 'piercePlus'
    || skill === 'extract'
    || skill === 'tear'
    || skill === 'poisonBurst';
}

function isSideScopedTrigger(skill: Skill): boolean {
  return skill === 'balance'
    || skill === 'silence'
    || skill === 'holyLight'
    || skill === 'riddleRealm'
    || skill === 'focusFire'
    || skill === 'refreshBoost'
    || skill === 'cleanseSilence'
    || skill === 'drawCard'
    || skill === 'discard'
    || skill === 'fog'
    || skill === 'magicSwap'
    || skill === 'aoeHeal'
    || skill === 'healHQ';
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [agileSourceKey, setAgileSourceKey] = useState<BoardKey | null>(null);
  const [animating, setAnimating] = useState(false);
  // 特效状态
  const [deployFlash, setDeployFlash] = useState<{ key: BoardKey; id: number } | null>(null);
  const [damagePopups, setDamagePopups] = useState<{ key: BoardKey; amount: number; id: number }[]>([]);
  const [shakeCell, setShakeCell] = useState<BoardKey | null>(null);
  const [aiDeploying, setAiDeploying] = useState(false);
  // 攻击连线
  const [attackLine, setAttackLine] = useState<AttackLine | null>(null);
  const [skillLine, setSkillLine] = useState<AttackLine | null>(null);
  // 技能飘字
  const [skillFloats, setSkillFloats] = useState<FloatText[]>([]);

  const gameRef = useRef<GameState | null>(null);
  // 联机模式标志：true时跳过AI回合
  const isMultiplayerModeRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idRef = useRef(0);
  const animatedLogIdsRef = useRef<Set<number>>(new Set());
  const runFullAIResponseRef = useRef<() => void>(() => {});

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  const addTimer = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timersRef.current.push(t);
  };

  const nextId = () => ++idRef.current;

  const syncState = useCallback(() => {
    if (gameRef.current) {
      const s = gameRef.current;
      // 深拷贝关键对象，确保 React 检测到变化并重新渲染
      setGameState({
        ...s,
        player: { ...s.player, board: { ...s.player.board } },
        enemy: { ...s.enemy, board: { ...s.enemy.board } },
        log: [...s.log],
      });
    }
  }, []);

  // 显示部署闪光
  const showDeployFlash = useCallback((key: BoardKey) => {
    const id = nextId();
    setDeployFlash({ key, id });
    addTimer(() => setDeployFlash(null), 600);
  }, []);

  // 显示伤害飘字
  const showDamagePopup = useCallback((key: BoardKey, amount: number) => {
    if (amount <= 0) return;
    const id = nextId();
    setDamagePopups(prev => [...prev, { key, amount, id }]);
    addTimer(() => setDamagePopups(prev => prev.filter(p => p.id !== id)), 1200);
  }, []);

  // 显示技能飘字
  const showSkillFloat = useCallback((key: BoardKey, text: string, color: string) => {
    const id = nextId();
    setSkillFloats(prev => [...prev, { key, text, color, id }]);
    addTimer(() => setSkillFloats(prev => prev.filter(p => p.id !== id)), 1500);
  }, []);

  const showSkillLine = useCallback((from: BoardKey, to: BoardKey, duration = 760) => {
    setSkillLine({ from, to });
    addTimer(() => setSkillLine(null), duration);
  }, []);

  const showAttackLine = useCallback((from: BoardKey, to: BoardKey, duration = 760) => {
    setAttackLine({ from, to });
    addTimer(() => setAttackLine(null), duration);
  }, []);

  // 显示格子震动
  const showShake = useCallback((key: BoardKey) => {
    setShakeCell(key);
    addTimer(() => setShakeCell(null), 400);
  }, []);

  // 获取当前所有单位的HP快照
  const getHpSnapshot = useCallback((state: GameState): Record<string, number> => {
    const hps: Record<string, number> = {};
    hps['0-1'] = state.enemy.hp;
    hps['3-1'] = state.player.hp;
    for (const [k, u] of Object.entries(state.enemy.board)) hps[k] = u.hp;
    for (const [k, u] of Object.entries(state.player.board)) hps[k] = u.hp;
    return hps;
  }, []);

  // 解析log中的技能触发，生成飘字
  const parseSkillFloats = useCallback((state: GameState) => {
    const recentLogs = state.log;
    for (const log of recentLogs) {
      if (animatedLogIdsRef.current.has(log.id)) continue;
      animatedLogIdsRef.current.add(log.id);
      const rule = SKILL_TRIGGER_RULES.find(candidate => candidate.pattern.test(log.msg));
      if (!rule) continue;

      const explicitSourceName = getExplicitSourceName(rule.skill, log.msg);
      const unitKeys = explicitSourceName
        ? findUniqueUnitKeyByExactName(state, explicitSourceName)
        : findTriggerUnitKeysByName(state, log.msg);
      const unresolvedNamedSource = explicitSourceName !== null
        && unitKeys.length === 0
        && !isSideScopedTrigger(rule.skill);
      const hqKey = getExplicitHqKey(log);
      const sideKey = isSideScopedTrigger(rule.skill) ? getSideHqKey(log) : null;
      const activeAttackerKey = state.attackingUnit && !explicitSourceName && isSourceOnlyTrigger(rule.skill)
        ? state.attackingUnit
        : null;
      const targetKeys = unresolvedNamedSource
        ? []
        : activeAttackerKey
        ? [activeAttackerKey]
        : unitKeys.length > 0
          ? unitKeys
          : hqKey
            ? [hqKey]
            : sideKey
              ? [sideKey]
              : [];

      for (const targetKey of targetKeys) {
        showSkillFloat(targetKey, getSkillFloatText(rule.skill, log.msg), getSkillFloatColor(rule.skill));
      }
    }
  }, [showSkillFloat]);

  // 检测伤害并触发特效
  const detectDamage = useCallback((beforeHps: Record<string, number>, state: GameState) => {
    const afterHps = getHpSnapshot(state);
    for (const [k, prevHp] of Object.entries(beforeHps)) {
      const newHp = afterHps[k] || 0;
      if (newHp < prevHp) {
        const dmg = prevHp - newHp;
        showDamagePopup(k as BoardKey, dmg);
        showShake(k as BoardKey);
      }
    }
    // 解析技能飘字
    parseSkillFloats(state);
  }, [showDamagePopup, showShake, getHpSnapshot, parseSkillFloats]);

  // ====== 异步攻击序列（1秒间隔） ======
  const runAttackSequence = useCallback((who: 'player' | 'enemy', onComplete: () => void) => {
    const state = gameRef.current;
    if (!state || state.gameOver) { onComplete(); return; }

    const order = getAttackOrder(state, who);
    if (order.length === 0) { onComplete(); return; }

    let idx = 0;

    const step = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAttackLine(null); onComplete(); return; }

      // 跳过已不存在的单位
      while (idx < order.length) {
        const board = who === 'player' ? s.player.board : s.enemy.board;
        if (board[order[idx].key]) break;
        idx++;
      }

      if (idx >= order.length) { setAttackLine(null); onComplete(); return; }

      const { key, unit } = order[idx];

      // 找到攻击目标（用于画连线）
      const targetInfo = pickAutoTarget(s, unit, who);
      const targetKey = targetInfo?.key || null;

      // 设置攻击高亮和连线
      s.attackingUnit = key;
      if (targetKey) {
        setAttackLine({ from: key, to: targetKey });
      }
      syncState();

      // 执行攻击
      const beforeHps = getHpSnapshot(s);
      executeSingleAttack(s, key, who);
      detectDamage(beforeHps, s);
      syncState();
      idx++;

      // 500ms后清除连线和部分高亮
      addTimer(() => {
        if (gameRef.current) {
          clearAttackingUnit(gameRef.current);
          setAttackLine(null);
          syncState();
        }
      }, 500);

      // 1000ms后下一个单位
      addTimer(step, 1000);
    };

    step();
  }, [syncState, detectDamage, getHpSnapshot]);

  // ====== AI部署序列（逐张，1.2秒/张） ======
  const runAIDeploySequence = useCallback((onComplete: () => void) => {
    const state = gameRef.current;
    if (!state || state.gameOver) { onComplete(); return; }

    const tryDeploy = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { onComplete(); return; }

      const logStart = s.log.length;
      const result = doAITurnDeploy(s);
      if (result) {
        const key: BoardKey = `${result.row}-${result.col}`;
        const deployedUnit = result.row >= 0 ? s.enemy.board[key] : null;
        if (deployedUnit?.name === result.cardName) {
          showDeployFlash(key);
        } else if (hasTriggeredSkill(s.log.slice(logStart))) {
          showSkillLine('0-1', result.row >= 0 ? key : '3-1');
        }
        parseSkillFloats(s);
        syncState();
        addTimer(tryDeploy, 1200);
      } else {
        onComplete();
      }
    };

    setAiDeploying(true);
    addTimer(() => {
      tryDeploy();
      addTimer(() => setAiDeploying(false), 100);
    }, 500);
  }, [syncState, showDeployFlash, showSkillLine, parseSkillFloats]);

  const startGame = useCallback((playerFaction: Faction, playerCustomCards?: CardDef[], enemyCustomCards?: CardDef[]) => {
    const factions: Faction[] = ['empire', 'wild', 'arcane'];
    const enemyFaction = factions.filter(f => f !== playerFaction)[Math.floor(Math.random() * 2)];
    const state = createGame(playerFaction, enemyFaction, undefined, playerCustomCards, enemyCustomCards);
    gameRef.current = state;
    syncState();
    setSelectedCardIdx(null);
    setAnimating(false);
    setAttackLine(null);
    setSkillLine(null);
    setSkillFloats([]);
    animatedLogIdsRef.current.clear();
    clearTimers();

    addTimer(() => {
      if (gameRef.current) {
        gameRef.current.showTurnBanner = null;
        syncState();
      }
    }, 1500);
  }, [syncState]);

  const selectCard = useCallback((idx: number) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver || state.sniperMode) return;
    const card = state.player.hand[idx];
    if (!card) return;
    if (card.type === '士兵' && state.player.spellOnlyNextTurn) return;
    let cost = card.cost;
    if (state.player.discountNext > 0 && card.type === '士兵') {
      cost = Math.max(0, cost - state.player.discountNext);
    }
    if (cost > state.player.gold) return;
    setAgileSourceKey(null);
    setSelectedCardIdx(prev => prev === idx ? null : idx);
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver) return;
    const key: BoardKey = `${row}-${col}`;

    if (state.sniperMode && state.sniperQueue.length > 0) {
      if (row >= 2) return;
      const sniper = state.sniperQueue[0];
      const sniperEntry = Object.entries(state.player.board).find(([, unit]) => unit.uid === sniper.uid);
      if (sniperEntry) showAttackLine(sniperEntry[0] as BoardKey, key, 900);
      resolveSniper(state, key);
      parseSkillFloats(state);
      syncState();
      runFullAIResponseRef.current();
      return;
    }

    if (selectedCardIdx === null) {
      if (agileSourceKey) {
        if (moveAgileUnit(state, agileSourceKey, key, 'player')) {
          showDeployFlash(key);
          parseSkillFloats(state);
          setAgileSourceKey(null);
          syncState();
        } else {
          const unit = state.player.board[key];
          if (unit?.skills.includes('agile') && !unit.agileUsed && (row === 2 || row === 3) && !(row === 3 && col === 1)) {
            setAgileSourceKey(key);
          } else {
            setAgileSourceKey(null);
          }
        }
        return;
      }
      const agileUnit = state.player.board[key];
      if (agileUnit?.skills.includes('agile') && !agileUnit.agileUsed && (row === 2 || row === 3) && !(row === 3 && col === 1)) {
        setAgileSourceKey(key);
        return;
      }
      return;
    }
    const card = state.player.hand[selectedCardIdx];
    if (!card) return;

    if (card.type === '士兵') {
      if (state.player.spellOnlyNextTurn) return;
      if (row !== 2 && row !== 3) return;
      if (row === 3 && col === 1) return;
      if (deployUnit(state, selectedCardIdx, row, col, 'player')) {
        showDeployFlash(key);
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
      }
    } else if (card.type === '法术') {
      if (card.name === '天火降临' || card.name === '混乱风暴') {
        const logStart = state.log.length;
        castSpell(state, selectedCardIdx, null, 'player');
        if (hasTriggeredSkill(state.log.slice(logStart))) showSkillLine('3-1', '0-1', 900);
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
        return;
      }
      if (card.skills.includes('magicDmg') || card.skills.includes('focusFire') || card.skills.includes('destroy')) {
        if (row < 0 || row > 1) return;
        // 免疫单位不能被法术指定（末日审判也受免疫影响）
        const targetUnit = state.enemy.board[key];
        if (targetUnit && targetUnit.skills.includes('immune')) return;
        const logStart = state.log.length;
        castSpell(state, selectedCardIdx, key, 'player');
        if (hasTriggeredSkill(state.log.slice(logStart))) showSkillLine('3-1', key);
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
      } else if (card.skills.includes('shield')) {
        if (row !== 2 && row !== 3) return;
        const targetExists = row === 3 && col === 1 ? true : !!state.player.board[key];
        if (targetExists) {
          const logStart = state.log.length;
          castSpell(state, selectedCardIdx, key, 'player');
          if (hasTriggeredSkill(state.log.slice(logStart))) showSkillLine('3-1', key);
          parseSkillFloats(state);
          setSelectedCardIdx(null);
          syncState();
        }
      } else if (card.skills.includes('tear') && card.skills.includes('poisonBurst')) {
        // 荒野呼唤：对指定单位使用
        if (row < 0 || row > 1) return;
        const logStart = state.log.length;
        castSpell(state, selectedCardIdx, key, 'player');
        if (hasTriggeredSkill(state.log.slice(logStart))) showSkillLine('3-1', key);
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
      } else if (card.skills.includes('magicSwap') && card.name === '疾风步') {
        // 疾风步：指定1个敌方单位
        if (row < 0 || row > 1) return;
        const logStart = state.log.length;
        castSpell(state, selectedCardIdx, key, 'player');
        if (hasTriggeredSkill(state.log.slice(logStart))) showSkillLine('3-1', key);
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
      } else {
        const logStart = state.log.length;
        castSpell(state, selectedCardIdx, null, 'player');
        if (hasVisibleSkill(card.skills) && hasTriggeredSkill(state.log.slice(logStart))) {
          showSkillLine('3-1', card.skills.includes('healHQ') || card.skills.includes('aoeHeal') ? '3-1' : '0-1', 900);
        }
        parseSkillFloats(state);
        setSelectedCardIdx(null);
        syncState();
      }
    }
  }, [selectedCardIdx, agileSourceKey, syncState, showDeployFlash, showSkillLine, showAttackLine, parseSkillFloats]);

  const handleEndTurn = useCallback((onComplete?: () => void) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver) {
      onComplete?.();
      return;
    }
    // P0: 狙击阶段禁止结束回合
    if (state.sniperMode || state.sniperQueue.length > 0) {
      onComplete?.();
      return;
    }

    setAnimating(true);
    endTurn(state);

    if (state.sniperMode) {
      syncState();
      setAnimating(false);
      onComplete?.();
      return;
    }

    // 战斗阶段开始：触发部署自带的均衡等技能，如有均衡则显示飘字
    combatPhaseStart(state, 'player');
    parseSkillFloats(state);

    runAttackSequence('player', () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAnimating(false); onComplete?.(); return; }

      if (isMultiplayerModeRef.current) {
        // 联机模式：跳过AI回合，等待对手操作
        setAnimating(false);
        syncState();
        onComplete?.(); // P0: 攻击完成后再回调，避免竞态
        return;
      }

      doAITurnResource(s);
      parseSkillFloats(s);
      syncState();

      runAIDeploySequence(() => {
        runAttackSequence('enemy', () => {
          const final = gameRef.current;
          if (!final || final.gameOver) { setAnimating(false); onComplete?.(); return; }
          advanceToPlayerTurn(final);
          parseSkillFloats(final);
          syncState();

          addTimer(() => {
            if (gameRef.current) {
              gameRef.current.showTurnBanner = gameRef.current.turn;
              syncState();
              addTimer(() => {
                if (gameRef.current) {
                  gameRef.current.showTurnBanner = null;
                  syncState();
                }
              }, 1500);
            }
          }, 100);

          setAnimating(false);
          syncState();
          onComplete?.();
        });
      });
    });
  }, [syncState, runAttackSequence, runAIDeploySequence, parseSkillFloats]);

  const runFullAIResponse = useCallback(() => {
    setAnimating(true);
    const s = gameRef.current;
    if (!s || s.gameOver) { setAnimating(false); return; }
    doAITurnResource(s);
    parseSkillFloats(s);
    syncState();

    // ✅ AI回合战斗阶段开始：触发部署自带的均衡等技能
    combatPhaseStart(s, 'enemy');
    parseSkillFloats(s);

    runAIDeploySequence(() => {
      runAttackSequence('enemy', () => {
        const final = gameRef.current;
        if (!final || final.gameOver) { setAnimating(false); return; }
        advanceToPlayerTurn(final);
        parseSkillFloats(final);
        syncState();
        addTimer(() => {
          if (gameRef.current) {
            gameRef.current.showTurnBanner = gameRef.current.turn;
            syncState();
            addTimer(() => {
              if (gameRef.current) {
                gameRef.current.showTurnBanner = null;
                syncState();
              }
            }, 1500);
          }
        }, 100);
        setAnimating(false);
        syncState();
      });
    });
  }, [syncState, runAttackSequence, runAIDeploySequence, parseSkillFloats]);
  runFullAIResponseRef.current = runFullAIResponse;

  // 联机模式专用：狙击目标选择后继续执行攻击序列
  const snipeAndAttack = useCallback((targetKey: BoardKey, onComplete: () => void) => {
    const state = gameRef.current;
    if (!state) { onComplete(); return; }
    const sniper = state.sniperQueue[0];
    const sniperEntry = sniper && Object.entries(state.player.board).find(([, unit]) => unit.uid === sniper.uid);
    if (sniperEntry) showAttackLine(sniperEntry[0] as BoardKey, targetKey, 900);
    resolveSniper(state, targetKey);
    parseSkillFloats(state);
    syncState();
    // ✅ 战斗阶段开始：触发部署自带的均衡等技能
    combatPhaseStart(state, 'player');
    parseSkillFloats(state);
    runAttackSequence('player', () => {
      setAnimating(false);
      syncState();
      onComplete();
    });
  }, [syncState, runAttackSequence, showAttackLine, parseSkillFloats]);

  const handleSurrender = useCallback((): boolean => {
    const state = gameRef.current;
    if (!state || state.gameOver) return false;
    if (window.confirm('确认认输？')) {
      state.gameOver = true;
      state.winner = 'enemy';
      state.phase = 'game_over';
      syncState();
      return true; // P0: 确认后才返回true
    }
    return false; // P0: 取消返回false
  }, [syncState]);

  const handleRestart = useCallback(() => {
    clearTimers();
    gameRef.current = null;
    setGameState(null);
    setSelectedCardIdx(null);
    setAnimating(false);
    setDeployFlash(null);
    setDamagePopups([]);
    setShakeCell(null);
    setAiDeploying(false);
    setAttackLine(null);
    setSkillLine(null);
    setSkillFloats([]);
    animatedLogIdsRef.current.clear();
  }, []);

  const getHighlightCells = useCallback(() => {
    const state = gameRef.current;
    if (!state || selectedCardIdx === null) return new Set<BoardKey>();
    const card = state.player.hand[selectedCardIdx];
    if (!card) return new Set<BoardKey>();
    const cells = new Set<BoardKey>();
    if (card.type === '士兵') {
      if (state.player.spellOnlyNextTurn) return cells;
      for (const r of [2, 3]) {
        for (let c = 0; c < 3; c++) {
          if (r === 3 && c === 1) continue;
          cells.add(`${r}-${c}`);
        }
      }
    } else if (card.type === '法术') {
      if (card.name === '天火降临' || card.name === '混乱风暴') {
        cells.add('3-1');
        return cells;
      }
      if (card.skills.includes('magicDmg') || card.skills.includes('focusFire') || card.skills.includes('destroy')) {
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          const k = `${r}-${c}` as BoardKey;
          // 免疫：不能被法术指定为目标（末日审判的 destroy 也受免疫影响）
          const u = state.enemy.board[k];
          if (u && u.skills.includes('immune')) continue;
          cells.add(k);
        }
      } else if (card.skills.includes('shield')) {
        cells.add('3-1');
        for (let c = 0; c < 3; c++) {
          if (state.player.board[`2-${c}`]) cells.add(`2-${c}`);
          if (state.player.board[`3-${c}`]) cells.add(`3-${c}`);
        }
      } else if (card.skills.includes('tear') && card.skills.includes('poisonBurst')) {
        // 荒野呼唤：对指定单位使用撕裂+毒爆
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          cells.add(`${r}-${c}` as BoardKey);
        }
      } else if (card.skills.includes('magicSwap') && card.name === '疾风步') {
        // 疾风步：指定1个敌方单位交换位置
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          cells.add(`${r}-${c}` as BoardKey);
        }
      }
    }
    return cells;
  }, [selectedCardIdx]);

  const getSnipeTargets = useCallback(() => {
    const state = gameRef.current;
    if (!state || !state.sniperMode || state.sniperQueue.length === 0) return new Set<BoardKey>();
    const unit = state.sniperQueue[0];
    const targets = getTargetsInRange(state, unit, 'player');
    return new Set(targets.map(t => t.key));
  }, []);

  const getEnemyFrontExists = useCallback(() => {
    if (!gameRef.current) return true;
    return !isRowEmpty(gameRef.current, 1);
  }, []);

  const getPlayerFrontExists = useCallback(() => {
    if (!gameRef.current) return true;
    return !isRowEmpty(gameRef.current, 2);
  }, []);

  // 设置联机模式（true=跳过AI回合）
  const setMultiplayerMode = useCallback((enabled: boolean) => {
    isMultiplayerModeRef.current = enabled;
  }, []);

  // 强制同步状态到React（联机模式用，外部修改gameRef后刷新UI）
  const forceSync = useCallback(() => {
    syncState();
  }, [syncState]);

  // 加载游戏状态（联机模式用，用种子创建游戏后加载）
  const loadGameState = useCallback((newState: GameState) => {
    gameRef.current = newState;
    animatedLogIdsRef.current = new Set(newState.log.map(log => log.id));
    syncState();
  }, [syncState]);

  // 镜像敌方部署（联机同步用）：直接在 gameRef.current 上操作
  const mirrorEnemyDeployAt = useCallback((row: number, col: number, card: CardDef) => {
    if (!gameRef.current) return;
    mirrorEnemyDeploy(gameRef.current, card, row, col);
    showDeployFlash(`${row}-${col}`);
    parseSkillFloats(gameRef.current);
    syncState();
  }, [syncState, showDeployFlash, parseSkillFloats]);

  // 镜像敌方法术（联机同步用）：直接在 gameRef.current 上操作
  const mirrorEnemySpellAt = useCallback((card: CardDef, targetKey: BoardKey) => {
    if (!gameRef.current) return;
    const logStart = gameRef.current.log.length;
    mirrorEnemySpell(gameRef.current, card, targetKey);
    if (hasTriggeredSkill(gameRef.current.log.slice(logStart))) showSkillLine('0-1', targetKey);
    parseSkillFloats(gameRef.current);
    syncState();
  }, [syncState, showSkillLine, parseSkillFloats]);

  // 执行指定方的攻击序列（联机模式用）
  const runAttackSequenceFor = useCallback((who: 'player' | 'enemy', onComplete: () => void) => {
    runAttackSequence(who, onComplete);
  }, [runAttackSequence]);

  // 切换回玩家回合（联机模式用）
  const advanceTurn = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.gameOver) return;
    advanceToPlayerTurn(state);
    parseSkillFloats(state);
    syncState();
  }, [syncState, parseSkillFloats]);

  return {
    gameState,
    selectedCardIdx,
    animating,
    deployFlash,
    damagePopups,
    shakeCell,
    aiDeploying,
    attackLine,
    skillLine,
    skillFloats,
    startGame,
    selectCard,
    handleCellClick,
    handleEndTurn,
    handleSurrender,
    handleRestart,
    setMultiplayerMode,
    forceSync,
    loadGameState,
    mirrorEnemyDeployAt,
    mirrorEnemySpellAt,
    snipeAndAttack,
    runAttackSequenceFor,
    advanceTurn,
    getHighlightCells,
    getSnipeTargets,
    getEnemyFrontExists,
    getPlayerFrontExists,
  };
}
