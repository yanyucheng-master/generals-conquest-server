import type { CardDef, FactionDef, DamageType } from '@/types/game';
export type { CardDef } from '@/types/game';

export const FACTIONS: FactionDef[] = [
  {
    id: 'empire',
    name: '帝国军团',
    icon: '🏛️',
    desc: '阵地战 · 指挥 · 重甲',
    theme: 'from-red-950 to-red-900',
    accent: '#7A1515',
  },
  {
    id: 'wild',
    name: '荒野游侠',
    icon: '🏹',
    desc: 'DOT · 隐蔽 · 狙击',
    theme: 'from-green-950 to-green-900',
    accent: '#1B5E20',
  },
  {
    id: 'arcane',
    name: '奥术学院',
    icon: '🔮',
    desc: '魔法 · 控制 · 资源',
    theme: 'from-blue-950 to-blue-900',
    accent: '#1A237E',
  },
];

// ======== 帝国军团 25张 ========
const EMPIRE_CARDS: CardDef[] = [
  { id: 1, name: '民兵', cost: 1, quality: '铜', type: '士兵', subtype: '近战', atk: 2, hp: 2, armor: 0, desc: '2/2 基础近战单位', skills: [], faction: '帝国军团' },
  { id: 3, name: '轻弩手', cost: 1, quality: '铜', type: '士兵', subtype: '弓箭', atk: 2, hp: 1, armor: 0, desc: '2/1 弓箭：射程2', skills: [], faction: '帝国军团' },
  { id: 5, name: '长矛兵', cost: 2, quality: '铜', type: '士兵', subtype: '近战', atk: 2, hp: 2, armor: 0, desc: '2/2 长矛：射程变为2', skills: ['spear'], faction: '帝国军团' },
  { id: 6, name: '战地医师', cost: 2, quality: '铜', type: '士兵', subtype: '近战', atk: 1, hp: 2, armor: 0, desc: '1/2 生长1+治疗1', skills: ['growth', 'heal'], faction: '帝国军团' },
  { id: 7, name: '重装步兵', cost: 3, quality: '铜', type: '士兵', subtype: '近战', atk: 2, hp: 3, armor: 0, desc: '2/3 物抗1：减1物理伤', skills: ['physResist'], faction: '帝国军团' },
  { id: 8, name: '军鼓手', cost: 3, quality: '铜', type: '士兵', subtype: '近战', atk: 1, hp: 3, armor: 0, desc: '1/3 战术指挥1：近战友军+1攻', skills: ['tacticCmd'], faction: '帝国军团' },
  { id: 9, name: '精锐骑士', cost: 3, quality: '银', type: '士兵', subtype: '近战', atk: 3, hp: 3, armor: 0, desc: '3/3 疾行+反击', skills: ['agile', 'counter'], faction: '帝国军团' },
  { id: 10, name: '皇家弓箭手', cost: 3, quality: '银', type: '士兵', subtype: '弓箭', atk: 2, hp: 2, armor: 0, desc: '2/2 短弓+射击指挥1', skills: ['shortBow', 'shootCmd'], faction: '帝国军团' },
  { id: 11, name: '铁壁卫士', cost: 4, quality: '银', type: '士兵', subtype: '近战', atk: 2, hp: 5, armor: 0, desc: '2/5 嘲讽+反击', skills: ['taunt', 'counter'], faction: '帝国军团' },
  { id: 12, name: '战术家', cost: 4, quality: '银', type: '士兵', subtype: '近战', atk: 2, hp: 3, armor: 0, desc: '2/3 战术指挥2+射击指挥1', skills: ['tacticCmd', 'shootCmd'], faction: '帝国军团' },
  { id: 13, name: '冲锋队长', cost: 5, quality: '银', type: '士兵', subtype: '近战', atk: 4, hp: 5, armor: 0, desc: '4/5 闪击+嘲讽', skills: ['flashStrike', 'taunt'], faction: '帝国军团' },
  { id: 14, name: '战场督军', cost: 5, quality: '银', type: '士兵', subtype: '近战', atk: 3, hp: 5, armor: 0, desc: '3/5 叱吓2：敌方近战/弓箭-2攻', skills: ['intimidate'], faction: '帝国军团' },
  { id: 15, name: '重装骑士', cost: 6, quality: '银', type: '士兵', subtype: '近战', atk: 3, hp: 5, armor: 0, desc: '3/5 物抗2+反击', skills: ['physResist', 'counter'], faction: '帝国军团' },
  { id: 16, name: '集火令', cost: 2, quality: '银', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '集火+对目标造成1点伤害：本回合全体攻击指定目标', skills: ['focusFire'], faction: '帝国军团' },
  { id: 17, name: '圣骑士', cost: 5, quality: '金', type: '士兵', subtype: '近战', atk: 4, hp: 4, armor: 0, desc: '4/4 吸血+嘲讽+生长1', skills: ['lifesteal', 'taunt', 'growth'], faction: '帝国军团' },
  { id: 18, name: '帝国元帅', cost: 6, quality: '金', type: '士兵', subtype: '近战', atk: 4, hp: 6, armor: 0, desc: '4/6 战术指挥2+射击指挥2', skills: ['tacticCmd', 'shootCmd'], faction: '帝国军团' },
  { id: 19, name: '破城槌', cost: 7, quality: '金', type: '士兵', subtype: '近战', atk: 8, hp: 5, armor: 0, desc: '8/5 贯穿+强击', skills: ['pierce', 'strongStrike'], faction: '帝国军团' },
  { id: 20, name: '皇家禁卫', cost: 6, quality: '金', type: '士兵', subtype: '近战', atk: 3, hp: 6, armor: 0, desc: '3/6 全抗2+嘲讽+反击', skills: ['allResist', 'taunt', 'counter'], faction: '帝国军团' },
  { id: 21, name: '军备扩充', cost: 3, quality: '金', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '均衡3：手牌士兵费用变3', skills: ['balance'], faction: '帝国军团' },
  { id: 22, name: '不败战神', cost: 7, quality: '彩', type: '士兵', subtype: '近战', atk: 7, hp: 7, armor: 0, desc: '7/7 闪击+强化贯穿+反击', skills: ['flashStrike', 'piercePlus', 'counter'], faction: '帝国军团' },
  { id: 23, name: '帝国壁垒', cost: 8, quality: '彩', type: '士兵', subtype: '近战', atk: 3, hp: 5, armor: 3, desc: '3/5 全抗5+嘲讽+护甲3', skills: ['allResist', 'taunt', 'armor'], faction: '帝国军团' },
  { id: 24, name: '总指挥', cost: 7, quality: '彩', type: '士兵', subtype: '近战', atk: 4, hp: 5, armor: 0, desc: '4/5 战术指挥3+射击指挥3+闪避', skills: ['tacticCmd', 'shootCmd', 'dodge'], faction: '帝国军团' },
  { id: 73, name: '急行军令', cost: 3, quality: '铜', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '立即抽取2张卡牌', skills: ['drawCard'], faction: '帝国军团' },
  { id: 74, name: '重整旗鼓', cost: 4, quality: '金', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '立即抽取2张卡牌，总部恢复3点血量', skills: ['drawCard', 'healHQ'], faction: '帝国军团' },
  { id: 76, name: '军情急报', cost: 4, quality: '银', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '立即抽取3张卡牌', skills: ['drawCard'], faction: '帝国军团' },
];

// ======== 荒野游侠 26张 ========
const WILD_CARDS: CardDef[] = [
  { id: 25, name: '野狗', cost: 1, quality: '铜', type: '士兵', subtype: '近战', atk: 1, hp: 2, armor: 0, desc: '1/2 流血1', skills: ['bleed'], faction: '荒野游侠' },
  { id: 26, name: '毒蜂', cost: 1, quality: '铜', type: '士兵', subtype: '随机', atk: 2, hp: 1, armor: 0, desc: '2/1 中毒2', skills: ['poison'], faction: '荒野游侠' },
  { id: 27, name: '游侠', cost: 2, quality: '铜', type: '士兵', subtype: '弓箭', atk: 2, hp: 1, armor: 0, desc: '2/1 短弓：可打距离1或2', skills: ['shortBow'], faction: '荒野游侠' },
  { id: 28, name: '陷阱师', cost: 2, quality: '铜', type: '士兵', subtype: '近战', atk: 2, hp: 2, armor: 0, desc: '2/2 伏击1', skills: ['ambush'], faction: '荒野游侠' },
  { id: 29, name: '狼群', cost: 3, quality: '铜', type: '士兵', subtype: '近战', atk: 2, hp: 3, armor: 0, desc: '2/3 流血1：攻击附加流血', skills: ['bleed'], faction: '荒野游侠' },
  { id: 30, name: '毒箭蛙', cost: 3, quality: '铜', type: '士兵', subtype: '弓箭', atk: 2, hp: 3, armor: 0, desc: '2/3 中毒2：攻击附加中毒', skills: ['poison'], faction: '荒野游侠' },
  { id: 31, name: '山猫', cost: 4, quality: '铜', type: '士兵', subtype: '近战', atk: 4, hp: 1, armor: 0, desc: '4/1 物抗1+伏击3', skills: ['physResist', 'ambush'], faction: '荒野游侠' },
  { id: 32, name: '腐化藤蔓', cost: 4, quality: '铜', type: '士兵', subtype: '随机', atk: 4, hp: 6, armor: 0, desc: '4/6 中毒4：攻击附加中毒', skills: ['poison'], faction: '荒野游侠' },
  { id: 33, name: '血刃刺客', cost: 3, quality: '银', type: '士兵', subtype: '近战', atk: 1, hp: 3, armor: 0, desc: '1/3 流血2+撕裂', skills: ['bleed', 'tear'], faction: '荒野游侠' },
  { id: 34, name: '暗影猎手', cost: 3, quality: '银', type: '士兵', subtype: '狙击', atk: 3, hp: 2, armor: 0, desc: '3/2 精准1：狙击+1伤无法闪避', skills: ['precision'], faction: '荒野游侠' },
  { id: 35, name: '毒药师', cost: 3, quality: '银', type: '士兵', subtype: '弓箭', atk: 2, hp: 2, armor: 0, desc: '2/2 中毒2+毒爆', skills: ['poison', 'poisonBurst'], faction: '荒野游侠' },
  { id: 36, name: '风行者', cost: 4, quality: '银', type: '士兵', subtype: '弓箭', atk: 3, hp: 3, armor: 0, desc: '3/3 飞翔：概率闪避近战/弓箭', skills: ['fly'], faction: '荒野游侠' },
  { id: 37, name: '夜行者', cost: 5, quality: '银', type: '士兵', subtype: '近战', atk: 5, hp: 3, armor: 0, desc: '5/3 隐踪+伏击3', skills: ['stealth', 'ambush'], faction: '荒野游侠' },
  { id: 38, name: '瘟疫使者', cost: 5, quality: '银', type: '士兵', subtype: '随机', atk: 5, hp: 3, armor: 0, desc: '5/3 中毒3+流血3', skills: ['poison', 'bleed'], faction: '荒野游侠' },
  { id: 39, name: '猎龙弩手', cost: 6, quality: '银', type: '士兵', subtype: '狙击', atk: 5, hp: 6, armor: 0, desc: '5/6 贯穿+防空2', skills: ['pierce', 'antiAir'], faction: '荒野游侠' },
  { id: 40, name: '疾风步', cost: 2, quality: '银', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '魔术：可指定1个单位，其与随机另一个单位交换位置', skills: ['magicSwap'], faction: '荒野游侠' },
  { id: 41, name: '龙鹰骑士', cost: 5, quality: '金', type: '士兵', subtype: '近战', atk: 3, hp: 5, armor: 0, desc: '3/5 飞翔+俯冲2', skills: ['fly', 'dive'], faction: '荒野游侠' },
  { id: 42, name: '蛛后', cost: 6, quality: '金', type: '士兵', subtype: '随机', atk: 5, hp: 4, armor: 0, desc: '5/4 中毒4+毒爆+强运', skills: ['poison', 'poisonBurst', 'lucky'], faction: '荒野游侠' },
  { id: 43, name: '血族伯爵', cost: 6, quality: '金', type: '士兵', subtype: '近战', atk: 3, hp: 7, armor: 0, desc: '3/7 吸血+流血3+撕裂', skills: ['lifesteal', 'bleed', 'tear'], faction: '荒野游侠' },
  { id: 44, name: '幻影刺客', cost: 7, quality: '金', type: '士兵', subtype: '狙击', atk: 6, hp: 4, armor: 0, desc: '6/4 贯穿+精准2+伪装', skills: ['pierce', 'precision', 'disguise'], faction: '荒野游侠' },
  { id: 45, name: '荒野呼唤', cost: 1, quality: '金', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '撕裂+毒爆：对指定单位使用', skills: ['tear', 'poisonBurst'], faction: '荒野游侠' },
  { id: 46, name: '风暴龙王', cost: 5, quality: '彩', type: '士兵', subtype: '随机', atk: 6, hp: 5, armor: 0, desc: '6/5 飞翔+强运+撕裂', skills: ['fly', 'lucky', 'tear'], faction: '荒野游侠' },
  { id: 47, name: '混沌领主', cost: 6, quality: '彩', type: '士兵', subtype: '随机', atk: 7, hp: 4, armor: 0, desc: '7/4 强运+闪避+萃取2', skills: ['lucky', 'dodge', 'extract'], faction: '荒野游侠' },
  { id: 48, name: '无形之刃', cost: 7, quality: '彩', type: '士兵', subtype: '近战', atk: 1, hp: 5, armor: 0, desc: '1/5 全抗1+中毒6+闪击+流血6', skills: ['allResist', 'poison', 'flashStrike', 'bleed'], faction: '荒野游侠' },
  { id: 77, name: '截获密信', cost: 2, quality: '银', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '立即随机使对手弃1张手牌', skills: ['discard'], faction: '荒野游侠' },
  { id: 79, name: '毒针', cost: 1, quality: '铜', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '对一个目标造成1点伤害，若目标已受伤则伤害+1', skills: ['magicDmg'], faction: '荒野游侠' },
];

// ======== 奥术学院 25张 ========
const ARCANE_CARDS: CardDef[] = [
  { id: 49, name: '学徒', cost: 1, quality: '铜', type: '士兵', subtype: '魔法', atk: 2, hp: 1, armor: 0, desc: '2/1 魔法单位', skills: [], faction: '奥术学院' },
  { id: 50, name: '奥术元素', cost: 1, quality: '铜', type: '士兵', subtype: '魔法', atk: 1, hp: 1, armor: 0, desc: '1/1 魔法单位  抽取1', skills: ['drawCard'], faction: '奥术学院' },
  { id: 51, name: '奥术射手', cost: 2, quality: '铜', type: '士兵', subtype: '魔法', atk: 2, hp: 2, armor: 1, desc: '2/2 护甲1', skills: ['armor'], faction: '奥术学院' },
  { id: 52, name: '魔法书', cost: 2, quality: '铜', type: '士兵', subtype: '魔法', atk: 1, hp: 2, armor: 0, desc: '1/2 魔法单位 法力增幅2', skills: ['magicBoost'], faction: '奥术学院' },
  { id: 53, name: '魔力结晶', cost: 3, quality: '铜', type: '士兵', subtype: '魔法', atk: 1, hp: 3, armor: 0, desc: '1/3 利息1：每回合+1金币', skills: ['interest'], faction: '奥术学院' },
  { id: 54, name: '幻象', cost: 3, quality: '铜', type: '士兵', subtype: '魔法', atk: 2, hp: 4, armor: 0, desc: '2/4 悬赏+法力增幅2', skills: ['bounty', 'magicBoost'], faction: '奥术学院' },
  { id: 55, name: '奥术守卫', cost: 4, quality: '铜', type: '士兵', subtype: '魔法', atk: 3, hp: 3, armor: 0, desc: '3/3 法术反射', skills: ['spellReflect'], faction: '奥术学院' },
  { id: 56, name: '传送门', cost: 2, quality: '铜', type: '士兵', subtype: '魔法', atk: 1, hp: 1, armor: 0, desc: '1/1 魔术', skills: ['magicSwap'], faction: '奥术学院' },
  { id: 57, name: '奥术师', cost: 3, quality: '银', type: '士兵', subtype: '魔法', atk: 2, hp: 2, armor: 0, desc: '2/2 增幅2：魔法友军+2攻', skills: ['magicBoost'], faction: '奥术学院' },
  { id: 58, name: '沉默术士', cost: 3, quality: '银', type: '士兵', subtype: '魔法', atk: 2, hp: 2, armor: 0, desc: '2/2 沉默1：使敌方技能失效1回合', skills: ['silence'], faction: '奥术学院' },
  { id: 59, name: '反制法师', cost: 4, quality: '银', type: '士兵', subtype: '魔法', atk: 4, hp: 3, armor: 0, desc: '4/3 法术反弹+法力增幅1', skills: ['spellReflect', 'magicBoost'], faction: '奥术学院' },
  { id: 60, name: '幻术大师', cost: 4, quality: '银', type: '士兵', subtype: '魔法', atk: 3, hp: 3, armor: 0, desc: '3/3 魔术', skills: ['magicSwap'], faction: '奥术学院' },
  { id: 61, name: '魔力源泉', cost: 4, quality: '银', type: '士兵', subtype: '魔法', atk: 2, hp: 1, armor: 0, desc: '2/1 利息3：每回合+3金币  +抽取1', skills: ['interest', 'drawCard'], faction: '奥术学院' },
  { id: 62, name: '均衡法师', cost: 4, quality: '银', type: '士兵', subtype: '魔法', atk: 2, hp: 5, armor: 0, desc: '2/5 均衡3：手牌士兵费用变3+抽取1', skills: ['balance', 'drawCard'], faction: '奥术学院' },
  { id: 63, name: '法力风暴', cost: 6, quality: '银', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '对一个单位造成6点法术伤害+法力贯穿', skills: ['magicDmg', 'magicPierce'], faction: '奥术学院' },
  { id: 64, name: '干扰者', cost: 4, quality: '银', type: '士兵', subtype: '魔法', atk: 3, hp: 4, armor: 0, desc: '3/4 干扰：敌方狙击目标随机化+物抗1', skills: ['jamming', 'physResist'], faction: '奥术学院' },
  { id: 65, name: '大奥术师', cost: 5, quality: '金', type: '士兵', subtype: '魔法', atk: 3, hp: 4, armor: 0, desc: '3/4 增幅2+法力贯穿', skills: ['magicBoost', 'magicPierce'], faction: '奥术学院' },
  { id: 66, name: '时间法师', cost: 6, quality: '金', type: '士兵', subtype: '魔法', atk: 4, hp: 4, armor: 0, desc: '4/4 沉默2+增幅2', skills: ['silence', 'magicBoost'], faction: '奥术学院' },
  { id: 67, name: '禁咒法师', cost: 6, quality: '金', type: '士兵', subtype: '魔法', atk: 4, hp: 3, armor: 0, desc: '4/3 沉默5+圣光', skills: ['silence', 'holyLight'], faction: '奥术学院' },
  { id: 68, name: '黄金商人', cost: 5, quality: '金', type: '士兵', subtype: '魔法', atk: 2, hp: 3, armor: 0, desc: '2/3 利息2+萃取2', skills: ['interest', 'extract'], faction: '奥术学院' },
  { id: 69, name: '末日审判', cost: 7, quality: '金', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '消灭一个敌方单位（不能对总部使用）', skills: ['destroy'], faction: '奥术学院' },
  { id: 70, name: '虚空行者', cost: 6, quality: '彩', type: '士兵', subtype: '魔法', atk: 6, hp: 8, armor: 0, desc: '6/8 免疫', skills: ['immune'], faction: '奥术学院' },
  { id: 71, name: '永恒法师', cost: 7, quality: '彩', type: '士兵', subtype: '魔法', atk: 3, hp: 5, armor: 0, desc: '3/5 利息2+增幅5', skills: ['interest', 'magicBoost'], faction: '奥术学院' },
  { id: 72, name: '命运编织者', cost: 3, quality: '彩', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '刷新增幅：我方场上所有单位再次触发法力增幅+净化沉默', skills: ['refreshBoost', 'cleanseSilence'], faction: '奥术学院' },
  { id: 80, name: '禁制封印', cost: 4, quality: '彩', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '对一个目标造成4点伤害，敌方下回合无法抽牌', skills: ['magicDmg', 'silence'], faction: '奥术学院' },
];

// ======== 通用 4张 ========
const NEUTRAL_CARDS: CardDef[] = [
  { id: 75, name: '知己知彼', cost: 4, quality: '彩', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '立即抽取数张卡牌，直到与对方手牌相同（至少抽2张）', skills: ['drawCard'], faction: '通用' },
  { id: 78, name: '天火降临', cost: 8, quality: '彩', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '对对手的总部造成12点伤害', skills: ['magicDmg'], faction: '通用' },
  { id: 81, name: '混乱风暴', cost: 5, quality: '彩', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '敌方下回合无法部署任意卡牌，只能打出法术卡，立即对场上所有单位造成1点伤害', skills: ['silence', 'magicDmg'], faction: '通用' },
  { id: 82, name: '计划', cost: 2, quality: '铜', type: '法术', subtype: '法术卡', atk: 0, hp: 0, armor: 0, desc: '抽取1', skills: ['drawCard'], faction: '通用' },
];

/** 魔法士兵子类型（type=法术 的卡为 subtype 法术卡，与此不同） */
export function isMagicUnitSubtype(subtype: string): boolean {
  return subtype === '魔法';
}

export const ALL_CARDS: CardDef[] = [...EMPIRE_CARDS, ...WILD_CARDS, ...ARCANE_CARDS, ...NEUTRAL_CARDS];

export function getCardsByFaction(faction: string): CardDef[] {
  return ALL_CARDS.filter(c => c.faction === faction);
}

export function getFactionCardsForDeck(faction: Faction): CardDef[] {
  switch (faction) {
    case 'empire': return EMPIRE_CARDS;
    case 'wild': return WILD_CARDS;
    case 'arcane': return ARCANE_CARDS;
  }
}

// 品质颜色映射
export const QUALITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  '铜': { bg: 'bg-amber-900', border: 'border-amber-700', text: 'text-amber-200', glow: 'shadow-amber-900/50' },
  '银': { bg: 'bg-slate-600', border: 'border-slate-400', text: 'text-slate-200', glow: 'shadow-slate-500/50' },
  '金': { bg: 'bg-yellow-700', border: 'border-yellow-500', text: 'text-yellow-200', glow: 'shadow-yellow-600/50' },
  '彩': { bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600', border: 'border-purple-400', text: 'text-white', glow: 'shadow-purple-500/50' },
};

// 子类型射程映射
export const SUBTYPE_RANGE: Record<string, number> = {
  '近战': 1,
  '弓箭': 2,
  '狙击': 999,
  '魔法': 999,
  '随机': 999,
};

// 子类型伤害类型
import type { Faction } from '@/types/game';

export function getDamageType(subtype: string): DamageType {
  if (isMagicUnitSubtype(subtype)) return '魔法';
  if (subtype === '随机') return '真实';
  return '物理';
}
