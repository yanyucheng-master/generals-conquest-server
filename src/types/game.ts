// ======== 核心类型定义 v1.0 ========

export type Faction = 'empire' | 'wild' | 'arcane';
export type CardType = '士兵' | '法术' | '装备';
export type SubType = '近战' | '弓箭' | '狙击' | '魔法' | '法术卡' | '随机';
export type Quality = '铜' | '银' | '金' | '彩';
export type DamageType = '物理' | '魔法' | '真实';
export type GamePhase = 'faction_select' | 'playing' | 'game_over';
export type TurnPhase = 'resource' | 'deploy' | 'attack' | 'end';
export type PlayerType = 'player' | 'enemy';

// ======== 技能系统 v1.0 ========
// 以下列表按用户提供的完整技能表整理
export type Skill =
  // 已完整实现
  | 'flashStrike' // 闪击：部署时立即额外攻击1次
  | 'magicSwap'   // 魔术：交换两个敌方位置
  | 'pursuit'     // 追击：敌方位移/前线部署时造成伤害
  | 'nimble'      // 灵动：位置变化时+X/+X
  | 'bleed'       // 流血：攻击附加X层流血DOT
  | 'tear'        // 撕裂：触发目标流血层数伤害
  | 'poison'      // 中毒：攻击附加X层中毒，失效敌方光环
  | 'poisonBurst' // 毒爆：消耗中毒层数造成真实伤害
  | 'growth'      // 生长：受到治疗时+X/+X
  | 'balance'     // 均衡：手牌士兵费用变为X
  | 'pierce'      // 贯穿：无视护甲破碎格挡
  | 'physResist'  // 物抗：减X物理伤
  | 'magicResist' // 法抗：减X法术伤
  | 'allResist'   // 全抗：减X所有伤
  | 'tacticCmd'   // 战术指挥：近战友军+X攻
  | 'shootCmd'    // 射击指挥：弓箭友军+X攻
  | 'lucky'       // 强运：随机伤害取最大值
  | 'spellReflect'// 法术反弹：反弹法术伤害
  | 'magicBoost'  // 法力增幅：魔法友军+X攻
  | 'focusFire'   // 集火：标记目标强制攻击
  | 'spear'       // 长矛：近战射程1或2
  | 'shortBow'    // 短弓：弓箭可打距离1
  | 'conceal'     // 隐蔽：底线不被近战/弓箭/狙击选中
  | 'immune'      // 免疫：不能被法术指定，不触发谜语
  | 'counter'     // 反击：被近战攻击时反击
  | 'intimidate'  // 叱吓：敌方近战/弓箭-X攻
  | 'strongStrike'// 强击：无视物抗/法抗/全抗
  | 'bounty'      // 悬赏：被击杀时击杀方+1金
  | 'fly'         // 飞翔：闪避近战50%弓箭25%
  | 'antiAir'     // 防空：打飞翔必中且+X伤
  | 'riddleRealm' // 谜境：激活手牌谜语
  | 'dive'        // 俯冲：有飞翔时距离不限且+X伤
  | 'silence'     // 沉默：敌方主动/触发技能失效X回合
  | 'agile'       // 疾行：每回合可移动一次位置
  | 'fog'         // 迷雾：敌方看不到其他单位信息
  | 'stealth'     // 隐踪：背面朝上，不能被法术选中
  | 'ambush'      // 伏击：受击前对攻击者造成X伤
  | 'precision'   // 精准：狙击无法被免疫且+X伤
  | 'disguise'    // 伪装：不能被狙击/随机选中
  | 'holyLight'   // 圣光：敌方弃掉已激活谜语
  | 'interest'    // 利息：每回合+X金
  | 'revenge'     // 复仇：友方阵亡时立即攻击
  | 'dodge'       // 闪避：50%免疫物理攻击
  | 'extract'     // 萃取：击杀敌方单位后+X金
  | 'taunt'       // 嘲讽：敌方优先攻击
  | 'jamming'     // 干扰：敌方狙击目标随机化
  | 'manaPierce'  // 法力贯穿：无视法抗/法术反弹
  | 'piercePlus'  // 强化贯穿：无视护甲值
  | 'magicBullet'  // 魔力子弹：狙击视为魔法伤
  | 'lifesteal'    // 吸血：攻击时恢复等量生命
  | 'magicDmg'     // 魔法伤害（法术卡）
  | 'shield'       // 护盾术（法术卡）
  | 'magicPierce'  // 法力贯穿：无视法抗和法术反弹
  | 'heal'         // 治疗X：恢复指定目标X点生命
  | 'aoeHeal'      // 群体治疗X：恢复所有友军X点生命
  | 'armor'        // 护甲X：部署时获得X点护甲值
  | 'destroy'      // 消灭：直接消灭一个单位（末日审判）
  | 'refreshBoost' // 刷新增幅：让场上所有单位再次触发法力增幅
  | 'cleanseSilence' // 净化沉默：移除所有友方单位的沉默效果
  // 新增技能（v0.99 新卡包）
  | 'drawCard'     // 抽牌：抽取X张卡牌
  | 'healHQ'       // 治疗总部：恢复总部X点生命
  | 'discard';     // 弃牌：随机弃掉对手X张手牌

// 技能参数解析：从desc中提取数值
export interface SkillParam {
  value: number;
  source: string; // 如 "流血1" 中的 "1"
}

// 卡牌定义（牌库中的定义）
export interface CardDef {
  id: number;
  name: string;
  cost: number;
  quality: Quality;
  type: CardType;
  subtype: SubType;
  atk: number;
  hp: number;
  armor: number;
  desc: string;
  skills: Skill[];
  faction: string;
  damageType?: DamageType;
}

// 战场上的单位实例
export interface Unit {
  uid: string;
  defId: number;
  name: string;
  cost: number;
  quality: Quality;
  type: CardType;
  subtype: SubType;
  atk: number;
  baseAtk: number;
  hp: number;
  maxHp: number;
  armor: number;
  baseArmor: number;
  desc: string;
  skills: Skill[];
  faction: string;
  damageType?: DamageType;
  canAttack: boolean;       // 本回合是否可攻击
  frozen: boolean;          // 是否冻结
  frozenTurns: number;      // 冻结剩余回合
  equip: Equipment | null;  // 装备
  bleed: number;            // 流血层数
  poison: number;           // 中毒层数
  firstGuardUsed: boolean;  // 首次减伤是否已用
  isStealthed: boolean;     // 隐踪：背面朝上
  silenceTurns: number;     // 沉默剩余回合
  buffs: Buff[];            // 临时增益
  hasAttackedThisTurn: boolean; // 本回合是否已攻击（闪击用）
  flashStrikeUsed: boolean; // 闪击是否已使用
  magicBoostUsed: boolean;  // 法力增幅是否已使用（一次性）
  agileUsed: boolean;       // 疾行：本回合是否已移动
  randomRange?: [number, number]; // 随机伤害范围 [最小值, 最大值]
}

export interface Equipment {
  name: string;
  armorBonus: number;
  atkBonus: number;
  skill?: Skill;
}

export interface Buff {
  type: 'atk' | 'hp';
  value: number;
  source: string;
  removeOn?: string; // 如 'enemy_turn_start' 表示敌方回合开始时移除
}

// 战场坐标
export type Position = {
  row: number; // 0-3
  col: number; // 0-2
};

export type BoardKey = string; // "row-col"

// 玩家/AI状态
export interface PlayerState {
  gold: number;
  maxGold: number;
  hp: number;
  maxHp: number;
  deck: CardDef[];
  hand: CardDef[];
  fatigue: number;
  board: Record<BoardKey, Unit>;
  hqArmor: number;
  discountNext: number;
  drawExtra: number;
  focusTarget: BoardKey | null;
  spellOnlyNextTurn: boolean; // 混乱风暴：下回合只能打出法术
  riddleActive: boolean;      // 谜境：手牌谜语法术已激活
  bleed: number;  // HQ流血层数
  poison: number; // HQ中毒层数
}

// 游戏全局状态
export interface GameState {
  phase: GamePhase;
  turn: number;
  currentPlayer: PlayerType;
  turnPhase: TurnPhase;
  selectedDeck: Faction;
  selectedCardIdx: number | null;
  sniperMode: boolean;
  sniperQueue: Unit[];
  sniperTarget: BoardKey | null;
  gameOver: boolean;
  winner: PlayerType | null;
  log: LogEntry[];
  player: PlayerState;
  enemy: PlayerState;
  animating: boolean;
  attackingUnit: BoardKey | null;
  showTurnBanner: number | null;
  showSnipeBanner: boolean;
}

// ======== 联机同步数据 ========
// 法术/部署/狙击释放时需要同步的额外数据（解决随机 desync）
export interface SpellSyncData {
  discardIdx?: number;
  swapTargets?: [BoardKey, BoardKey];
  dmgRoll?: number;
}

export interface DeploySyncData {
  swapTargets?: [BoardKey, BoardKey];
  flashStrike?: {
    toKey: BoardKey;
    amount: number;
    dodged?: boolean;
    blocked?: boolean;
  };
}

export interface SniperSyncData {
  /** 每个狙击单位造成的伤害（按攻击顺序） */
  amounts?: number[];
}

export interface CastSpellResult {
  success: boolean;
  sync?: SpellSyncData;
}

export interface DeployResult {
  success: boolean;
  sync?: DeploySyncData;
}

export interface LogEntry {
  id: number;
  msg: string;
  type: 'system' | 'player' | 'enemy' | 'damage' | 'heal' | 'gold' | 'combat';
  turn?: number;
}

export interface FactionDef {
  id: Faction;
  name: string;
  icon: string;
  desc: string;
  theme: string;
  accent: string;
}

// 伤害事件（动画用）
export interface DamageEvent {
  targetKey: BoardKey;
  amount: number;
  damageType: DamageType;
  isBlocked?: boolean;
  isDodged?: boolean;
  isArmorBreak?: boolean;
}

// 攻击连线
export interface AttackLine {
  from: BoardKey;
  to: BoardKey;
}

// 技能标签映射（UI显示用，简短名称）
export const SKILL_LABELS: Record<string, string> = {
  flashStrike: '闪击',
  magicSwap: '魔术',
  pursuit: '追击',
  nimble: '灵动',
  bleed: '流血',
  tear: '撕裂',
  poison: '中毒',
  poisonBurst: '毒爆',
  growth: '生长',
  balance: '均衡',
  pierce: '贯穿',
  piercePlus: '强化贯穿',
  physResist: '物抗',
  magicResist: '法抗',
  allResist: '全抗',
  tacticCmd: '战术指挥',
  shootCmd: '射击指挥',
  lucky: '强运',
  spellReflect: '法术反弹',
  magicBoost: '法力增幅',
  focusFire: '集火',
  spear: '长矛',
  shortBow: '短弓',
  conceal: '隐蔽',
  immune: '免疫',
  counter: '反击',
  intimidate: '叱吓',
  strongStrike: '强击',
  bounty: '悬赏',
  fly: '飞翔',
  antiAir: '防空',
  riddleRealm: '谜境',
  dive: '俯冲',
  silence: '沉默',
  agile: '疾行',
  fog: '迷雾',
  stealth: '隐踪',
  ambush: '伏击',
  precision: '精准',
  disguise: '伪装',
  holyLight: '圣光',
  interest: '利息',
  revenge: '复仇',
  dodge: '闪避',
  extract: '萃取',
  taunt: '嘲讽',
  jamming: '干扰',
  magicBullet: '魔力子弹',
  lifesteal: '吸血',
  shield: '护盾',
  magicPierce: '法力贯穿',
  heal: '治疗',
  aoeHeal: '群体治疗',
  armor: '护甲',
  destroy: '消灭',
  refreshBoost: '刷新',
  cleanseSilence: '净化',
  drawCard: '抽牌',
  healHQ: '总部恢复',
  discard: '弃牌',
};

// 技能名称映射（日志用，完整名称）
export const SKILL_NAMES: Record<string, string> = {
  flashStrike: '闪击',
  magicSwap: '魔术',
  pursuit: '追击',
  nimble: '灵动',
  bleed: '流血',
  tear: '撕裂',
  poison: '中毒',
  poisonBurst: '毒爆',
  growth: '生长',
  balance: '均衡',
  pierce: '贯穿',
  piercePlus: '强化贯穿',
  physResist: '物抗',
  magicResist: '法抗',
  allResist: '全抗',
  tacticCmd: '战术指挥',
  shootCmd: '射击指挥',
  lucky: '强运',
  spellReflect: '法术反弹',
  magicBoost: '法力增幅',
  focusFire: '集火',
  spear: '长矛',
  shortBow: '短弓',
  conceal: '隐蔽',
  immune: '免疫',
  counter: '反击',
  intimidate: '叱吓',
  strongStrike: '强击',
  bounty: '悬赏',
  fly: '飞翔',
  antiAir: '防空',
  riddleRealm: '谜境',
  dive: '俯冲',
  silence: '沉默',
  agile: '疾行',
  fog: '迷雾',
  stealth: '隐踪',
  ambush: '伏击',
  precision: '精准',
  disguise: '伪装',
  holyLight: '圣光',
  interest: '利息',
  revenge: '复仇',
  dodge: '闪避',
  extract: '萃取',
  taunt: '嘲讽',
  jamming: '干扰',
  magicBullet: '魔力子弹',
  lifesteal: '吸血',
  shield: '护盾术',
  magicPierce: '法力贯穿',
  heal: '治疗',
  aoeHeal: '群体治疗',
  armor: '护甲',
  destroy: '消灭',
  refreshBoost: '刷新增幅',
  cleanseSilence: '净化沉默',
  drawCard: '抽牌',
  healHQ: '总部恢复',
  discard: '弃牌',
};
