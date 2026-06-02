import type {
  GameState, PlayerState, Unit, CardDef, BoardKey, Position,
  PlayerType, Faction, LogEntry, DamageEvent,
  CastSpellResult, DeployResult, SpellSyncData, DeploySyncData,
} from '@/types/game';
import { getFactionCardsForDeck, getDamageType, SUBTYPE_RANGE, isMagicUnitSubtype } from '@/data/cards';

let logIdCounter = 0;

// ======== 种子化随机数生成器（联机同步用）========
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// 全局rng，可被覆盖
let globalRng = { next: () => Math.random() };

export function setSeed(seed: number): void {
  globalRng = new SeededRandom(seed);
}

export function clearSeed(): void {
  globalRng = { next: () => Math.random() };
}

function rng(): number {
  return globalRng.next();
}

// ======== 辅助函数 ========
function uid(): string {
  return rng().toString(36).slice(2) + Date.now().toString(36);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function posKey(row: number, col: number): BoardKey {
  return `${row}-${col}`;
}

function parseKey(key: BoardKey): Position {
  const [r, c] = key.split('-').map(Number);
  return { row: r, col: c };
}

// ======== 创建初始玩家状态 ========
function createPlayer(faction: Faction, _isEnemy: boolean, customCards?: CardDef[]): PlayerState {
  const cards = customCards || getFactionCardsForDeck(faction);
  const deck = shuffle(cards.map(c => ({ ...c })));
  return {
    gold: 0,
    maxGold: 3,
    hp: 40,
    maxHp: 40,
    deck,
    hand: [],
    fatigue: 0,
    board: {},
    hqArmor: 0,
    discountNext: 0,
    drawExtra: 0,
    focusTarget: null,
    spellOnlyNextTurn: false,
    riddleActive: false,
    bleed: 0,
    poison: 0,
  };
}

// ======== 卡牌转单位 ========
function cardToUnit(card: CardDef): Unit {
  return {
    uid: uid(),
    defId: card.id,
    name: card.name,
    cost: card.cost,
    quality: card.quality,
    type: card.type,
    subtype: card.subtype,
    atk: card.atk,
    baseAtk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    armor: card.armor,
    baseArmor: card.armor,
    desc: card.desc,
    skills: [...card.skills],
    faction: card.faction,
    damageType: getDamageType(card.subtype),
    canAttack: true, // v1.0: 所有单位部署后都能攻击
    // frozen 字段已废弃（freeze技能已删除）
    frozen: false as any,
    frozenTurns: 0 as any,
    equip: null,
    bleed: 0,
    poison: 0,
    firstGuardUsed: false,
    isStealthed: card.skills.includes('stealth'),
    silenceTurns: 0,
    buffs: [],
    hasAttackedThisTurn: false,
    flashStrikeUsed: false,
    magicBoostUsed: false,
    agileUsed: false,
  };
}

// ======== 创建游戏 ========
export function createGame(
  playerFaction: Faction,
  enemyFaction: Faction,
  seed?: number,
  playerCustomCards?: CardDef[],
  enemyCustomCards?: CardDef[]
): GameState {
  logIdCounter = 0;
  // 如果提供了种子，使用种子化随机数
  if (seed !== undefined) setSeed(seed);
  
  const player = createPlayer(playerFaction, false, playerCustomCards);
  const enemy = createPlayer(enemyFaction, true, enemyCustomCards);

  // 初始手牌
  const playerHandCount = 4;
  const enemyHandCount = 5;
  for (let i = 0; i < playerHandCount; i++) drawCardRaw(player);
  for (let i = 0; i < enemyHandCount; i++) drawCardRaw(enemy);

  // 恢复默认随机数
  clearSeed();

  const state: GameState = {
    phase: 'playing',
    turn: 1,
    currentPlayer: 'player',
    turnPhase: 'resource',
    selectedDeck: playerFaction,
    selectedCardIdx: null,
    sniperMode: false,
    sniperQueue: [],
    sniperTarget: null,
    gameOver: false,
    winner: null,
    log: [],
    player,
    enemy,
    animating: false,
    attackingUnit: null,
    showTurnBanner: 1,
    showSnipeBanner: false,
  };

  addLog(state, '🎮 战斗开始！', 'system');
  addLog(state, `💡 精确距离：近战=1 弓箭=2 狙击≥2(盲区) 魔法=不限`, 'system');

  startTurn(state);
  return state;
}

// ======== 日志 ========
function addLog(state: GameState, msg: string, type: LogEntry['type']): void {
  state.log.push({ id: ++logIdCounter, msg, type, turn: state.turn });
  if (state.log.length > 100) state.log.shift();
}

// ======== 抽牌 ========
// 获取玩家战场上的均衡等级（如有），用于新抽卡牌费用调整
function getBalanceLevel(p: PlayerState): number | null {
  for (const unit of Object.values(p.board)) {
    if (unit.skills.includes('balance')) {
      return getSkillLevelFromCard({ desc: unit.desc, name: unit.name }, 'balance');
    }
  }
  return null;
}

function drawCardRaw(p: PlayerState): void {
  if (p.hand.length >= 6) return;
  if (p.deck.length === 0) {
    p.fatigue++;
    const dmg = p.fatigue;
    p.hp -= dmg;
    return;
  }
  const card = { ...p.deck.pop()! };
  // 如果战场上有均衡单位，新抽的士兵卡费用也被均衡
  const eqLevel = getBalanceLevel(p);
  if (eqLevel !== null && card.type === '士兵') {
    card.cost = eqLevel;
  }
  p.hand.push(card);
}

// ======== 回合开始 ========
function startTurn(state: GameState): void {
  // 回合提示动画
  state.showTurnBanner = state.turn;

  const p = state.currentPlayer === 'player' ? state.player : state.enemy;

  // 金币增长曲线
  if (state.turn <= 2) p.maxGold = 3;
  else if (state.turn <= 4) p.maxGold = 4;
  else if (state.turn <= 6) p.maxGold = 5;
  else if (state.turn <= 8) p.maxGold = 6;
  else if (state.turn <= 10) p.maxGold = 7;
  else p.maxGold = 8;

  p.gold = Math.min(p.gold + p.maxGold, 99);

  // 抽牌
  const drawCount = 1 + p.drawExtra;
  for (let i = 0; i < drawCount; i++) drawCardRaw(p);
  p.drawExtra = 0;

  // 利息
  for (const unit of Object.values(p.board)) {
    if (unit.skills.includes('interest')) {
      const interestLevel = getSkillLevel(unit, 'interest');
      p.gold = Math.min(p.gold + interestLevel, 99);
      addLog(state, `💰 ${unit.name} 利息 +${interestLevel}金币`, state.currentPlayer);
    }
    unit.agileUsed = false;
  }

  // 沉默衰减
  for (const unit of Object.values(p.board)) {
    if (unit.silenceTurns > 0) {
      unit.silenceTurns--;
    }
  }

  // 清理临时buff（如法力增幅，敌方回合开始时移除）
  for (const unit of Object.values(p.board)) {
    unit.buffs = unit.buffs.filter(buff => {
      if (buff.removeOn === 'enemy_turn_start') {
        unit.atk -= buff.value; // 还原攻击值
        return false; // 移除buff
      }
      return true;
    });
  }

  // DOT结算（敌方回合开始时结算我方流血）
  if (state.currentPlayer === 'enemy') {
    resolveBleed(state, 'player');
  } else {
    resolveBleed(state, 'enemy');
  }

  // 治疗技能：回合开始时自动触发，治疗血量最低的友方目标
  for (const unit of Object.values(p.board)) {
    if (unit.skills.includes('heal') && !unit.silenceTurns) {
      const healLevel = getSkillLevel(unit, 'heal') || 1;
      // 找到血量百分比最低的友方目标（包括HQ）
      let bestTarget: { key: string; hpPct: number } | null = null;
      // 检查HQ
      const hqHpPct = p.hp / p.maxHp;
      bestTarget = { key: 'hq', hpPct: hqHpPct };
      // 检查所有友方单位
      for (const [k, u] of Object.entries(p.board)) {
        const hpPct = u.hp / u.maxHp;
        if (hpPct < bestTarget.hpPct) {
          bestTarget = { key: k, hpPct };
        }
      }
      // 治疗目标
      if (bestTarget) {
        if (bestTarget.key === 'hq') {
          const oldHp = p.hp;
          p.hp = Math.min(p.hp + healLevel, p.maxHp);
          if (p.hp > oldHp) {
            addLog(state, `💚 ${unit.name} 治疗${healLevel} → HQ 恢复${p.hp - oldHp}点生命`, state.currentPlayer);
          }
        } else {
          const targetUnit = p.board[bestTarget.key];
          if (targetUnit) {
            const oldHp = targetUnit.hp;
            targetUnit.hp = Math.min(targetUnit.hp + healLevel, targetUnit.maxHp);
            if (targetUnit.hp > oldHp) {
              addLog(state, `💚 ${unit.name} 治疗${healLevel} → ${targetUnit.name} 恢复${targetUnit.hp - oldHp}点生命`, state.currentPlayer);
              // 生长：受治疗后+X/+X
              if (targetUnit.skills.includes('growth')) {
                const growthLevel = getSkillLevel(targetUnit, 'growth') || 1;
                targetUnit.atk += growthLevel;
                targetUnit.maxHp += growthLevel;
                targetUnit.hp += growthLevel;
                addLog(state, `🌱 生长${growthLevel}：${targetUnit.name} +${growthLevel}/+${growthLevel}（受治疗后）`, state.currentPlayer);
              }
            }
          }
        }
      }
    }
  }

  state.turnPhase = 'deploy';
  const who = state.currentPlayer === 'player' ? '玩家' : 'AI';
  addLog(state, `━━ 第${state.turn}回合（${who}）━━ 获得${p.maxGold}金币`, state.currentPlayer);
  checkGameOver(state);
}

// ======== 战斗阶段开始时触发（部署自带技能）========
// 返回是否触发了均衡效果（用于UI飘字显示）
export function combatPhaseStart(state: GameState, who: PlayerType): boolean {
  const p = who === 'player' ? state.player : state.enemy;
  let balanceTriggered = false;

  // 均衡：部署自带的均衡技能，在战斗阶段开始时触发
  // 也处理战场上单位的均衡效果（如部署时自带的均衡单位）
  // 以及之前施放的均衡法术的持续效果
  for (const unit of Object.values(p.board)) {
    if (unit.skills.includes('balance')) {
      const eqLevel = getSkillLevelFromCard({ desc: unit.desc, name: unit.name }, 'balance');
      for (const h of p.hand) {
        if (h.type === '士兵') h.cost = eqLevel;
      }
      addLog(state, `⚖️ 均衡${eqLevel}：手牌士兵费用调整为${eqLevel}（${unit.name}触发）`, who);
      balanceTriggered = true;
    }
  }
  return balanceTriggered;
}

function resolveBleed(state: GameState, target: PlayerType): void {
  const p = target === 'player' ? state.player : state.enemy;
  // HQ流血结算
  if (p.bleed > 0) {
    const dmg = p.bleed;
    p.hp -= dmg;
    addLog(state, `🩸 总部流血 ${dmg}点伤害 (${p.hp + dmg}→${p.hp})`, target);
    p.bleed = Math.floor(p.bleed / 2);
  }
  // 单位流血结算
  for (const [key, unit] of Object.entries(p.board)) {
    if (unit.bleed > 0) {
      const dmg = unit.bleed;
      unit.hp -= dmg;
      addLog(state, `🩸 ${unit.name} 流血 ${dmg}点伤害 (${unit.hp + dmg}→${unit.hp})`, target);
      unit.bleed = Math.floor(unit.bleed / 2);
      if (unit.hp <= 0) {
        delete p.board[key];
        addLog(state, `💀 ${unit.name} 因流血阵亡`, target);
      }
    }
  }
  checkGameOver(state);
}

// ======== 获取技能等级（从desc中解析数值） ========
function getSkillLevel(unit: Unit, skillId: string): number {
  // 简单匹配：从desc中提取数字
  const patterns: Record<string, RegExp> = {
    'physResist': /物抗(\d+)/,
    'magicResist': /法抗(\d+)/,
    'allResist': /全抗(\d+)/,
    'bleed': /流血(\d+)/,
    'poison': /中毒(\d+)/,
    'ambush': /伏击(\d+)/,
    'intimidate': /叱吓(\d+)/,
    'antiAir': /防空(\d+)/,
    'precision': /精准(\d+)/,
    'dive': /俯冲(\d+)/,
    'extract': /萃取(\d+)/,
    'interest': /利息(\d+)/,
    'silence': /沉默(\d+)/,
    'nimble': /灵动.*加(\d+)/,
    'growth': /生长.*加(\d+)/,
    'pursuit': /追击.*(\d+)点/,
    'armor': /护甲(\d+)/,
    'heal': /治疗(\d+)/,
    'tacticCmd': /战术指挥(\d+)/,
    'shootCmd': /射击指挥(\d+)/,
    'magicBoost': /(?:法力)?增幅(\d+)/,
  };
  const pattern = patterns[skillId];
  if (pattern) {
    const match = unit.desc.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  // 默认值
  const defaults: Record<string, number> = {
    'physResist': 2, 'magicResist': 2, 'allResist': 2,
    'bleed': 1, 'poison': 2, 'ambush': 2, 'intimidate': 2,
    'antiAir': 2, 'precision': 1, 'dive': 2, 'extract': 2,
    'interest': 1, 'silence': 1, 'nimble': 1, 'growth': 1,
    'pursuit': 2,
    'armor': 1,
    'heal': 1,
    'tacticCmd': 1, 'shootCmd': 1,
  };
  return defaults[skillId] || 1;
}

function applySilenceToEnemyBoard(
  state: GameState,
  enemyBoard: Record<BoardKey, Unit>,
  level: number,
  who: PlayerType,
): void {
  for (const u of Object.values(enemyBoard)) {
    u.silenceTurns = Math.max(u.silenceTurns, level);
  }
  addLog(state, `🔇 沉默${level}：敌方单位技能失效${level}回合`, who);
}

function applyHolyLight(state: GameState, who: PlayerType): void {
  const enemy = who === 'player' ? state.enemy : state.player;
  if (enemy.riddleActive) {
    const dropped = enemy.hand.filter(c => c.type === '法术').length;
    enemy.hand = enemy.hand.filter(c => c.type !== '法术');
    enemy.riddleActive = false;
    addLog(state, `✨ 圣光：敌方弃掉${dropped}张已激活谜语`, who);
    return;
  }
  const spellIdxs = enemy.hand
    .map((c, i) => (c.type === '法术' ? i : -1))
    .filter(i => i >= 0);
  if (spellIdxs.length > 0) {
    const idx = spellIdxs[Math.floor(rng() * spellIdxs.length)];
    const [discarded] = enemy.hand.splice(idx, 1);
    addLog(state, `✨ 圣光：敌方弃掉【${discarded.name}】`, who);
  }
}

function applyRiddleRealm(state: GameState, who: PlayerType): void {
  const p = who === 'player' ? state.player : state.enemy;
  if (p.hand.some(c => c.type === '法术')) {
    p.riddleActive = true;
    addLog(state, `🔮 谜境激活：手牌谜语法术已就绪`, who);
  } else {
    addLog(state, `🔮 谜境激活（当前手牌无法术）`, who);
  }
}

function applyDeployUnitPassives(state: GameState, unit: Unit, who: PlayerType): void {
  const enemy = who === 'player' ? state.enemy : state.player;
  if (unit.skills.includes('silence')) {
    applySilenceToEnemyBoard(state, enemy.board, getSkillLevel(unit, 'silence'), who);
  }
  if (unit.skills.includes('holyLight')) {
    applyHolyLight(state, who);
  }
  if (unit.skills.includes('riddleRealm')) {
    applyRiddleRealm(state, who);
  }
}

function damageAllFieldUnits(state: GameState, amount: number, source: string, who: PlayerType): void {
  for (const side of ['player', 'enemy'] as const) {
    const board = side === 'player' ? state.player.board : state.enemy.board;
    const sideLabel = side === 'player' ? 'player' : 'enemy';
    for (const [key, u] of Object.entries({ ...board })) {
      u.hp -= amount;
      addLog(state, `💥 ${source} → ${u.name} ${amount}点伤害`, who);
      if (u.hp <= 0) {
        delete board[key as BoardKey];
        addLog(state, `💀 ${u.name} 阵亡！`, sideLabel);
      }
    }
  }
  checkGameOver(state);
}

function executeDrawCardSpell(
  state: GameState,
  card: { name: string; desc?: string },
  self: PlayerState,
  opponent: PlayerState,
  who: PlayerType,
): number {
  let drawn = 0;
  const drawOnce = () => {
    const before = self.hand.length;
    drawCardRaw(self);
    if (self.hand.length > before) drawn += 1;
  };

  if (card.name === '计划') {
    drawOnce();
  } else if (card.name === '军情急报') {
    for (let i = 0; i < 3; i++) drawOnce();
  } else if (card.name === '急行军令' || card.name === '重整旗鼓') {
    for (let i = 0; i < 2; i++) drawOnce();
  } else if (card.name === '知己知彼') {
    while (self.hand.length < opponent.hand.length && self.hand.length < 6) drawOnce();
    while (drawn < 2 && self.hand.length < 6) drawOnce();
  } else {
    const match = card.desc?.match(/抽取(\d+)/);
    const count = match ? parseInt(match[1], 10) : 2;
    for (let i = 0; i < count; i++) drawOnce();
  }

  addLog(state, `📜 ${card.name}：抽${drawn}张卡`, who);
  return drawn;
}

// ======== 从卡牌desc中解析技能数值（法术卡专用） ========
function getSkillLevelFromCard(card: { desc?: string; name?: string }, skillId: string): number {
  const patterns: Record<string, RegExp> = {
    'heal': /治疗(\d+)/,
    'aoeHeal': /群体治疗(\d+)/,
    'magicDmg': /造成(\d+)点/,
    'shield': /\+(\d+)护甲/,
    'silence': /沉默(\d+)/,
    'balance': /均衡(\d+)/,
  };
  const pattern = patterns[skillId];
  if (pattern && card.desc) {
    const match = card.desc.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  // 默认值
  const defaults: Record<string, number> = {
    'heal': 2, 'aoeHeal': 2, 'magicDmg': 2, 'shield': 2, 'silence': 1, 'balance': 4,
  };
  return defaults[skillId] || 1;
}

// ======== 强运光环检测 ========
// 检查指定方战场上是否有未中毒、未被沉默的强运单位
// 强运是全局光环：我方任意单位有强运，则我方所有单位的随机伤害取最大值
function hasLuckyOnBoard(state: GameState, who: PlayerType): boolean {
  const p = who === 'player' ? state.player : state.enemy;
  for (const unit of Object.values(p.board)) {
    if (unit.skills.includes('lucky') && unit.silenceTurns === 0 && unit.poison <= 0) {
      return true;
    }
  }
  return false;
}

// ======== "前线不存在"规则 ========
export function isRowEmpty(state: GameState, row: number): boolean {
  if (row === 0 || row === 3) return false; // 底线永远存在
  if (row === 1) return Object.keys(state.enemy.board).filter(k => parseKey(k).row === 1).length === 0;
  if (row === 2) return Object.keys(state.player.board).filter(k => parseKey(k).row === 2).length === 0;
  return false;
}

// ======== 精确距离计算 ========
export function getDistance(state: GameState, fromRow: number, toRow: number): number {
  const rows = [0, 1, 2, 3];
  const valid = rows.map(r => {
    if (r === 0 || r === 3) return true;
    return !isRowEmpty(state, r);
  });

  let idxA = rows.indexOf(fromRow);
  let idxB = rows.indexOf(toRow);
  let steps = 0;
  const dir = idxB > idxA ? 1 : -1;

  while (idxA !== idxB) {
    idxA += dir;
    if (valid[idxA]) steps++;
  }
  return steps;
}

// ======== 获取单位的实际射程 ========
// ======== 获取单位射程 ========
// 返回值：number（固定射程）或 number[]（多射程，如长矛[1,2]）
function getUnitRange(unit: Unit): number | number[] {
  let base: number | number[] = SUBTYPE_RANGE[unit.subtype] || 1;
  if (unit.skills.includes('spear')) base = [1, 2]; // 长矛：距离1或2
  if (unit.skills.includes('shortBow')) base = 999;
  if (unit.skills.includes('fly')) base = 999;
  // 俯冲：需同时拥有飞翔，距离不限
  if (unit.skills.includes('dive') && unit.skills.includes('fly')) base = 999;
  return base;
}

// 检查单位射程是否覆盖某距离
function isInRange(range: number | number[], dist: number): boolean {
  if (Array.isArray(range)) return range.includes(dist);
  if (range === 999) return true; // 魔法/飞翔 = 不限
  return dist === range;
}

// 检查目标是否被隐蔽保护（底线不被近战/弓箭/狙击选中）
function isConcealedProtected(unit: Unit, targetRow: number, targetKey: BoardKey): boolean {
  const isBackRow = targetRow === 0 || targetRow === 3;
  if (!isBackRow) return false;
  const subtype = unit.subtype as string;
  // 隐蔽只对近战、弓箭、狙击生效
  if (subtype !== '近战' && subtype !== '弓箭' && subtype !== '狙击') return false;
  // HQ不受隐蔽保护
  const { col } = parseKey(targetKey);
  if ((targetRow === 0 || targetRow === 3) && col === 1) return false;
  return true;
}

// ======== 获取射程内目标 ========
export function getTargetsInRange(state: GameState, unit: Unit, who: PlayerType): { key: BoardKey; isHq: boolean; unit?: Unit; dist: number }[] {
  const board = who === 'player' ? state.player.board : state.enemy.board;
  const enemyBoard = who === 'player' ? state.enemy.board : state.player.board;
  const pos = Object.entries(board).find(([, u]) => u.uid === unit.uid);
  if (!pos) return [];

  const { row } = parseKey(pos[0]);
  const range = getUnitRange(unit);
  const targets: { key: BoardKey; isHq: boolean; unit?: Unit; dist: number }[] = [];

  // HQ位置
  const hqRow = who === 'player' ? 0 : 3;
  const hqDist = getDistance(state, row, hqRow);

  // 检查HQ（HQ不受隐蔽保护）
  const hasShortBow = unit.skills.includes('shortBow');
  if (unit.subtype === '狙击') {
    if (hqDist >= 2) {
      targets.push({ key: posKey(hqRow, 1), isHq: true, dist: hqDist });
    }
  } else if (unit.subtype === '弓箭') {
    // ✅ 短弓射程不限，可以打HQ；普通弓箭只在距离2时打HQ
    if (hasShortBow || hqDist === 2) {
      targets.push({ key: posKey(hqRow, 1), isHq: true, dist: hqDist });
    }
  } else {
    if (isInRange(range, hqDist)) {
      targets.push({ key: posKey(hqRow, 1), isHq: true, dist: hqDist });
    }
  }

  // 敌方单位
  for (const [key, enemyUnit] of Object.entries(enemyBoard)) {
    const { row: eRow } = parseKey(key);
    const dist = getDistance(state, row, eRow);

    // 隐蔽过滤：底线有conceal的单位不被近战/弓箭/狙击选中
    if (enemyUnit.skills.includes('conceal') && isConcealedProtected(unit, eRow, key)) {
      continue;
    }

    if (unit.subtype === '狙击') {
      if (dist >= 2) targets.push({ key, isHq: false, unit: enemyUnit, dist });
    } else if (unit.subtype === '弓箭') {
      // ✅ 短弓可以打任何距离，普通弓箭只打距离2
      if (hasShortBow || dist === 2) targets.push({ key, isHq: false, unit: enemyUnit, dist });
    } else {
      if (isInRange(range, dist)) {
        targets.push({ key, isHq: false, unit: enemyUnit, dist });
      }
    }
  }

  return targets;
}

// ======== 自动选择目标（优先级：最近目标优先） ========
export function pickAutoTarget(state: GameState, unit: Unit, who: PlayerType): { key: BoardKey; isHq: boolean; unit?: Unit } | null {
  const targets = getTargetsInRange(state, unit, who);
  if (targets.length === 0) return null;

  // 随机单位完全随机
  if (unit.subtype === '随机') {
    return targets[Math.floor(rng() * targets.length)];
  }

  // 嘲讽优先：同一排只生效血量最高的1个嘲讽
  const tauntTargets = targets.filter(t => !t.isHq && t.unit?.skills.includes('taunt'));
  let pool = targets;
  if (tauntTargets.length > 0) {
    // 按row分组，每组只保留血量最高的嘲讽
    const tauntByRow = new Map<number, typeof tauntTargets[0]>();
    for (const tt of tauntTargets) {
      const { row } = parseKey(tt.key);
      const existing = tauntByRow.get(row);
      if (!existing || (tt.unit!.hp > existing.unit!.hp)) {
        tauntByRow.set(row, tt);
      }
    }
    // 只保留血量最高的嘲讽目标（每排1个）
    const effectiveTaunts = Array.from(tauntByRow.values());
    // 如果嘲讽目标在射程内，优先从这些嘲讽中选择
    pool = effectiveTaunts.length > 0 ? effectiveTaunts : targets;
  }

  const board = who === 'player' ? state.player.board : state.enemy.board;
  const pos = Object.entries(board).find(([, u]) => u.uid === unit.uid);
  const myCol = pos ? parseKey(pos[0]).col : 1;

  // 弓箭：短弓优先距离1（最近），普通弓箭优先距离2（隔行）
  if (unit.subtype === '弓箭') {
    let colPriority: number[];
    if (myCol === 0) colPriority = [2, 1, 0];
    else if (myCol === 1) colPriority = [1, 0, 2];
    else colPriority = [0, 1, 2];

    const hasShortBow = unit.skills.includes('shortBow');
    const sorted = [...pool].sort((a, b) => {
      // 短弓优先距离1（升序=最近优先），普通弓箭优先距离2（降序=最远优先）
      if (a.dist !== b.dist) {
        return hasShortBow ? (a.dist - b.dist) : (b.dist - a.dist);
      }
      const aIdx = colPriority.indexOf(parseKey(a.key).col);
      const bIdx = colPriority.indexOf(parseKey(b.key).col);
      return aIdx - bIdx;
    });
    return sorted[0];
  }

  // 狙击/长矛/近战/魔法：优先最近目标
  // 排序规则：1.距离最近优先 2.同距离：优先正前方→左前方→右前方
  const sorted = [...pool].sort((a, b) => {
    // 第一优先级：精确距离（最近的优先）
    if (a.dist !== b.dist) return a.dist - b.dist;
    // 第二优先级：横向距离（正前方优先）
    const aColDiff = Math.abs(parseKey(a.key).col - myCol);
    const bColDiff = Math.abs(parseKey(b.key).col - myCol);
    if (aColDiff !== bColDiff) return aColDiff - bColDiff;
    // 第三优先级：中间列优先
    return Math.abs(parseKey(a.key).col - 1) - Math.abs(parseKey(b.key).col - 1);
  });

  return sorted[0];
}

// ======== 应用伤害 ========
export function applyDamage(
  state: GameState,
  targetKey: BoardKey,
  rawDmg: number,
  attacker: Unit,
  attackerWho: PlayerType,
  isCounter: boolean = false
): DamageEvent | null {
  if (state.gameOver) return null;

  const defenderWho: PlayerType = attackerWho === 'player' ? 'enemy' : 'player';
  const defender = defenderWho === 'player' ? state.player : state.enemy;

  let dmg = rawDmg;
  if (attacker.subtype === '随机') {
    // 从卡牌数据读取随机范围，默认 [1, 3]
    const [minDmg, maxDmg] = attacker.randomRange || [1, 3];
    // 强运光环：我方战场上任意单位有强运（未中毒、未被沉默），
    // 则我方所有单位的随机伤害都取最大值
    const luckyActive = hasLuckyOnBoard(state, attackerWho);
    if (luckyActive) {
      dmg = maxDmg; // ✅ 强运光环：取最大值
    } else {
      dmg = Math.floor(rng() * (maxDmg - minDmg + 1)) + minDmg;
    }
  }

  let dmgType = getDamageType(attacker.subtype);
  // 魔力子弹：狙击伤害视为魔法伤害
  if (attacker.skills.includes('magicBullet') && attacker.subtype === '狙击') {
    dmgType = '魔法';
  }
  const hasPierce = attacker.skills.includes('pierce');
  const hasPiercePlus = attacker.skills.includes('piercePlus'); // 强化贯穿
  const hasManaPierce = attacker.skills.includes('manaPierce') || attacker.skills.includes('magicPierce');
  const hasStrongStrike = attacker.skills.includes('strongStrike');
  const hasPrecision = attacker.skills.includes('precision');

  // HQ攻击
  const { row, col } = parseKey(targetKey);
  if ((defenderWho === 'enemy' && row === 0 && col === 1) || (defenderWho === 'player' && row === 3 && col === 1)) {
    let actualDmg = dmg;

      // 叱吓降低攻击力（在护甲之前）
    const intimidateDebuff = getIntimidateDebuff(attacker, defender.board);
    if (intimidateDebuff > 0) {
      actualDmg = Math.max(0, actualDmg - intimidateDebuff);
    }

    // HQ护甲（强化贯穿完全无视护甲）
    if (dmgType === '物理' && defender.hqArmor > 0 && !hasPierce && !hasPiercePlus) {
      if (defender.hqArmor >= actualDmg) {
        defender.hqArmor -= actualDmg;
        addLog(state, `🛡️ HQ护甲抵消 ${actualDmg} 点伤害`, attackerWho);
        return { targetKey, amount: 0, damageType: dmgType, isBlocked: true };
      } else {
        defender.hqArmor = 0;
        addLog(state, `💥 HQ护甲破碎！溢出伤害被抵挡`, attackerWho);
        return { targetKey, amount: 0, damageType: dmgType, isArmorBreak: true };
      }
    }

    defender.hp -= actualDmg;
    addLog(state, `⚔️ ${attacker.name} 攻击总部，造成 ${actualDmg} 点${dmgType}伤害`, attackerWho);

    // 吸血
    if (attacker.skills.includes('lifesteal') && actualDmg > 0) {
      const healer = attackerWho === 'player' ? state.player : state.enemy;
      healer.hp = Math.min(healer.hp + actualDmg, healer.maxHp);
      addLog(state, `💚 吸血：恢复 ${actualDmg} 生命`, attackerWho);
    }

    // HQ可以受中毒/流血（Bug 3 修复）
    if (attacker.skills.includes('bleed')) {
      const bleedLevel = getSkillLevel(attacker, 'bleed');
      defender.bleed += bleedLevel;
      addLog(state, `🩸 ${attacker.name} 对总部附加流血+${bleedLevel}！`, attackerWho);
    }
    if (attacker.skills.includes('poison')) {
      const poisonLevel = getSkillLevel(attacker, 'poison');
      defender.poison += poisonLevel;
      addLog(state, `☠️ ${attacker.name} 对总部附加中毒+${poisonLevel}！`, attackerWho);
    }

  checkGameOver(state);
  return { targetKey, amount: actualDmg, damageType: dmgType };
  }

  // 单位攻击
  const targetUnit = defender.board[targetKey];
  if (!targetUnit) return null;

  let actualDmg = dmg;

  // 闪避（50%免疫物理攻击）- 精准可无视
  if (targetUnit.skills.includes('dodge') && dmgType === '物理' && !hasPrecision) {
    if (rng() < 0.5) {
      addLog(state, `💨 ${targetUnit.name} 闪避了攻击！`, defenderWho);
      return { targetKey, amount: 0, damageType: dmgType, isDodged: true };
    }
  }

  // 飞翔闪避（近战50%弓箭25%）- 精准和防空可无视
  const hasAntiAir = attacker.skills.includes('antiAir');
  if (targetUnit.skills.includes('fly') && !hasPrecision && !hasAntiAir) {
    if (attacker.subtype === '近战' && rng() < 0.5) {
      addLog(state, `🕊️ ${targetUnit.name} 飞翔闪避近战！`, defenderWho);
      return { targetKey, amount: 0, damageType: dmgType, isDodged: true };
    }
    if (attacker.subtype === '弓箭' && rng() < 0.25) {
      addLog(state, `🕊️ ${targetUnit.name} 飞翔闪避弓箭！`, defenderWho);
      return { targetKey, amount: 0, damageType: dmgType, isDodged: true };
    }
  }

  // 伪装 - 不能被狙击/随机选中
  if (targetUnit.skills.includes('disguise') && (attacker.subtype === '狙击' || attacker.subtype === '随机')) {
    return { targetKey, amount: 0, damageType: dmgType, isDodged: true };
  }

  // 抗性（强击/法力贯穿可无视）
  if (dmgType === '物理' && targetUnit.skills.includes('physResist') && !hasStrongStrike) {
    const resistLevel = getSkillLevel(targetUnit, 'physResist');
    actualDmg = Math.max(0, actualDmg - resistLevel);
  }
  // 法力贯穿：无视法抗和全抗
  if (dmgType === '魔法' && targetUnit.skills.includes('magicResist') && !hasStrongStrike && !hasManaPierce) {
    const resistLevel = getSkillLevel(targetUnit, 'magicResist');
    actualDmg = Math.max(0, actualDmg - resistLevel);
  }
  if (targetUnit.skills.includes('allResist') && !hasStrongStrike && !hasManaPierce) {
    const resistLevel = getSkillLevel(targetUnit, 'allResist');
    actualDmg = Math.max(0, actualDmg - resistLevel);
  }

  // 法术反弹（法力贯穿/魔力子弹无视反弹）
  if (dmgType === '魔法' && targetUnit.skills.includes('spellReflect') && !hasManaPierce && !attacker.skills.includes('magicBullet')) {
    addLog(state, `🔮 ${targetUnit.name} 反弹法术！`, defenderWho);
    const attackerBoard = attackerWho === 'player' ? state.player.board : state.enemy.board;
    for (const [k, u] of Object.entries(attackerBoard)) {
      if (u.uid === attacker.uid) {
        u.hp -= actualDmg;
        if (u.hp <= 0) delete attackerBoard[k];
        break;
      }
    }
    return { targetKey, amount: 0, damageType: dmgType };
  }

  // 叱吓降低攻击力（在护甲之前生效）
  const intimidateDebuff = getIntimidateDebuff(attacker, defender.board);
  if (intimidateDebuff > 0) {
    actualDmg = Math.max(0, actualDmg - intimidateDebuff);
  }

  // 护甲系统
  if (dmgType === '物理' && targetUnit.armor > 0 && !hasPierce) {
    if (targetUnit.armor >= actualDmg) {
      targetUnit.armor -= actualDmg;
      addLog(state, `🛡️ ${targetUnit.name} 护甲抵消 ${actualDmg} (${targetUnit.armor + actualDmg}→${targetUnit.armor})`, attackerWho);
      return { targetKey, amount: 0, damageType: dmgType, isBlocked: true };
    } else {
      targetUnit.armor = 0;
      addLog(state, `💥 ${targetUnit.name} 护甲破碎！溢出被抵挡`, attackerWho);
      return { targetKey, amount: 0, damageType: dmgType, isArmorBreak: true };
    }
  }

  // 俯冲增伤：仅物理伤害生效
  if (attacker.skills.includes('dive') && dmgType === '物理') {
    const diveBonus = getSkillLevel(attacker, 'dive'); // 从desc解析，默认1
    actualDmg += diveBonus;
  }

  // 强化贯穿：完全无视护甲值（护甲视为0，不消耗不减伤）
  if (hasPiercePlus && dmgType === '物理' && targetUnit.armor > 0) {
    // 护甲完全无视，actualDmg 保持不变
    addLog(state, `💥 强化贯穿：无视护甲！`, attackerWho);
  }
  // 贯穿：护甲值不消耗，仅作为减伤参考，溢出伤害正常扣血
  else if (hasPierce && targetUnit.armor > 0 && dmgType === '物理') {
    const blocked = Math.min(targetUnit.armor, actualDmg);
    actualDmg -= blocked;
    // 不触发护甲破碎后的额外格挡保护
  }

  // 伏击 v1.0：受击前对攻击者造成伤害，若击杀则取消攻击
  if (targetUnit.skills.includes('ambush') && !targetUnit.silenceTurns) {
    const ambushDmg = getSkillLevel(targetUnit, 'ambush');
    const attackerBoard = attackerWho === 'player' ? state.player.board : state.enemy.board;
    for (const [key, u] of Object.entries(attackerBoard)) {
      if (u.uid === attacker.uid) {
        u.hp -= ambushDmg;
        addLog(state, `⚡ ${targetUnit.name} 伏击 ${attacker.name} ${ambushDmg}点！`, defenderWho);
        if (u.hp <= 0) {
          delete attackerBoard[key];
          addLog(state, `💀 ${attacker.name} 被伏击击杀，攻击取消！`, attackerWho);
          return { targetKey, amount: 0, damageType: dmgType, isDodged: true };
        }
        break;
      }
    }
  }

  // 反击 v2.0：被近战攻击命中时反击 — 走完整攻击流程
  // isCounter=true 防止无限递归（反击不触发反击）
  if (!isCounter && targetUnit.skills.includes('counter') && !targetUnit.silenceTurns && attacker.subtype === '近战' && dmgType === '物理') {
    const counterDmg = targetUnit.atk;
    // 找到攻击者在 board 中的 key
    const attackerBoard = attackerWho === 'player' ? state.player.board : state.enemy.board;
    const attackerEntry = Object.entries(attackerBoard).find(([, u]) => u.uid === attacker.uid);
    if (attackerEntry) {
      const [atkKey] = attackerEntry;
      // 走完整攻击流程：物抗、闪避、伏击、中毒、流血等全部生效
      const counterResult = applyDamage(state, atkKey as BoardKey, counterDmg, targetUnit, defenderWho, true);
      if (counterResult) {
        addLog(state, `🔄 ${targetUnit.name} 反击 ${attacker.name} ${counterResult.amount}点！`, defenderWho);
      }
    }
  }

  // 最终伤害
  targetUnit.hp -= actualDmg;
  addLog(state, `⚔️ ${attacker.name} → ${targetUnit.name} ${actualDmg}点${dmgType}伤害 (${targetUnit.hp + actualDmg}→${targetUnit.hp})`, attackerWho);

  // ====== DOT结算：先爆发（用已有层数），再附加新层数 ======
  // 1. 先撕裂（用目标已有的流血层数），再附加新流血
  if (attacker.skills.includes('tear') && targetUnit.bleed > 0) {
    const tearDmg = targetUnit.bleed;
    targetUnit.hp -= tearDmg;
    addLog(state, `🔪 撕裂！${targetUnit.name} 额外 ${tearDmg} 真实伤害`, attackerWho);
  }
  if (attacker.skills.includes('bleed')) {
    const bleedLevel = getSkillLevel(attacker, 'bleed');
    targetUnit.bleed += bleedLevel;
    addLog(state, `🩸 ${targetUnit.name} 流血+${bleedLevel}`, attackerWho);
  }

  // 2. 先毒爆（用目标已有的中毒层数），再附加新中毒
  if (attacker.skills.includes('poisonBurst') && targetUnit.poison > 0) {
    const pbDmg = targetUnit.poison;
    targetUnit.hp -= pbDmg;
    addLog(state, `💣 毒爆！${targetUnit.name} 额外 ${pbDmg} 真实伤害`, attackerWho);
    targetUnit.poison = 0;
  }
  if (attacker.skills.includes('poison')) {
    const poisonLevel = getSkillLevel(attacker, 'poison');
    targetUnit.poison += poisonLevel;
    addLog(state, `☠️ ${targetUnit.name} 中毒+${poisonLevel}`, attackerWho);
  }

  // 吸血
  if (attacker.skills.includes('lifesteal') && actualDmg > 0) {
    const healer = attackerWho === 'player' ? state.player : state.enemy;
    healer.hp = Math.min(healer.hp + actualDmg, healer.maxHp);
    addLog(state, `💚 吸血：恢复 ${actualDmg} 生命`, attackerWho);
  }

  // 击杀检查
  if (targetUnit.hp <= 0) {
    addLog(state, `💀 ${targetUnit.name} 阵亡！`, defenderWho);

    // 萃取：击杀后获得金币
    if (attacker.skills.includes('extract')) {
      const extractPower = getSkillLevel(attacker, 'extract'); // 从desc解析，默认2
      const healer = attackerWho === 'player' ? state.player : state.enemy;
      healer.gold = Math.min(healer.gold + extractPower, 99);
      addLog(state, `💰 萃取 +${extractPower}金币`, attackerWho);
    }

    // 悬赏
    if (targetUnit.skills.includes('bounty')) {
      const killerBoard = attackerWho === 'player' ? state.enemy : state.player;
      killerBoard.gold = Math.min(killerBoard.gold + 1, 99);
      addLog(state, `💰 悬赏：击杀方+1金币`, attackerWho);
    }

    // 复仇
    for (const ally of Object.values(defender.board)) {
      if (ally.skills.includes('revenge') && ally.uid !== targetUnit.uid) {
        addLog(state, `😠 ${ally.name} 复仇攻击！`, defenderWho);
        const revTarget = pickAutoTarget(state, ally, defenderWho);
        if (revTarget) {
          const bonus = getAttackBonus(ally, defender);
          applyDamage(state, revTarget.key, ally.atk + bonus, ally, defenderWho);
        }
      }
    }

    delete defender.board[targetKey];
  }

  checkGameOver(state);
  return { targetKey, amount: actualDmg, damageType: dmgType };
}

// ======== 计算单位攻击加成（战术指挥/射击指挥）========
function getUnitAttackBonus(unit: Unit, owner: PlayerState): number {
  let bonus = 0;
  const unitSubtype = unit.subtype as string;
  for (const u of Object.values(owner.board)) {
    if (u.skills.includes('tacticCmd') && unitSubtype === '近战') {
      bonus += getSkillLevel(u, 'tacticCmd');
    }
    if (u.skills.includes('shootCmd') && unitSubtype === '弓箭') {
      bonus += getSkillLevel(u, 'shootCmd');
    }
  }
  // 中毒时战术指挥/射击指挥失效
  if (unit.poison > 0) bonus = 0;
  return bonus;
}

// 计算敌方叱吓对我方单位的攻击力降低值
// 叱吓：敌方战场上有叱吓单位时，我方近战/弓箭/狙击单位攻击力降低
export function getIntimidateDebuff(unit: Unit, enemyBoard: Record<string, Unit>): number {
  const unitSubtype = unit.subtype as string;
  // 叱吓只对物理攻击单位生效（近战、弓箭、狙击）
  if (unitSubtype !== '近战' && unitSubtype !== '弓箭' && unitSubtype !== '狙击') return 0;
  let debuff = 0;
  for (const u of Object.values(enemyBoard)) {
    if (u.skills.includes('intimidate')) {
      const level = getSkillLevel(u, 'intimidate');
      debuff += level;
    }
  }
  return debuff;
}

function getAttackBonus(unit: Unit, owner: PlayerState): number {
  let bonus = 0;
  // 战术指挥/射击指挥：从提供光环的单位的desc中解析等级
  for (const u of Object.values(owner.board)) {
    if (u.skills.includes('tacticCmd') && unit.subtype === '近战') {
      bonus += getSkillLevel(u, 'tacticCmd');
    }
    if (u.skills.includes('shootCmd') && unit.subtype === '弓箭') {
      bonus += getSkillLevel(u, 'shootCmd');
    }
  }
  // 增益
  for (const buff of unit.buffs) {
    if (buff.type === 'atk') bonus += buff.value;
  }
  return bonus;
}

export function checkGameOver(state: GameState): void {
  if (state.gameOver) return;
  if (state.player.hp <= 0) {
    state.gameOver = true;
    state.winner = 'enemy';
    state.phase = 'game_over';
    addLog(state, '💀 玩家总部被摧毁！失败！', 'system');
  } else if (state.enemy.hp <= 0) {
    state.gameOver = true;
    state.winner = 'player';
    state.phase = 'game_over';
    addLog(state, '🎉 敌方总部被摧毁！胜利！', 'system');
  }
}

// ======== 部署单位 ========
function swapBoardUnits(board: Record<BoardKey, Unit>, k1: BoardKey, k2: BoardKey): void {
  const temp = board[k1];
  board[k1] = board[k2];
  board[k2] = temp;
}

function pickRandomSwapPair(entries: [BoardKey, Unit][]): [BoardKey, BoardKey] | null {
  if (entries.length < 2) return null;
  const idx1 = Math.floor(rng() * entries.length);
  let idx2 = Math.floor(rng() * entries.length);
  while (idx2 === idx1) idx2 = Math.floor(rng() * entries.length);
  return [entries[idx1][0], entries[idx2][0]];
}

/** 联机：干扰生效时随机化狙击目标（仅发送方调用） */
export function resolveSnipeTargetWithJamming(state: GameState, chosenKey: BoardKey): BoardKey {
  const jamming = Object.values(state.enemy.board).some(u => u.skills.includes('jamming'));
  if (!jamming || state.sniperQueue.length === 0) return chosenKey;
  const targets = getTargetsInRange(state, state.sniperQueue[0], 'player');
  if (targets.length === 0) return chosenKey;
  addLog(state, '📡 敌方干扰生效！狙击目标随机化', 'system');
  return targets[Math.floor(rng() * targets.length)].key;
}

export function deployUnit(state: GameState, cardIdx: number, row: number, col: number, who: PlayerType): boolean {
  return deployUnitWithSync(state, cardIdx, row, col, who).success;
}

/** 疾行：本回合移动相邻一格（每单位每回合一次） */
export function moveAgileUnit(
  state: GameState,
  fromKey: BoardKey,
  toKey: BoardKey,
  who: PlayerType,
): boolean {
  if (state.gameOver) return false;
  const p = who === 'player' ? state.player : state.enemy;
  const unit = p.board[fromKey];
  if (!unit || !unit.skills.includes('agile') || unit.agileUsed) return false;
  if (p.board[toKey]) return false;

  const { row: fr, col: fc } = parseKey(fromKey);
  const { row: tr, col: tc } = parseKey(toKey);
  const validRows = who === 'player' ? [2, 3] : [0, 1];
  if (!validRows.includes(fr) || !validRows.includes(tr)) return false;
  if ((who === 'player' && tr === 3 && tc === 1) || (who === 'enemy' && tr === 0 && tc === 1)) return false;
  if (Math.abs(fr - tr) + Math.abs(fc - tc) !== 1) return false;

  delete p.board[fromKey];
  p.board[toKey] = unit;
  unit.agileUsed = true;
  addLog(state, `🏃 ${unit.name} 疾行移动`, who);
  checkGameOver(state);
  return true;
}

export function deployUnitWithSync(state: GameState, cardIdx: number, row: number, col: number, who: PlayerType): DeployResult {
  const sync: DeploySyncData = {};
  const p = who === 'player' ? state.player : state.enemy;
  const card = p.hand[cardIdx];
  if (!card || card.type !== '士兵') return { success: false };

  let cost = card.cost;
  if (who === 'player' && p.discountNext > 0) {
    cost = Math.max(0, cost - p.discountNext);
    p.discountNext = 0;
  }

  if (p.spellOnlyNextTurn) {
    addLog(state, '❌ 混乱风暴：本回合只能打出法术卡，无法部署士兵', who);
    return { success: false };
  }

  if (p.gold < cost) {
    addLog(state, '❌ 金币不足', 'system');
    return { success: false };
  }

  // 检查位置
  if (row !== 2 && row !== 3 && who === 'player') return { success: false };
  if (row !== 0 && row !== 1 && who === 'enemy') return { success: false };
  if ((row === 3 && col === 1) || (row === 0 && col === 1)) return { success: false };

  const key = posKey(row, col);

  p.gold -= cost;
  if (who === 'player') {
    p.hand.splice(cardIdx, 1);
    state.selectedCardIdx = null;
  } else {
    const idx = p.hand.indexOf(card);
    if (idx >= 0) p.hand.splice(idx, 1);
  }

  const unit = cardToUnit(card);

  // 挤掉旧单位
  if (p.board[key]) {
    addLog(state, `🔄 ${p.board[key].name} 被挤掉`, who);
    delete p.board[key];
  }

  p.board[key] = unit;
  const loc = row === 2 || row === 1 ? '前线' : '底线';
  const cols = ['左', '中', '右'];
  addLog(state, `📍 部署 ${unit.name} → ${loc}${cols[col]}`, who);

  applyDeployUnitPassives(state, unit, who);

  // 闪击：部署时立即攻击1次（走完整攻击流程）
  if (unit.skills.includes('flashStrike') && !unit.flashStrikeUsed) {
    unit.flashStrikeUsed = true;
    addLog(state, `⚡ ${unit.name} 闪击！`, who);
    const flashTarget = pickAutoTarget(state, unit, who);
    if (flashTarget) {
      const bonusAtk = getUnitAttackBonus(unit, p);
      const evt = applyDamage(state, flashTarget.key, unit.atk + bonusAtk, unit, who);
      if (evt) {
        sync.flashStrike = {
          toKey: evt.targetKey,
          amount: evt.amount,
          dodged: evt.isDodged,
          blocked: evt.isBlocked,
        };
      }
    }
  }

  // 法力增幅：一次性，含自己，持续到敌方回合结束
  if (unit.skills.includes('magicBoost') && !unit.magicBoostUsed) {
    const boostCount = getSkillLevel(unit, 'magicBoost'); // 从desc解析，默认1
    for (const u of Object.values(p.board)) {
      if (isMagicUnitSubtype(u.subtype)) { // ✅ 包含自己
        u.atk += boostCount;
        u.buffs.push({ type: 'atk', value: boostCount, source: unit.name, removeOn: 'enemy_turn_start' });
      }
    }
    unit.magicBoostUsed = true; // ✅ 一次性标记
    addLog(state, `✨ 法力增幅：魔法友军+${boostCount}攻（持续到敌方回合结束）`, who);
  }

  // 魔术（传送门、幻术大师等单位部署时触发）
  if (unit.skills.includes('magicSwap')) {
    const enemyBoard = who === 'player' ? state.enemy.board : state.player.board;
    const enemyUnits = Object.entries(enemyBoard).filter(([k]) => {
      const { row, col } = parseKey(k);
      return !((row === 0 || row === 3) && col === 1);
    }) as [BoardKey, Unit][];
    const pair = pickRandomSwapPair(enemyUnits);
    if (pair) {
      const [k1, k2] = pair;
      const u1 = enemyBoard[k1];
      const u2 = enemyBoard[k2];
      swapBoardUnits(enemyBoard, k1, k2);
      sync.swapTargets = pair;
      addLog(state, `🪄 ${unit.name}：交换了 ${u1.name} 和 ${u2.name} 的位置`, who);
    }
  }

  // 护甲技能：部署时根据技能等级设置护甲值
  if (unit.skills.includes('armor')) {
    const armorLevel = getSkillLevel(unit, 'armor') || 1;
    unit.armor = armorLevel;
    unit.baseArmor = armorLevel;
    addLog(state, `🛡️ ${unit.name} 获得${armorLevel}点护甲`, who);
  }

  // 部署时抽牌（奥术元素、魔力源泉、均衡法师等）
  if (unit.skills.includes('drawCard')) {
    const drawMatch = unit.desc.match(/抽取(\d+)/);
    const drawCount = drawMatch ? parseInt(drawMatch[1], 10) : 1;
    for (let i = 0; i < drawCount; i++) drawCardRaw(p);
    addLog(state, `📥 ${unit.name}：抽取${drawCount}张`, who);
  }

  checkGameOver(state);
  const hasSync = sync.swapTargets || sync.flashStrike;
  return { success: true, sync: hasSync ? sync : undefined };
}

// ======== 镜像敌方部署（联机同步用）========
export function mirrorEnemyDeploy(
  state: GameState,
  card: CardDef,
  row: number,
  col: number,
  sync?: DeploySyncData,
): boolean {
  if (card.type !== '士兵') return false;
  if (row !== 0 && row !== 1) return false;
  if (row === 0 && col === 1) return false;

  const key = posKey(row, col);
  const p = state.enemy;
  const unit = cardToUnit(card);

  if (p.board[key]) {
    addLog(state, `🔄 ${p.board[key].name} 被挤掉`, 'enemy');
    delete p.board[key];
  }

  p.board[key] = unit;
  const loc = row === 1 ? '前线' : '底线';
  const cols = ['左', '中', '右'];
  addLog(state, `📍 [联机] 敌方部署 ${unit.name} → ${loc}${cols[col]}`, 'enemy');

  applyDeployUnitPassives(state, unit, 'enemy');

  if (unit.skills.includes('flashStrike') && !unit.flashStrikeUsed) {
    unit.flashStrikeUsed = true;
    addLog(state, `⚡ ${unit.name} 闪击！`, 'enemy');
    if (sync?.flashStrike) {
      const toKey = flipTargetKey(sync.flashStrike.toKey);
      if (!sync.flashStrike.dodged && !sync.flashStrike.blocked && sync.flashStrike.amount > 0) {
        applyMirroredDamage(state, toKey, sync.flashStrike.amount, 'enemy');
      }
    } else {
      const flashTarget = pickAutoTarget(state, unit, 'enemy');
      if (flashTarget) {
        const bonusAtk = getUnitAttackBonus(unit, p);
        applyDamage(state, flashTarget.key, unit.atk + bonusAtk, unit, 'enemy');
      }
    }
  }

  if (unit.skills.includes('magicBoost') && !unit.magicBoostUsed) {
    const boostCount = getSkillLevel(unit, 'magicBoost');
    for (const u of Object.values(p.board)) {
      if (isMagicUnitSubtype(u.subtype)) {
        u.atk += boostCount;
        u.buffs.push({ type: 'atk', value: boostCount, source: unit.name, removeOn: 'enemy_turn_start' });
      }
    }
    unit.magicBoostUsed = true;
    addLog(state, `✨ 法力增幅：魔法友军+${boostCount}攻（持续到敌方回合结束）`, 'enemy');
  }

  if (sync?.swapTargets) {
    const [k1, k2] = [flipTargetKey(sync.swapTargets[0]), flipTargetKey(sync.swapTargets[1])];
    const u1 = state.player.board[k1];
    const u2 = state.player.board[k2];
    if (u1 && u2) {
      swapBoardUnits(state.player.board, k1, k2);
      addLog(state, `🪄 ${unit.name}：交换了 ${u1.name} 和 ${u2.name} 的位置`, 'enemy');
    }
  } else if (unit.skills.includes('magicSwap')) {
    const playerUnits = Object.entries(state.player.board).filter(([k]) => {
      const { row: r, col: c } = parseKey(k);
      return !(r === 3 && c === 1);
    }) as [BoardKey, Unit][];
    const pair = pickRandomSwapPair(playerUnits);
    if (pair) {
      const [k1, k2] = pair;
      swapBoardUnits(state.player.board, k1, k2);
      addLog(state, `🪄 ${unit.name}：交换了 ${state.player.board[k2].name} 和 ${state.player.board[k1].name} 的位置`, 'enemy');
    }
  }

  if (unit.skills.includes('armor')) {
    const armorLevel = getSkillLevel(unit, 'armor') || 1;
    unit.armor = armorLevel;
    unit.baseArmor = armorLevel;
    addLog(state, `🛡️ ${unit.name} 获得${armorLevel}点护甲`, 'enemy');
  }

  checkGameOver(state);
  return true;
}

/** 联机镜像：按发送方结果直接扣血，避免闪避等随机重掷导致分叉 */
export function applyMirroredDamage(
  state: GameState,
  targetKey: BoardKey,
  amount: number,
  attackerWho: PlayerType,
): void {
  if (state.gameOver || amount <= 0) return;
  const defenderWho: PlayerType = attackerWho === 'player' ? 'enemy' : 'player';
  const defender = defenderWho === 'player' ? state.player : state.enemy;
  const { row, col } = parseKey(targetKey);
  if ((defenderWho === 'enemy' && row === 0 && col === 1) || (defenderWho === 'player' && row === 3 && col === 1)) {
    defender.hp = Math.max(0, defender.hp - amount);
    checkGameOver(state);
    return;
  }
  const unit = defender.board[targetKey];
  if (!unit) return;
  unit.hp -= amount;
  if (unit.hp <= 0) delete defender.board[targetKey];
  checkGameOver(state);
}

// ======== 镜像敌方单次攻击（联机实时同步）========
/** remoteFrom/remoteTo 为发送方视角：己方单位格 → 对方单位格 */
export function mirrorEnemyAttack(
  state: GameState,
  remoteFromKey: BoardKey,
  remoteToKey: BoardKey,
  result?: { amount?: number; dodged?: boolean; blocked?: boolean },
): void {
  if (state.gameOver) return;
  const fromKey = flipTargetKey(remoteFromKey);
  const toKey = flipTargetKey(remoteToKey);
  const unit = state.enemy.board[fromKey];
  if (!unit || unit.subtype === '狙击') return;

  state.attackingUnit = fromKey;
  if (result?.dodged || (result?.blocked && (result.amount ?? 0) === 0)) {
    state.attackingUnit = null;
    return;
  }
  if (result?.amount !== undefined && result.amount > 0) {
    applyMirroredDamage(state, toKey, result.amount, 'enemy');
  } else {
    const bonusAtk = getUnitAttackBonus(unit, state.enemy);
    applyDamage(state, toKey, unit.atk + bonusAtk, unit, 'enemy');
  }
  state.attackingUnit = null;
  checkGameOver(state);
}

// 坐标翻转：联机同步用（对方视角的坐标 → 我方视角的坐标）
// 规则：row 0↔3, row 1↔2, col 不变
function flipTargetKey(key: BoardKey): BoardKey {
  const { row, col } = parseKey(key);
  return posKey(3 - row, col);
}

// ======== 镜像敌方法术（联机同步用）========
// 在对手视角执行敌方使用的法术（who='enemy' 表示对方在用，影响我方 player 状态）
export function mirrorEnemySpell(
  state: GameState,
  card: { name: string; type: string; skills: string[] },
  targetKey: BoardKey | null,
  sync?: SpellSyncData,
): void {
  const skills = card.skills;
  const player = state.player; // 被影响的是我方（player）
  const enemy = state.enemy;   // 施法者是敌方

  // 联机同步关键：翻转对方传来的 targetKey
  // 对方的 row 0,1（他的敌方）→ 我方的 row 3,2（我的己方）
  const flippedKey = targetKey ? flipTargetKey(targetKey) : null;

  if (card.name === '天火降临') {
    player.hp -= 12;
    addLog(state, `🔥 天火降临 → 总部 12点魔法伤害`, 'enemy');
    checkGameOver(state);
  }

  if (card.name === '混乱风暴') {
    damageAllFieldUnits(state, 1, card.name, 'enemy');
    player.spellOnlyNextTurn = true;
    addLog(state, `🌪️ 混乱风暴：我方下回合只能打出法术卡`, 'enemy');
  }

  // 魔法伤害
  if (skills.includes('magicDmg') && card.name !== '混乱风暴' && card.name !== '天火降临') {
    let dmg = 2;
    if (card.name === '法力风暴') dmg = 6;
    if (flippedKey) {
      const { row, col } = parseKey(flippedKey);
      if (row === 3 && col === 1) {
        // 打我方 HQ（从敌方视角看 HQ 在 0-1，翻转后是 3-1）
        player.hp -= dmg;
        addLog(state, `💥 ${card.name} → 总部 ${dmg}点魔法伤害`, 'enemy');
      } else {
        const u = player.board[flippedKey];
        if (u) {
          if (u.skills.includes('immune')) {
            addLog(state, `🛡️ ${u.name} 免疫法术！`, 'player');
          } else {
            let actual = dmg;
            if (u.skills.includes('magicResist')) actual = Math.max(0, actual - getSkillLevel(u, 'magicResist'));
            if (u.skills.includes('allResist')) actual = Math.max(0, actual - getSkillLevel(u, 'allResist'));
            if (!skills.includes('magicPierce') && u.skills.includes('spellReflect')) {
              addLog(state, `🔮 ${u.name} 反弹法术！`, 'player');
            } else {
              u.hp -= actual;
              addLog(state, `💥 ${card.name} → ${u.name} ${actual}点魔法伤害`, 'enemy');
              if (u.hp <= 0) {
                delete player.board[flippedKey];
                addLog(state, `💀 ${u.name} 阵亡！`, 'player');
              }
            }
          }
        }
      }
    }
  }

  // 护盾术
  if (skills.includes('shield')) {
    if (flippedKey) {
      const { row, col } = parseKey(flippedKey);
      // 敌方护盾：给他方 HQ 或单位加护甲（翻转后：row 0,1 = 敌方区域）
      if (row === 0 && col === 1) {
        enemy.hqArmor += 2;
        addLog(state, `🛡️ 护盾术 → 敌方 HQ +2护甲`, 'enemy');
      } else if (row <= 1) {
        // 给敌方单位加护甲（翻转后的 flippedKey 对应敌方 board 中的位置）
        const u = enemy.board[flippedKey];
        if (u) {
          u.armor += 2;
          addLog(state, `🛡️ 护盾术 → ${u.name} +2护甲`, 'enemy');
        }
      }
    }
  }

  // 集火（集火令：对目标额外造成1点伤害）
  if (skills.includes('focusFire')) {
    enemy.focusTarget = flippedKey;
    addLog(state, `🎯 集火目标已标记！`, 'enemy');
    // 集火令对目标造成1点伤害（翻转后的 flippedKey 指向我方单位）
    if (flippedKey) {
      const { row, col } = parseKey(flippedKey);
      if (row === 3 && col === 1) {
        player.hp -= 1;
        addLog(state, `🎯 集火令对总部造成1点伤害`, 'enemy');
      } else {
        const u = player.board[flippedKey];
        if (u) {
          u.hp -= 1;
          addLog(state, `🎯 集火令对${u.name}造成1点伤害`, 'enemy');
          if (u.hp <= 0) {
            delete player.board[flippedKey];
            addLog(state, `💀 ${u.name} 被集火令击杀！`, 'player');
          }
        }
      }
    }
  }

  // 毒针伤害处理（联机同步）
  if (skills.includes('magicDmg') && card.name === '毒针') {
    let dmg = 1;
    // 毒针：目标已受伤则伤害+1
    if (flippedKey) {
      const { row, col } = parseKey(flippedKey);
      if (row === 3 && col === 1) {
        if (player.hp < player.maxHp) dmg += 1;
        player.hp -= dmg;
        addLog(state, `💥 ${card.name} → 总部 ${dmg}点魔法伤害`, 'enemy');
      } else {
        const u = player.board[flippedKey];
        if (u) {
          if (u.skills.includes('immune')) {
            addLog(state, `🛡️ ${u.name} 免疫法术！`, 'player');
          } else {
            if (u.hp < u.maxHp) dmg += 1; // 已受伤+1
            let actual = dmg;
            if (u.skills.includes('magicResist')) actual = Math.max(0, actual - getSkillLevel(u, 'magicResist'));
            if (u.skills.includes('allResist')) actual = Math.max(0, actual - getSkillLevel(u, 'allResist'));
            if (!skills.includes('magicPierce') && u.skills.includes('spellReflect')) {
              addLog(state, `🔮 ${u.name} 反弹法术！`, 'player');
            } else {
              u.hp -= actual;
              addLog(state, `💥 ${card.name} → ${u.name} ${actual}点魔法伤害`, 'enemy');
              if (u.hp <= 0) {
                delete player.board[flippedKey];
                addLog(state, `💀 ${u.name} 阵亡！`, 'player');
              }
            }
          }
        }
      }
    }
  }

  // 均衡
  if (skills.includes('balance')) {
    const eqLevel = getSkillLevelFromCard(card, 'balance'); // ✅ 从desc解析，默认4
    for (const h of enemy.hand) {
      if (h.type === '士兵') h.cost = eqLevel;
    }
    addLog(state, `⚖️ 均衡${eqLevel}：敌方手牌士兵费用已调整`, 'enemy');
  }

  // 抽卡（联机同步：敌方抽卡）
  if (skills.includes('drawCard')) {
    executeDrawCardSpell(state, card, enemy, player, 'enemy');
  }

  // 治疗总部（联机同步：敌方治疗其HQ）
  if (skills.includes('healHQ')) {
    const healAmount = 3;
    const oldHp = enemy.hp;
    enemy.hp = Math.min(enemy.hp + healAmount, enemy.maxHp);
    addLog(state, `💚 ${card.name}：敌方HQ恢复${enemy.hp - oldHp}点生命`, 'enemy');
  }

  // 对手弃牌（联机同步：我方被弃牌）
  if (skills.includes('discard')) {
    if (player.hand.length > 0) {
      const discardIdx = sync?.discardIdx !== undefined && sync.discardIdx < player.hand.length
        ? sync.discardIdx
        : Math.floor(rng() * player.hand.length);
      const discarded = player.hand[discardIdx];
      player.hand.splice(discardIdx, 1);
      addLog(state, `🗑️ ${card.name}：我方弃掉【${discarded.name}】`, 'enemy');
    } else {
      addLog(state, `🗑️ ${card.name}：我方没有手牌`, 'enemy');
    }
  }

  // 消灭（末日审判）—— 不能对总部使用
  if (skills.includes('destroy')) {
    if (flippedKey) {
      const u = player.board[flippedKey];
      if (u) {
        if (u.skills.includes('immune')) {
          addLog(state, `🛡️ ${u.name} 免疫末日审判！`, 'player');
        } else {
          addLog(state, `☠️ 末日审判 → ${u.name} 被消灭！`, 'enemy');
          delete player.board[flippedKey];
        }
      }
    }
  }

  // 刷新增幅（被沉默的单位无法触发）
  if (skills.includes('refreshBoost')) {
    let boostedCount = 0;
    for (const u of Object.values(enemy.board)) {
      if (u.skills.includes('magicBoost') && !u.magicBoostUsed && !u.silenceTurns) {
        const boostCount = getSkillLevel(u, 'magicBoost') || 1;
        for (const ally of Object.values(enemy.board)) {
          if (isMagicUnitSubtype(ally.subtype)) {
            ally.atk += boostCount;
            ally.buffs.push({ type: 'atk', value: boostCount, source: u.name + '(刷新)', removeOn: 'enemy_turn_start' });
          }
        }
        boostedCount++;
        addLog(state, `✨ 刷新增幅：${u.name} 再次触发法力增幅+${boostCount}`, 'enemy');
      }
    }
    if (boostedCount === 0) {
      addLog(state, `✨ 刷新增幅：场上没有可刷新的增幅单位`, 'enemy');
    }
  }

  // 净化沉默
  if (skills.includes('cleanseSilence')) {
    let cleansedCount = 0;
    for (const u of Object.values(enemy.board)) {
      if (u.silenceTurns > 0) {
        u.silenceTurns = 0;
        cleansedCount++;
      }
    }
    addLog(state, `🌟 净化沉默：${cleansedCount}个单位沉默被移除`, 'enemy');
  }

  // 荒野呼唤：对指定单位使用撕裂+毒爆（翻转后指向我方单位）
  if (skills.includes('tear') && skills.includes('poisonBurst') && card.name === '荒野呼唤') {
    if (flippedKey) {
      const u = player.board[flippedKey];
      if (u) {
        if (u.bleed > 0) {
          const tearDmg = u.bleed;
          u.hp -= tearDmg;
          addLog(state, `🔪 荒野呼唤·撕裂！${u.name} 受到 ${tearDmg} 真实伤害`, 'enemy');
        }
        if (u.poison > 0) {
          const pbDmg = u.poison;
          u.hp -= pbDmg;
          addLog(state, `💣 荒野呼唤·毒爆！${u.name} 受到 ${pbDmg} 真实伤害`, 'enemy');
          u.poison = 0;
        }
        if (u.hp <= 0) {
          delete player.board[flippedKey];
          addLog(state, `💀 ${u.name} 被荒野呼唤消灭！`, 'player');
        }
      }
    }
  }

  // 疾风步 / 魔术换位（联机同步）
  if (skills.includes('magicSwap') && sync?.swapTargets) {
    const [k1, k2] = [flipTargetKey(sync.swapTargets[0]), flipTargetKey(sync.swapTargets[1])];
    const u1 = player.board[k1];
    const u2 = player.board[k2];
    if (u1 && u2) {
      swapBoardUnits(player.board, k1, k2);
      addLog(state, `🪄 ${card.name}：${u1.name} 与 ${u2.name} 交换位置`, 'enemy');
    }
  } else if (skills.includes('magicSwap') && card.name === '疾风步') {
    if (flippedKey) {
      const targetUnit = player.board[flippedKey];
      if (targetUnit) {
        const otherUnits = Object.entries(player.board).filter(([k]) => k !== flippedKey) as [BoardKey, Unit][];
        const pair = pickRandomSwapPair(otherUnits.length >= 1
          ? otherUnits.map(([k, u]) => [k, u] as [BoardKey, Unit]).concat([[flippedKey, targetUnit]])
          : []);
        if (pair) {
          swapBoardUnits(player.board, pair[0], pair[1]);
          addLog(state, `🪄 疾风步：交换位置`, 'enemy');
        }
      }
    }
  } else if (skills.includes('magicSwap') && card.name !== '疾风步' && card.name !== '幻术大师' && card.name !== '传送门') {
    const playerUnits = Object.entries(player.board).filter(([k]) => {
      const { row, col } = parseKey(k);
      return !(row === 3 && col === 1);
    }) as [BoardKey, Unit][];
    const pair = pickRandomSwapPair(playerUnits);
    if (pair) {
      const [k1, k2] = pair;
      swapBoardUnits(player.board, k1, k2);
      addLog(state, `🎭 ${card.name}：交换了 ${player.board[k2].name} 和 ${player.board[k1].name} 的位置！`, 'enemy');
    }
  }

  // 治疗X（敌方视角：治疗敌方单位，flippedKey 指向敌方 board 中的位置）
  if (skills.includes('heal')) {
    const healAmount = getSkillLevelFromCard(card, 'heal') || 2;
    if (flippedKey) {
      const u = enemy.board[flippedKey];
      if (u) {
        const oldHp = u.hp;
        u.hp = Math.min(u.hp + healAmount, u.maxHp);
        addLog(state, `💚 治疗${healAmount} → ${u.name} 恢复${u.hp - oldHp}点生命`, 'enemy');
        if (u.skills.includes('growth')) {
          const growthLevel = getSkillLevel(u, 'growth') || 1;
          u.atk += growthLevel; u.maxHp += growthLevel; u.hp += growthLevel;
          addLog(state, `🌱 生长${growthLevel}：${u.name} +${growthLevel}/+${growthLevel}`, 'enemy');
        }
      }
    }
  }

  // 群体治疗X（敌方视角）
  if (skills.includes('aoeHeal')) {
    const healAmount = getSkillLevelFromCard(card, 'aoeHeal') || 2;
    const oldHqHp = enemy.hp;
    enemy.hp = Math.min(enemy.hp + healAmount, enemy.maxHp);
    if (enemy.hp > oldHqHp) addLog(state, `💚 群体治疗${healAmount} → 敌方HQ 恢复${enemy.hp - oldHqHp}点生命`, 'enemy');
    for (const [, u] of Object.entries(enemy.board)) {
      const oldHp = u.hp;
      u.hp = Math.min(u.hp + healAmount, u.maxHp);
      if (u.hp > oldHp) {
        addLog(state, `💚 群体治疗${healAmount} → ${u.name} 恢复${u.hp - oldHp}点生命`, 'enemy');
        if (u.skills.includes('growth')) {
          const growthLevel = getSkillLevel(u, 'growth') || 1;
          u.atk += growthLevel; u.maxHp += growthLevel; u.hp += growthLevel;
          addLog(state, `🌱 生长${growthLevel}：${u.name} +${growthLevel}/+${growthLevel}`, 'enemy');
        }
      }
    }
  }

  checkGameOver(state);
}

// ======== 使用法术 ========
export function castSpell(state: GameState, cardIdx: number, targetKey: BoardKey | null, who: PlayerType): boolean {
  return castSpellWithSync(state, cardIdx, targetKey, who).success;
}

export function castSpellWithSync(state: GameState, cardIdx: number, targetKey: BoardKey | null, who: PlayerType): CastSpellResult {
  const sync: SpellSyncData = {};
  const p = who === 'player' ? state.player : state.enemy;
  const card = p.hand[cardIdx];
  if (!card || card.type !== '法术') return { success: false };

  if (p.gold < card.cost) {
    addLog(state, '❌ 金币不足', 'system');
    return { success: false };
  }

  p.gold -= card.cost;

  if (who === 'player') {
    p.hand.splice(cardIdx, 1);
    state.selectedCardIdx = null;
  } else {
    const idx = p.hand.indexOf(card);
    if (idx >= 0) p.hand.splice(idx, 1);
  }

  const skills = card.skills;
  const enemy = who === 'player' ? state.enemy : state.player;
  const self = p;

  // 天火降临：直接对敌方总部 12 点魔法伤害
  if (card.name === '天火降临') {
    enemy.hp -= 12;
    addLog(state, `🔥 天火降临 → 总部 12点魔法伤害`, who);
    checkGameOver(state);
  }

  // 混乱风暴：全场单位 1 伤 + 敌方下回合禁部署
  if (card.name === '混乱风暴') {
    damageAllFieldUnits(state, 1, card.name, who);
    enemy.spellOnlyNextTurn = true;
    addLog(state, `🌪️ 混乱风暴：敌方下回合只能打出法术卡`, who);
  }

  // 魔法伤害（单目标法术，混乱风暴/天火已在上方单独处理）
  if (skills.includes('magicDmg') && card.name !== '混乱风暴' && card.name !== '天火降临') {
    let dmg = 2;
    if (card.name === '法力风暴') dmg = 6;
    if (card.name === '毒针') {
      dmg = 1;
      // 毒针：目标已受伤（hp < maxHp）则伤害+1
      if (targetKey) {
        const { row, col } = parseKey(targetKey);
        if (row === 0 && col === 1) {
          // 打HQ，HQ血量<maxHp算已受伤
          if (enemy.hp < enemy.maxHp) dmg += 1;
        } else {
          const u = enemy.board[targetKey];
          if (u && u.hp < u.maxHp) dmg += 1;
        }
      }
    }
    if (targetKey) {
      const { row, col } = parseKey(targetKey);
      if (row === 0 && col === 1) {
        enemy.hp -= dmg;
        addLog(state, `💥 ${card.name} → 总部 ${dmg}点魔法伤害`, who);
      } else {
        const u = enemy.board[targetKey];
        if (u) {
          let actual = dmg;
          if (u.skills.includes('magicResist')) actual = Math.max(0, actual - getSkillLevel(u, 'magicResist'));
          if (u.skills.includes('allResist')) actual = Math.max(0, actual - getSkillLevel(u, 'allResist'));
          if (!skills.includes('magicPierce') && u.skills.includes('spellReflect')) {
            addLog(state, `🔮 ${u.name} 反弹法术！`, who === 'player' ? 'enemy' : 'player');
          } else {
            u.hp -= actual;
            addLog(state, `💥 ${card.name} → ${u.name} ${actual}点魔法伤害`, who);
            if (u.hp <= 0) {
              delete enemy.board[targetKey];
              addLog(state, `💀 ${u.name} 阵亡！`, who === 'player' ? 'enemy' : 'player');
            }
          }
        }
      }
    }
  }

  // 护盾术
  if (skills.includes('shield')) {
    if (targetKey) {
      const { row, col } = parseKey(targetKey);
      if ((who === 'player' && row === 3 && col === 1) || (who === 'enemy' && row === 0 && col === 1)) {
        self.hqArmor += 2;
        addLog(state, `🛡️ 护盾术 → HQ +2护甲`, who);
      } else {
        const u = self.board[targetKey];
        if (u) {
          u.armor += 2;
          addLog(state, `🛡️ 护盾术 → ${u.name} +2护甲`, who);
        }
      }
    }
  }

  // 集火
  if (skills.includes('focusFire')) {
    self.focusTarget = targetKey;
    addLog(state, `🎯 集火目标已标记！`, who);
  }

  // 均衡
  if (skills.includes('balance')) {
    const eqLevel = getSkillLevelFromCard(card, 'balance'); // ✅ 从desc解析，默认4
    for (const h of self.hand) {
      if (h.type === '士兵') h.cost = eqLevel;
    }
    addLog(state, `⚖️ 均衡${eqLevel}：手牌士兵费用已调整`, who);
  }

  // 魔术（HQ不能被转移）
  if (skills.includes('magicSwap')) {
    const enemyUnits = Object.entries(enemy.board).filter(([k]) => {
      const { row, col } = parseKey(k);
      return !((row === 0 || row === 3) && col === 1);
    }) as [BoardKey, Unit][];
    if (card.name === '疾风步' && targetKey) {
      const targetUnit = enemy.board[targetKey];
      if (targetUnit) {
        const otherUnits = Object.entries(enemy.board).filter(([k]) => k !== targetKey) as [BoardKey, Unit][];
        if (otherUnits.length >= 1) {
          const randomIdx = Math.floor(rng() * otherUnits.length);
          const [otherKey, otherUnit] = otherUnits[randomIdx];
          enemy.board[targetKey] = otherUnit;
          enemy.board[otherKey] = targetUnit;
          sync.swapTargets = [targetKey, otherKey];
          addLog(state, `🪄 疾风步：${targetUnit.name} 与 ${otherUnit.name} 交换位置`, who);
        }
      }
    } else {
      const pair = pickRandomSwapPair(enemyUnits);
      if (pair) {
        const [k1, k2] = pair;
        const u1 = enemy.board[k1];
        const u2 = enemy.board[k2];
        swapBoardUnits(enemy.board, k1, k2);
        sync.swapTargets = pair;
        addLog(state, `🪄 魔术：交换了 ${u1.name} 和 ${u2.name} 的位置`, who);
      }
    }
  }

  // 迷雾
  if (skills.includes('fog')) {
    addLog(state, `🌫️ 迷雾：隐藏己方单位信息（视觉效果）`, who);
  }

  // 沉默
  if (skills.includes('silence')) {
    const silenceLevel = getSkillLevelFromCard(card, 'silence');
    for (const u of Object.values(enemy.board)) {
      u.silenceTurns = Math.max(u.silenceTurns, silenceLevel);
    }
    addLog(state, `🔇 沉默${silenceLevel}：敌方单位技能失效${silenceLevel}回合`, who);
  }

  // 治疗X：恢复指定目标X点生命
  if (skills.includes('heal')) {
    const healAmount = getSkillLevelFromCard(card, 'heal') || 2;
    if (targetKey) {
      const { row, col } = parseKey(targetKey);
      // HQ治疗
      if ((who === 'player' && row === 3 && col === 1) || (who === 'enemy' && row === 0 && col === 1)) {
        const oldHp = self.hp;
        self.hp = Math.min(self.hp + healAmount, self.maxHp);
        addLog(state, `💚 治疗${healAmount} → HQ 恢复${self.hp - oldHp}点生命 (${oldHp}→${self.hp})`, who);
      } else {
        // 单位治疗
        const u = self.board[targetKey];
        if (u) {
          const oldHp = u.hp;
          u.hp = Math.min(u.hp + healAmount, u.maxHp);
          addLog(state, `💚 治疗${healAmount} → ${u.name} 恢复${u.hp - oldHp}点生命 (${oldHp}→${u.hp})`, who);
          // 生长：受治疗后+X/+X
          if (u.skills.includes('growth')) {
            const growthLevel = getSkillLevel(u, 'growth') || 1;
            u.atk += growthLevel;
            u.maxHp += growthLevel;
            u.hp += growthLevel;
            addLog(state, `🌱 生长${growthLevel}：${u.name} +${growthLevel}/+${growthLevel}（受治疗后）`, who);
          }
        }
      }
    }
  }

  // 群体治疗X：恢复所有友军X点生命
  if (skills.includes('aoeHeal')) {
    const healAmount = getSkillLevelFromCard(card, 'aoeHeal') || 2;
    // 治疗HQ
    const oldHqHp = self.hp;
    self.hp = Math.min(self.hp + healAmount, self.maxHp);
    if (self.hp > oldHqHp) {
      addLog(state, `💚 群体治疗${healAmount} → HQ 恢复${self.hp - oldHqHp}点生命`, who);
    }
    // 治疗所有友方单位
    for (const [, u] of Object.entries(self.board)) {
      const oldHp = u.hp;
      u.hp = Math.min(u.hp + healAmount, u.maxHp);
      if (u.hp > oldHp) {
        addLog(state, `💚 群体治疗${healAmount} → ${u.name} 恢复${u.hp - oldHp}点生命 (${oldHp}→${u.hp})`, who);
        // 生长：受治疗后+X/+X
        if (u.skills.includes('growth')) {
          const growthLevel = getSkillLevel(u, 'growth') || 1;
          u.atk += growthLevel;
          u.maxHp += growthLevel;
          u.hp += growthLevel;
          addLog(state, `🌱 生长${growthLevel}：${u.name} +${growthLevel}/+${growthLevel}（受治疗后）`, who);
        }
      }
    }
  }

  // 消灭：直接消灭一个单位（末日审判）—— 不能对总部使用
  if (skills.includes('destroy')) {
    if (targetKey) {
      const u = enemy.board[targetKey];
      if (u) {
        // 免疫单位不能被法术指定
        if (u.skills.includes('immune')) {
          addLog(state, `🛡️ ${u.name} 免疫末日审判！`, who === 'player' ? 'enemy' : 'player');
        } else {
          addLog(state, `☠️ 末日审判 → ${u.name} 被消灭！`, who);
          delete enemy.board[targetKey];
        }
      }
    }
  }

  // 刷新增幅：让场上所有已有magicBoost的单位再次触发增幅（被沉默的单位无法触发）
  if (skills.includes('refreshBoost')) {
    let boostedCount = 0;
    for (const u of Object.values(self.board)) {
      if (u.skills.includes('magicBoost') && !u.magicBoostUsed && !u.silenceTurns) {
        const boostCount = getSkillLevel(u, 'magicBoost') || 1;
        for (const ally of Object.values(self.board)) {
          if (isMagicUnitSubtype(ally.subtype)) {
            ally.atk += boostCount;
            ally.buffs.push({ type: 'atk', value: boostCount, source: u.name + '(刷新)', removeOn: 'enemy_turn_start' });
          }
        }
        boostedCount++;
        addLog(state, `✨ 刷新增幅：${u.name} 再次触发法力增幅+${boostCount}`, who);
      }
    }
    if (boostedCount === 0) {
      addLog(state, `✨ 刷新增幅：场上没有可刷新的增幅单位`, who);
    }
  }

  // 净化沉默：移除所有友方单位的沉默效果
  if (skills.includes('cleanseSilence')) {
    let cleansedCount = 0;
    for (const u of Object.values(self.board)) {
      if (u.silenceTurns > 0) {
        u.silenceTurns = 0;
        cleansedCount++;
      }
    }
    addLog(state, `🌟 净化沉默：${cleansedCount}个单位沉默被移除`, who);
  }

  // 集火令：对目标额外造成1点伤害（集火效果的一部分）
  if (skills.includes('focusFire') && targetKey) {
    const { row, col } = parseKey(targetKey);
    if ((who === 'player' && row === 0 && col === 1) || (who === 'enemy' && row === 3 && col === 1)) {
      enemy.hp -= 1;
      addLog(state, `🎯 集火令对总部造成1点伤害`, who);
    } else {
      const u = enemy.board[targetKey];
      if (u) {
        u.hp -= 1;
        addLog(state, `🎯 集火令对${u.name}造成1点伤害`, who);
        if (u.hp <= 0) {
          delete enemy.board[targetKey];
          addLog(state, `💀 ${u.name} 被集火令击杀！`, who === 'player' ? 'enemy' : 'player');
        }
      }
    }
  }

  // 抽卡
  if (skills.includes('drawCard')) {
    executeDrawCardSpell(state, card, self, enemy, who);
  }

  // 治疗总部
  if (skills.includes('healHQ')) {
    const healAmount = 3;
    const oldHp = self.hp;
    self.hp = Math.min(self.hp + healAmount, self.maxHp);
    addLog(state, `💚 ${card.name}：总部恢复${self.hp - oldHp}点生命`, who);
  }

  // 对手弃牌：随机弃1张手牌
  if (skills.includes('discard')) {
    if (enemy.hand.length > 0) {
      const discardIdx = Math.floor(rng() * enemy.hand.length);
      sync.discardIdx = discardIdx;
      const discarded = enemy.hand[discardIdx];
      enemy.hand.splice(discardIdx, 1);
      addLog(state, `🗑️ ${card.name}：对手弃掉【${discarded.name}】`, who);
    } else {
      addLog(state, `🗑️ ${card.name}：对手没有手牌`, who);
    }
  }

  // 荒野呼唤：对指定单位使用撕裂+毒爆
  if (skills.includes('tear') && skills.includes('poisonBurst') && card.name === '荒野呼唤') {
    if (targetKey) {
      const u = enemy.board[targetKey];
      if (u) {
        // 撕裂：触发目标流血层数伤害
        if (u.bleed > 0) {
          const tearDmg = u.bleed;
          u.hp -= tearDmg;
          addLog(state, `🔪 荒野呼唤·撕裂！${u.name} 受到 ${tearDmg} 真实伤害`, who);
        }
        // 毒爆：消耗中毒层数造成真实伤害
        if (u.poison > 0) {
          const pbDmg = u.poison;
          u.hp -= pbDmg;
          addLog(state, `💣 荒野呼唤·毒爆！${u.name} 受到 ${pbDmg} 真实伤害`, who);
          u.poison = 0;
        }
        if (u.hp <= 0) {
          delete enemy.board[targetKey];
          addLog(state, `💀 ${u.name} 被荒野呼唤消灭！`, who === 'player' ? 'enemy' : 'player');
        }
      }
    }
  }

  checkGameOver(state);
  const hasSync = sync.swapTargets !== undefined || sync.discardIdx !== undefined || sync.dmgRoll !== undefined;
  if (self.riddleActive && !self.hand.some(c => c.type === '法术')) {
    self.riddleActive = false;
  }
  return { success: true, sync: hasSync ? sync : undefined };
}

// ======== 获取攻击顺序 ========
export function getAttackOrder(state: GameState, who: PlayerType): { unit: Unit; key: BoardKey }[] {
  const p = who === 'player' ? state.player : state.enemy;
  const board = p.board;
  const frontRow = who === 'player' ? 2 : 1;
  const backRow = who === 'player' ? 3 : 0;

  const ordered: { unit: Unit; key: BoardKey }[] = [];
  for (let c = 0; c < 3; c++) {
    const k = posKey(frontRow, c);
    if (board[k]) ordered.push({ unit: board[k], key: k });
  }
  for (let c = 0; c < 3; c++) {
    const k = posKey(backRow, c);
    if (board[k]) ordered.push({ unit: board[k], key: k });
  }
  return ordered;
}

// ======== 执行单个单位攻击 ========
export function executeSingleAttack(state: GameState, unitKey: BoardKey, who: PlayerType): DamageEvent | null {
  if (state.gameOver) return null;

  const p = who === 'player' ? state.player : state.enemy;
  const board = p.board;
  const unit = board[unitKey];
  if (!unit) return null;

  // 标记当前攻击单位（用于UI高亮）
  state.attackingUnit = unitKey;

  // 计算攻击加成
  let bonusAtk = getUnitAttackBonus(unit, p);

  // 狙击处理
  if (unit.subtype === '狙击') {
    if (who === 'player') {
      state.sniperQueue.push(unit);
      state.attackingUnit = null;
      return null;
    } else {
      // AI狙击
      const jamming = Object.values(state.player.board).some(u => u.skills.includes('jamming'));
      if (jamming) {
        const targets = getTargetsInRange(state, unit, who);
        if (targets.length === 0) { state.attackingUnit = null; return null; }
        const t = targets[Math.floor(rng() * targets.length)];
        const evt = applyDamage(state, t.key, unit.atk + bonusAtk, unit, who);
        state.attackingUnit = null;
        return evt;
      } else {
        const t = pickAutoTarget(state, unit, who);
        if (t) {
          const evt = applyDamage(state, t.key, unit.atk + bonusAtk, unit, who);
          state.attackingUnit = null;
          return evt;
        }
      }
      state.attackingUnit = null;
      return null;
    }
  }

  // 集火优先
  const focusTarget = p.focusTarget;
  let target = null;
  if (focusTarget) {
    const targets = getTargetsInRange(state, unit, who);
    const focused = targets.find(t => t.key === focusTarget);
    if (focused) target = focused;
  }
  if (!target) {
    target = pickAutoTarget(state, unit, who);
  }

  if (!target) {
    addLog(state, `❌ ${unit.name} 射程内无目标`, who);
    state.attackingUnit = null;
    return null;
  }

  const finalAtk = unit.atk + bonusAtk;
  const evt = applyDamage(state, target.key, finalAtk, unit, who);
  state.attackingUnit = null;
  return evt;
}

// ======== 清除攻击高亮 ========
export function clearAttackingUnit(state: GameState): void {
  state.attackingUnit = null;
}

// ======== 执行攻击阶段（收集狙击，普通攻击直接执行） ========
export function doAttackPhase(state: GameState, who: PlayerType): DamageEvent[] {
  const events: DamageEvent[] = [];
  if (state.gameOver) return events;

  const ordered = getAttackOrder(state, who);

  // 消耗集火目标
  const p = who === 'player' ? state.player : state.enemy;
  p.focusTarget = null;

  for (const { key } of ordered) {
    if (state.gameOver) break;
    // 狙击单位入队，普通单位直接攻击
    const evt = executeSingleAttack(state, key, who);
    if (evt) events.push(evt);
  }

  return events;
}

// ======== 多狙击统一目标攻击 ========
export function resolveAllSnipers(state: GameState, targetKey: BoardKey): DamageEvent[] {
  const events: DamageEvent[] = [];
  if (state.sniperQueue.length === 0) return events;

  state.sniperTarget = targetKey;
  const board = state.player.board;

  for (const unit of state.sniperQueue) {
    if (state.gameOver) break;

    // 找到狙击单位的位置
    const unitEntry = Object.entries(board).find(([, u]) => u.uid === unit.uid);
    if (!unitEntry) continue;

    const myRow = parseKey(unitEntry[0]).row;
    const { row: tRow } = parseKey(targetKey);
    const dist = getDistance(state, myRow, tRow);

    // 距离1盲区跳过
    if (dist < 2) {
      addLog(state, `❌ ${unit.name} 距离${dist}（盲区），跳过攻击`, 'player');
      continue;
    }

    // 射程检查
    const range = getUnitRange(unit);
    if (range !== 999 && dist !== range) {
      addLog(state, `❌ ${unit.name} 射程${range}不匹配距离${dist}，跳过攻击`, 'player');
      continue;
    }

    // 狙击不享受战术指挥/射击指挥加成
    let bonusAtk = 0;

    const evt = applyDamage(state, targetKey, unit.atk + bonusAtk, unit, 'player');
    if (evt) events.push(evt);
  }

  state.sniperQueue = [];
  state.sniperMode = false;
  state.sniperTarget = null;
  return events;
}

// ======== 镜像敌方狙击（联机同步用）========
export function mirrorEnemySnipers(
  state: GameState,
  remoteTargetKey: BoardKey,
  amounts?: number[],
): DamageEvent[] {
  const events: DamageEvent[] = [];
  const targetKey = flipTargetKey(remoteTargetKey);
  const board = state.enemy.board;
  const ordered: { unit: Unit; key: BoardKey }[] = [];

  for (const row of [1, 0]) {
    for (let c = 0; c < 3; c++) {
      if (row === 0 && c === 1) continue;
      const k = posKey(row, c);
      const u = board[k];
      if (u && u.subtype === '狙击') ordered.push({ unit: u, key: k });
    }
  }

  let hitIdx = 0;
  for (const { unit } of ordered) {
    if (state.gameOver) break;
    const unitEntry = Object.entries(board).find(([, u]) => u.uid === unit.uid);
    if (!unitEntry) continue;

    const myRow = parseKey(unitEntry[0]).row;
    const { row: tRow } = parseKey(targetKey);
    const dist = getDistance(state, myRow, tRow);
    if (dist < 2) {
      addLog(state, `❌ ${unit.name} 距离${dist}（盲区），跳过攻击`, 'enemy');
      continue;
    }

    const range = getUnitRange(unit);
    if (range !== 999 && dist !== range) {
      addLog(state, `❌ ${unit.name} 射程${range}不匹配距离${dist}，跳过攻击`, 'enemy');
      continue;
    }

    if (amounts && amounts[hitIdx] !== undefined) {
      const amt = amounts[hitIdx];
      if (amt > 0) applyMirroredDamage(state, targetKey, amt, 'enemy');
      events.push({ targetKey, amount: amt, damageType: '物理' });
      hitIdx++;
    } else {
      const evt = applyDamage(state, targetKey, unit.atk, unit, 'enemy');
      if (evt) events.push(evt);
    }
  }

  state.sniperQueue = [];
  state.sniperMode = false;
  state.sniperTarget = null;
  state.showSnipeBanner = false;
  checkGameOver(state);
  return events;
}

// ======== 结束回合 ========
export function endTurn(state: GameState): void {
  if (state.currentPlayer !== 'player' || state.gameOver) return;
  if (state.sniperMode || state.sniperQueue.length > 0) {
    addLog(state, '⚠️ 请先完成狙击目标选择', 'system');
    return;
  }

  // 只收集狙击队列，不执行普通攻击（攻击由hook异步控制）
  state.turnPhase = 'attack';
  collectSnipers(state, 'player');

  if (state.sniperQueue.length > 0) {
    state.sniperMode = true;
    state.showSnipeBanner = true;
    addLog(state, `🎯 狙击阶段：你有${state.sniperQueue.length}个狙击单位，请指定一个统一目标`, 'system');
    return;
  }

  // 不在这里finishPlayerTurn，由hook控制异步流程
}

// ======== 仅收集狙击单位到队列（不执行攻击） ========
function collectSnipers(state: GameState, who: PlayerType): void {
  const p = who === 'player' ? state.player : state.enemy;
  const board = p.board;
  const frontRow = who === 'player' ? 2 : 1;
  const backRow = who === 'player' ? 3 : 0;

  // 按攻击顺序遍历
  const keys: BoardKey[] = [];
  for (let c = 0; c < 3; c++) {
    const k = posKey(frontRow, c);
    if (board[k]) keys.push(k);
  }
  for (let c = 0; c < 3; c++) {
    const k = posKey(backRow, c);
    if (board[k]) keys.push(k);
  }

  for (const key of keys) {
    const unit = board[key];
    if (!unit) continue;
    if (unit.subtype === '狙击') {
      if (who === 'player') {
        state.sniperQueue.push(unit);
      } else {
        // AI狙击直接处理（简化）
        const jamming = Object.values(state.player.board).some(u => u.skills.includes('jamming'));
        const unitSubtype = unit.subtype as string;
        let bonusAtk = 0;
        for (const u of Object.values(board)) {
          if (u.skills.includes('tacticCmd') && unitSubtype === '近战') bonusAtk += 1;
          if (u.skills.includes('shootCmd') && unitSubtype === '弓箭') bonusAtk += 1;
        }
        if (jamming) {
          const targets = getTargetsInRange(state, unit, who);
          if (targets.length > 0) {
            const t = targets[Math.floor(rng() * targets.length)];
            applyDamage(state, t.key, unit.atk + bonusAtk, unit, who);
          }
        } else {
          const t = pickAutoTarget(state, unit, who);
          if (t) applyDamage(state, t.key, unit.atk + bonusAtk, unit, who);
        }
      }
    }
  }
}

export function finishPlayerTurn(state: GameState): void {
  if (state.gameOver) return;
  state.player.spellOnlyNextTurn = false;
  state.turnPhase = 'end';
  state.currentPlayer = 'enemy';
  state.turnPhase = 'deploy';
  // AI部署和攻击由hook异步控制，不再这里调用
}

// ======== AI回合：只部署，不攻击（攻击由hook异步控制） ========
export function doAITurnDeploy(state: GameState): { cardName: string; row: number; col: number } | null {
  if (state.gameOver) return null;

  const p = state.enemy;

  if (!p.spellOnlyNextTurn) {
    const soldiers = p.hand
      .map((c, i) => ({ card: c, idx: i }))
      .filter(({ card }) => card.type === '士兵')
      .sort((a, b) => a.card.cost - b.card.cost);

    for (const { card } of soldiers) {
      if (p.gold >= card.cost) {
        const row = rng() > 0.3 ? 1 : 0;
        const cols = [0, 1, 2].filter(c => !(row === 0 && c === 1));
        const emptyCols = cols.filter(c => !p.board[posKey(row, c)]);
        const col = emptyCols.length > 0
          ? emptyCols[Math.floor(rng() * emptyCols.length)]
          : cols[Math.floor(rng() * cols.length)];

        if (col !== undefined) {
          const cardIdx = p.hand.indexOf(card);
          if (deployUnit(state, cardIdx, row, col, 'enemy')) {
            return { cardName: card.name, row, col };
          }
        }
      }
    }
  }

  // 然后使用法术
  const spells = p.hand
    .map((c, i) => ({ card: c, idx: i }))
    .filter(({ card }) => card.type === '法术')
    .sort((a, b) => a.card.cost - b.card.cost);

  for (const { card } of spells) {
    if (p.gold >= card.cost) {
      const cardIdx = p.hand.indexOf(card);

      if (card.name === '天火降临' || card.name === '混乱风暴') {
        castSpell(state, cardIdx, null, 'enemy');
        return { cardName: card.name, row: -1, col: -1 };
      } else if (card.skills.includes('magicDmg')) {
        // 过滤免疫单位（不能被法术指定为目标）
        const targets = Object.entries(state.player.board)
          .filter(([, u]) => !u.skills.includes('immune'))
          .map(([k]) => k);
        if (targets.length > 0) {
          const tk = targets[Math.floor(rng() * targets.length)];
          castSpell(state, cardIdx, tk, 'enemy');
          return { cardName: card.name, row: parseKey(tk).row, col: parseKey(tk).col };
        }
      } else if (card.skills.includes('destroy')) {
        // 末日审判：优先 targeting 高攻单位（不能对HQ使用）
        const targets = Object.entries(state.player.board)
          .filter(([, u]) => !u.skills.includes('immune'))
          .sort(([, a], [, b]) => b.atk - a.atk);
        if (targets.length > 0) {
          const tk = targets[0][0];
          castSpell(state, cardIdx, tk, 'enemy');
          return { cardName: card.name, row: parseKey(tk).row, col: parseKey(tk).col };
        }
        // 没有可目标单位则跳过（不能对HQ使用）
        continue;
      } else if (card.name === '荒野呼唤') {
        // 荒野呼唤：优先 targeting 有中毒或流血的单位
        const targets = Object.entries(state.player.board)
          .filter(([, u]) => u.bleed > 0 || u.poison > 0);
        if (targets.length > 0) {
          const tk = targets[Math.floor(rng() * targets.length)][0];
          castSpell(state, cardIdx, tk, 'enemy');
          return { cardName: card.name, row: parseKey(tk).row, col: parseKey(tk).col };
        }
        // 没有合适的单位则跳过
        continue;
      } else if (card.skills.includes('drawCard') || card.skills.includes('discard') || card.skills.includes('healHQ')) {
        // 急行军令/军情急报/重整旗鼓/截获密信：无目标法术，直接使用
        castSpell(state, cardIdx, null, 'enemy');
        return { cardName: card.name, row: -1, col: -1 };
      } else if (card.name === '疾风步') {
        // 疾风步：指定一个随机敌方单位
        const targets = Object.keys(state.player.board);
        if (targets.length > 0) {
          const tk = targets[Math.floor(rng() * targets.length)];
          castSpell(state, cardIdx, tk, 'enemy');
          return { cardName: card.name, row: parseKey(tk).row, col: parseKey(tk).col };
        }
      } else {
        castSpell(state, cardIdx, null, 'enemy');
        return { cardName: card.name, row: -1, col: -1 };
      }
    }
  }

  return null; // 没有可执行的操作
}

// ======== AI回合资源阶段 ========
export function doAITurnResource(state: GameState): void {
  if (state.gameOver) return;
  state.currentPlayer = 'enemy';
  startTurn(state);
}

// ======== 进入下一玩家回合 ========
export function advanceToPlayerTurn(state: GameState): void {
  if (state.gameOver) return;
  state.enemy.spellOnlyNextTurn = false;
  state.turn++;
  state.currentPlayer = 'player';
  startTurn(state);
}

// ======== 狙击解决（新版：多狙击共享统一目标） ========
export function resolveSniper(state: GameState, targetKey: BoardKey): DamageEvent[] {
  if (state.sniperQueue.length === 0) return [];

  // 干扰检查：敌方有干扰单位则目标随机化
  const jamming = Object.values(state.enemy.board).some(u => u.skills.includes('jamming'));
  if (jamming) {
    addLog(state, '📡 敌方干扰生效！狙击目标随机化', 'system');
    const targets = getTargetsInRange(state, state.sniperQueue[0], 'player');
    if (targets.length === 0) {
      state.sniperQueue = [];
      state.sniperMode = false;
      state.showSnipeBanner = false;
      finishPlayerTurn(state);
      return [];
    }
    const randomTarget = targets[Math.floor(rng() * targets.length)];
    const evts = resolveAllSnipers(state, randomTarget.key);
    state.showSnipeBanner = false;
    finishPlayerTurn(state);
    return evts;
  }

  // 正常流程：所有狙击统一攻击指定目标
  const evts = resolveAllSnipers(state, targetKey);
  state.showSnipeBanner = false;
  finishPlayerTurn(state);
  return evts;
}

// ======== 获取日志 ========
export function getLog(state: GameState): LogEntry[] {
  return state.log;
}

// ======== 导出工具 ========
export { getFactionCardsForDeck };
