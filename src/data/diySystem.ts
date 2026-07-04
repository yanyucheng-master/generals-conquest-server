// ======== DIY系统核心数据模块 ========
// 包含：技能价值表、技能代码映射、冲突规则、评判系统、DIY卡存储、卡组存储

import type { CardDef } from './cards';
import type { Skill, DamageType } from '@/types/game';

// ======== 1. 技能价值表 ========
export interface SkillValueEntry {
  value: number;
  desc: string;
}

export const SKILL_VALUES: Record<string, SkillValueEntry> = {
  '闪击': { value: 3.0, desc: '部署时额外攻击1次' },
  '嘲讽': { value: 2.0, desc: '强制敌方优先攻击' },
  '物抗1': { value: 1.5, desc: '物理减伤1' },
  '物抗2': { value: 3.0, desc: '物理减伤2' },
  '物抗3': { value: 4.5, desc: '物理减伤3' },
  '法抗1': { value: 1.2, desc: '法术减伤1' },
  '法抗2': { value: 2.4, desc: '法术减伤2' },
  '法抗3': { value: 3.6, desc: '法术减伤3' },
  '全抗1': { value: 2.0, desc: '全类型减伤1' },
  '全抗2': { value: 4.0, desc: '全类型减伤2' },
  '全抗3': { value: 6.0, desc: '全类型减伤3' },
  '全抗6': { value: 12.0, desc: '全类型减伤6' },
  '贯穿': { value: 1.0, desc: '无视护甲破碎保护' },
  '强化贯穿': { value: 2.0, desc: '完全无视护甲' },
  '强击': { value: 2.0, desc: '无视任意抗性' },
  '吸血': { value: 1.5, desc: '造成伤害回血' },
  '反击': { value: 1.5, desc: '被近战攻击反打' },
  '伏击1': { value: 1.5, desc: '受击前造成1点伤害' },
  '伏击2': { value: 3.0, desc: '受击前造成2点伤害' },
  '伏击3': { value: 4.5, desc: '受击前造成3点伤害' },
  '闪避': { value: 1.5, desc: '50%闪避物理攻击' },
  '飞翔': { value: 2.5, desc: '闪避近战/弓箭' },
  '精准1': { value: 2.0, desc: '狙击+1伤且必中' },
  '精准2': { value: 4.0, desc: '狙击+2伤且必中' },
  '俯冲1': { value: 2.0, desc: '飞翔+距离不限+物伤+1' },
  '俯冲2': { value: 4.0, desc: '飞翔+距离不限+物伤+2' },
  '防空1': { value: 1.0, desc: '打飞翔必中+1伤' },
  '防空2': { value: 2.0, desc: '打飞翔必中+2伤' },
  '战术指挥1': { value: 2.0, desc: '全体近战+1攻' },
  '战术指挥2': { value: 4.0, desc: '全体近战+2攻' },
  '战术指挥3': { value: 5.0, desc: '全体近战+3攻' },
  '射击指挥1': { value: 2.0, desc: '全体弓箭+1攻' },
  '射击指挥2': { value: 4.0, desc: '全体弓箭+2攻' },
  '射击指挥3': { value: 5.0, desc: '全体弓箭+3攻' },
  '法力增幅1': { value: 2.5, desc: '全体魔法+1攻（一次性）' },
  '法力增幅2': { value: 5.0, desc: '全体魔法+2攻（一次性）' },
  '法力增幅5': { value: 10.0, desc: '全体魔法+5攻（一次性）' },
  '沉默1': { value: 5.0, desc: '敌方全体沉默1回合' },
  '沉默2': { value: 8.0, desc: '敌方全体沉默2回合' },
  '沉默5': { value: 14.0, desc: '敌方全体沉默5回合' },
  '叱吓1': { value: 2.0, desc: '敌方近战/弓箭-1攻' },
  '叱吓2': { value: 4.0, desc: '敌方近战/弓箭-2攻' },
  '均衡3': { value: 5.5, desc: '手牌士兵费用变3' },
  '均衡4': { value: 3.5, desc: '手牌士兵费用变4' },
  '均衡5': { value: 1.5, desc: '手牌士兵费用变5' },
  '集火': { value: 2.0, desc: '标记目标强制集火' },
  '长矛': { value: 1.5, desc: '近战射程变2' },
  '短弓': { value: 1.0, desc: '弓箭可打距离1' },
  '隐蔽': { value: 1.5, desc: '底线规避3种攻击' },
  '免疫': { value: 2.0, desc: '无法被法术指定' },
  '疾行': { value: 1.5, desc: '每回合移动1次' },
  '干扰': { value: 1.5, desc: '狙击目标随机化' },
  '魔术': { value: 1.5, desc: '随机交换敌方位置' },
  '追击1': { value: 1.5, desc: '敌方部署时造成1点伤害' },
  '灵动1': { value: 2.0, desc: '位移时全属性+1' },
  '生长1': { value: 1.0, desc: '受治疗时全属性+1' },
  '流血1': { value: 1.2, desc: '附加1层流血' },
  '流血2': { value: 2.4, desc: '附加2层流血' },
  '流血3': { value: 3.6, desc: '附加3层流血' },
  '撕裂': { value: 1.0, desc: '触发流血层数伤害' },
  '中毒1': { value: 1.5, desc: '附加1层中毒' },
  '中毒2': { value: 3.0, desc: '附加2层中毒' },
  '中毒3': { value: 4.5, desc: '附加3层中毒' },
  '中毒6': { value: 9.0, desc: '附加6层中毒' },
  '毒爆': { value: 1.0, desc: '触发中毒层数伤害并清空' },
  '治疗1': { value: 1.2, desc: '战斗后随机奶1友方1血' },
  '治疗2': { value: 2.4, desc: '战斗后随机奶1友方2血' },
  '群体治疗1': { value: 1.5, desc: '战斗后奶全体友方1血' },
  '群体治疗2': { value: 3.0, desc: '战斗后奶全体友方2血' },
  '利息1': { value: 1.0, desc: '每回合+1金币' },
  '利息2': { value: 2.0, desc: '每回合+2金币' },
  '利息3': { value: 4.0, desc: '每回合+3金币' },
  '萃取1': { value: 1.0, desc: '击杀+1金币' },
  '萃取2': { value: 2.0, desc: '击杀+2金币' },
  '悬赏': { value: -0.5, desc: '被击杀敌方+1金币（负面）' },
  '迷雾': { value: 1.0, desc: '隐藏友方信息' },
  '隐踪': { value: 1.5, desc: '背面放置，无法术指定' },
  '伪装': { value: 1.0, desc: '无法被狙击/随机选中' },
  '魔力子弹': { value: 1.5, desc: '狙击视为魔法且不反弹' },
  '圣光': { value: 1.0, desc: '弃掉敌方谜语' },
  '谜境': { value: 1.5, desc: '激活手牌谜语' },
  '复仇': { value: 2.0, desc: '友方阵亡时插入攻击' },
  '强运': { value: 1.5, desc: '随机伤害取最大值' },
  '法术反弹': { value: 2.0, desc: '反弹法术伤害' },
  '法力贯穿': { value: 1.5, desc: '法术无视反弹和抗性' },
  '护甲1': { value: 1.0, desc: '部署时+1护甲' },
  '护甲2': { value: 2.0, desc: '部署时+2护甲' },
  '护甲3': { value: 3.0, desc: '部署时+3护甲' },
  // 法术卡技能
  '消灭': { value: 8.0, desc: '直接消灭一个单位' },
  '刷新增幅': { value: 6.0, desc: '刷新所有法力增幅' },
  '净化沉默': { value: 3.0, desc: '净化沉默效果' },
  '魔法伤害': { value: 3.0, desc: '造成法术伤害' },
  '魔法伤害1': { value: 1.5, desc: '造成1点法术伤害' },
  '魔法伤害2': { value: 3.0, desc: '造成2点法术伤害' },
  '魔法伤害6': { value: 7.0, desc: '造成6点法术伤害' },
  '总部伤害12': { value: 12.0, desc: '对敌方总部造成12点伤害' },
  '天火降临': { value: 10.0, desc: '对敌方总部造成高额伤害' },
  // 新增技能（V1.0 新卡包）
  '抽牌': { value: 3.0, desc: '抽取卡牌' },
  '抽牌1': { value: 3.0, desc: '抽取1张卡牌' },
  '抽牌2': { value: 5.0, desc: '抽取2张卡牌' },
  '抽牌3': { value: 7.0, desc: '抽取3张卡牌' },
  '总部恢复': { value: 2.5, desc: '恢复总部生命' },
  '弃牌': { value: 3.0, desc: '弃掉对手手牌' },
};

// 获取所有可用技能名称（用于下拉选择）
export const ALL_SKILL_NAMES = Object.keys(SKILL_VALUES).sort();

// ======== 1.5 技能中文名 → Skill代码映射（完全匹配，严格类型安全）========
export const SKILL_CODE_MAP: Record<string, Skill> = {
  // 基础技能（无等级后缀）
  '闪击': 'flashStrike',
  '嘲讽': 'taunt',
  '吸血': 'lifesteal',
  '反击': 'counter',
  '贯穿': 'pierce',
  '强化贯穿': 'piercePlus',
  '强击': 'strongStrike',
  '闪避': 'dodge',
  '飞翔': 'fly',
  '隐踪': 'stealth',
  '免疫': 'immune',
  '疾行': 'agile',
  '长矛': 'spear',
  '短弓': 'shortBow',
  '隐蔽': 'conceal',
  '伪装': 'disguise',
  '撕裂': 'tear',
  '毒爆': 'poisonBurst',
  '集火': 'focusFire',
  '魔术': 'magicSwap',
  '干扰': 'jamming',
  '圣光': 'holyLight',
  '谜境': 'riddleRealm',
  '复仇': 'revenge',
  '强运': 'lucky',
  '悬赏': 'bounty',
  '迷雾': 'fog',
  '魔力子弹': 'magicBullet',
  '法术反弹': 'spellReflect',
  '灵动': 'nimble',
  '灵动1': 'nimble',
  '护盾': 'shield',
  '护盾1': 'shield',
  '护盾2': 'shield',
  '护盾3': 'shield',
  '消灭': 'destroy',
  '刷新增幅': 'refreshBoost',
  '净化沉默': 'cleanseSilence',
  '魔法伤害': 'magicDmg',
  '魔法伤害1': 'magicDmg',
  '魔法伤害2': 'magicDmg',
  '魔法伤害6': 'magicDmg',
  '总部伤害12': 'magicDmg',
  '天火降临': 'magicDmg',
  '抽牌': 'drawCard',
  '抽牌1': 'drawCard',
  '抽牌2': 'drawCard',
  '抽牌3': 'drawCard',
  '总部恢复': 'healHQ',
  '弃牌': 'discard',
  '生长': 'growth',
  '生长1': 'growth',
  '均衡': 'balance',
  '均衡3': 'balance',
  '均衡4': 'balance',
  '均衡5': 'balance',
  '追击': 'pursuit',
  '追击1': 'pursuit',
  '萃取': 'extract',
  '萃取1': 'extract',
  '萃取2': 'extract',
  '利息': 'interest',
  '治疗': 'heal',
  '群体治疗': 'aoeHeal',
  '护甲': 'armor',
  '流血': 'bleed',
  '中毒': 'poison',
  '法力贯穿': 'magicPierce',
  // 有等级后缀的技能 - 每个具体名称单独映射
  '物抗1': 'physResist',
  '物抗2': 'physResist',
  '物抗3': 'physResist',
  '法抗1': 'magicResist',
  '法抗2': 'magicResist',
  '法抗3': 'magicResist',
  '全抗1': 'allResist',
  '全抗2': 'allResist',
  '全抗3': 'allResist',
  '全抗6': 'allResist',
  '伏击1': 'ambush',
  '伏击2': 'ambush',
  '伏击3': 'ambush',
  '精准1': 'precision',
  '精准2': 'precision',
  '俯冲1': 'dive',
  '俯冲2': 'dive',
  '防空1': 'antiAir',
  '防空2': 'antiAir',
  '战术指挥1': 'tacticCmd',
  '战术指挥2': 'tacticCmd',
  '战术指挥3': 'tacticCmd',
  '射击指挥1': 'shootCmd',
  '射击指挥2': 'shootCmd',
  '射击指挥3': 'shootCmd',
  '法力增幅1': 'magicBoost',
  '法力增幅2': 'magicBoost',
  '法力增幅5': 'magicBoost',
  '沉默1': 'silence',
  '沉默2': 'silence',
  '沉默5': 'silence',
  '叱吓1': 'intimidate',
  '叱吓2': 'intimidate',
  '护甲1': 'armor',
  '护甲2': 'armor',
  '护甲3': 'armor',
  '流血1': 'bleed',
  '流血2': 'bleed',
  '流血3': 'bleed',
  '中毒1': 'poison',
  '中毒2': 'poison',
  '中毒3': 'poison',
  '中毒6': 'poison',
  '治疗1': 'heal',
  '治疗2': 'heal',
  '群体治疗1': 'aoeHeal',
  '群体治疗2': 'aoeHeal',
  '利息1': 'interest',
  '利息2': 'interest',
  '利息3': 'interest',
};

// 技能分组（用于UI下拉分组显示）
export interface SkillGroup {
  label: string;
  skills: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: '攻击类',
    skills: ['闪击', '贯穿', '强化贯穿', '强击', '吸血', '俯冲1', '俯冲2', '精准1', '精准2', '魔力子弹', '长矛', '短弓'],
  },
  {
    label: '防御类',
    skills: ['物抗1', '物抗2', '物抗3', '法抗1', '法抗2', '法抗3', '全抗1', '全抗2', '全抗3', '全抗6', '护甲1', '护甲2', '护甲3', '闪避', '飞翔', '隐蔽', '免疫', '伪装'],
  },
  {
    label: '控制类',
    skills: ['沉默1', '沉默2', '沉默5', '嘲讽', '干扰', '叱吓1', '叱吓2', '集火', '魔术'],
  },
  {
    label: 'DOT/特效',
    skills: ['流血1', '流血2', '流血3', '撕裂', '中毒1', '中毒2', '中毒3', '中毒6', '毒爆', '伏击1', '伏击2', '伏击3'],
  },
  {
    label: '光环/辅助',
    skills: ['战术指挥1', '战术指挥2', '战术指挥3', '射击指挥1', '射击指挥2', '射击指挥3', '法力增幅1', '法力增幅2', '法力增幅5', '强运', '生长1'],
  },
  {
    label: '经济/治疗',
    skills: ['利息1', '利息2', '利息3', '萃取1', '萃取2', '悬赏', '治疗1', '治疗2', '群体治疗1', '群体治疗2'],
  },
  {
    label: '特殊',
    skills: ['疾行', '复仇', '迷雾', '法术反弹', '法力贯穿', '均衡3', '均衡4', '均衡5', '圣光', '谜境'],
  },
];

// 将中文技能名映射为 Skill 代码（严格类型安全）
export function mapSkillNameToCode(chineseName: string): Skill | null {
  return SKILL_CODE_MAP[chineseName] ?? null;
}

// ======== 2. 冲突规则 ========
export interface ConflictRule {
  skills: string[];
  requires?: string;
  reason: string;
  type: 'overlap' | 'contradiction' | 'synergy' | 'missing' | 'mismatch' | 'negative';
}

export const CONFLICT_RULES: ConflictRule[] = [
  // 功能重叠
  { skills: ['飞翔', '闪避'], reason: '飞翔已包含闪避效果，功能重叠', type: 'overlap' },
  { skills: ['隐蔽', '免疫'], reason: '隐蔽和免疫都提供法术生存能力，功能重叠', type: 'overlap' },
  { skills: ['贯穿', '强化贯穿'], reason: '强化贯穿完全包含贯穿效果', type: 'overlap' },
  { skills: ['干扰', '精准'], reason: '两者都影响狙击行为，功能重叠', type: 'overlap' },
  { skills: ['免疫', '全抗'], reason: '免疫已包含法术免疫，全抗重复', type: 'overlap' },
  // 逻辑矛盾
  { skills: ['嘲讽', '隐蔽'], reason: '嘲讽需要被攻击，隐蔽避免被攻击，逻辑矛盾', type: 'contradiction' },
  { skills: ['闪击', '伏击'], reason: '闪击主动攻击，伏击被动防守，风格冲突', type: 'contradiction' },
  { skills: ['飞翔', '隐蔽'], reason: '飞翔在空中，隐蔽需在底线，逻辑矛盾', type: 'contradiction' },
  { skills: ['嘲讽', '隐踪'], reason: '嘲讽需要被攻击，隐踪避免被法术指定，功能矛盾', type: 'contradiction' },
  { skills: ['闪击', '隐蔽'], reason: '闪击主动进攻，隐蔽被动防守，风格冲突', type: 'contradiction' },
  { skills: ['法术反弹', '法力贯穿'], reason: '一个反弹法术，一个穿透反弹，逻辑矛盾', type: 'contradiction' },
  { skills: ['悬赏', '嘲讽'], reason: '嘲讽吸引攻击，悬赏被击杀给敌方金币，负面叠加', type: 'negative' },
  // 依赖缺失（动态检测）
  { skills: ['俯冲'], requires: '飞翔', reason: '俯冲必须配合飞翔才能生效', type: 'missing' },
  { skills: ['撕裂'], requires: '流血', reason: '撕裂必须配合流血才能生效', type: 'missing' },
  { skills: ['毒爆'], requires: '中毒', reason: '毒爆必须配合中毒才能生效', type: 'missing' },
  // 攻击类型不匹配
  { skills: ['闪击', '狙击'], reason: '闪击需要近战范围，狙击在底线远程攻击，不匹配', type: 'mismatch' },
  { skills: ['长矛', '狙击'], reason: '长矛增加近战射程，狙击在底线远程攻击，不匹配', type: 'mismatch' },
];

// 检测冲突（修复重复添加BUG）
export function checkConflicts(selectedSkills: string[]): ConflictRule[] {
  const conflicts: ConflictRule[] = [];
  const checked = new Set<string>();

  // 1. 检测冲突对（不含依赖缺失规则）
  for (const rule of CONFLICT_RULES) {
    if (rule.requires) continue; // 依赖规则单独处理

    const key = [...rule.skills].sort().join('|');
    if (checked.has(key)) continue;

    const hasAll = rule.skills.every(s =>
      selectedSkills.some(ss => ss.includes(s))
    );
    if (hasAll) {
      conflicts.push({ ...rule });
      checked.add(key);
    }
  }

  // 2. 检测依赖缺失（只做一次）
  const dependencyRules = CONFLICT_RULES.filter(r => r.requires);
  for (const skill of selectedSkills) {
    const rule = dependencyRules.find(r => skill.includes(r.skills[0]));
    if (rule) {
      const hasRequired = selectedSkills.some(s => s.includes(rule.requires!));
      if (!hasRequired) {
        const key = `missing|${skill}`;
        if (!checked.has(key)) {
          conflicts.push({
            skills: [skill],
            requires: rule.requires,
            reason: `${skill}需要${rule.requires}才能生效，建议添加${rule.requires}`,
            type: 'missing',
          });
          checked.add(key);
        }
      }
    }
  }

  return conflicts;
}

// ======== 3. 评判系统 ========
export interface JudgeResult {
  baseValue: string;
  bodyValue: number;
  skillValue: string;
  positionBonus: number;
  negativePenalty: number;
  /** 兼容旧存档；彩卡尺度中冲突不再降低评分。 */
  conflictPenalty: number;
  totalValue: string;
  deviation: string;
  verdict: '未开放技能' | '身材超出彩卡上限' | '破坏性组合' | '破坏性超模' | '彩色高危' | '彩色平衡' | '明显亏模';
  color: 'red' | 'orange' | 'green';
  skillDetails: { name: string; value: number; desc: string }[];
  conflicts: ConflictRule[];
  warnings: string[];
  hardRuleViolations: string[];
  details: {
    bodyValue: number;
    skillValue: number;
    positiveSkillValue: number;
    subtypeTax: number;
    positionBonus: number;
    synergyBonus: number;
    comboRisk: number;
    negativePenalty: number;
    hardLimit: number;
    warningLimit: number;
    lowerLimit: number;
  };
  suggestions: string[];
  canSave: boolean;
}

// 按攻击类型和位置计算修正值
const POSITION_MODIFIER: Record<string, Record<string, number>> = {
  '近战': { front: 0.5, back: -0.3, both: 0.3 },
  '弓箭': { front: 0.3, back: 0.5, both: 0.4 },
  '狙击': { front: 0.2, back: 0.6, both: 0.4 },
  '魔法': { front: 0.3, back: 0.4, both: 0.3 },
  '随机': { front: 0.3, back: 0.3, both: 0.3 },
};

const SUBTYPE_TAX: Record<string, number> = {
  '近战': 0,
  '弓箭': 0.3,
  '狙击': 0.7,
  '魔法': 1.0,
  '随机': 1.2,
};

const BODY_HARD_CAP: Record<number, number> = {
  1: 8,
  2: 10,
  3: 12,
  4: 14,
  5: 16,
  6: 18,
};

const UNIMPLEMENTED_SKILL_CODES = new Set<string>(['stealth', 'pursuit', 'nimble', 'agileGrowth', 'moveGrowth']);
export const UNIMPLEMENTED_DIY_SKILLS = ['隐踪', '追击', '灵动'] as const;

function hasSkill(skills: string[], family: string): boolean {
  return skills.some(skill => skill.includes(family));
}

function isUnimplementedSkill(skill: string): boolean {
  if (UNIMPLEMENTED_DIY_SKILLS.some(name => skill.includes(name))) return true;
  const code = SKILL_CODE_MAP[skill];
  return code !== 'agile' && UNIMPLEMENTED_SKILL_CODES.has(String(code ?? skill));
}

function getComboRisk(card: { cost: number; hp: number; skills: string[]; subtype?: string }, isSpell: boolean): number {
  const { skills } = card;
  const flash = hasSkill(skills, '闪击');
  const bleed = hasSkill(skills, '流血');
  const poison = hasSkill(skills, '中毒');
  const highDot = skills.some(skill => /^(流血|中毒)([3-9]|\d{2,})$/.test(skill));
  let risk = 0;

  if (flash && (bleed || poison)) risk += 1.5;
  if (flash && (hasSkill(skills, '毒爆') || hasSkill(skills, '撕裂'))) risk += 2;
  if (poison && hasSkill(skills, '毒爆')) risk += 1.5;
  if (bleed && hasSkill(skills, '撕裂')) risk += 1.2;
  if (hasSkill(skills, '飞翔') && hasSkill(skills, '俯冲')) risk += 0.8;
  if (hasSkill(skills, '嘲讽') && (hasSkill(skills, '全抗') || hasSkill(skills, '护甲') || hasSkill(skills, '反击'))) risk += 1;
  if (card.subtype === '随机' && hasSkill(skills, '强运')) risk += 1.2;
  if (card.subtype === '随机' && highDot) risk += 1;
  if (card.subtype === '魔法' && hasSkill(skills, '法力增幅')) risk += 1;
  if (hasSkill(skills, '法力增幅') && hasSkill(skills, '刷新增幅')) risk += 2;
  if (hasSkill(skills, '免疫') && card.subtype === '魔法' && card.hp >= 6) risk += 1.2;
  if (!isSpell && card.cost >= 6 && hasSkill(skills, '均衡3')) risk += 2;

  return risk;
}

function getBodyHardCap(cost: number): number {
  return BODY_HARD_CAP[cost] ?? 22;
}

export function judgeCard(card: {
  cost: number;
  atk: number;
  hp: number;
  armor?: number;
  type?: '士兵' | '法术';
  skills: string[];
  position?: string;
  subtype?: string;
}): JudgeResult {
  const isSpell = card.type === '法术' || (card.type !== '士兵' && card.hp === 0 && card.atk === 0);
  const baseValue = isSpell ? card.cost * 1.5 + 0.5 : card.cost * 2.2 + 1;
  const bodyValue = isSpell ? 0 : card.atk + card.hp + (card.armor ?? 0);

  let skillValue = 0;
  let negativePenalty = 0;
  let positiveSkillCount = 0;
  const skillDetails: { name: string; value: number; desc: string }[] = [];

  for (const skill of card.skills) {
    const entry = SKILL_VALUES[skill];
    if (entry) {
      if (entry.value >= 0) {
        skillValue += entry.value;
        if (entry.value > 0 && !isUnimplementedSkill(skill)) positiveSkillCount++;
      } else {
        negativePenalty += entry.value;
      }
      skillDetails.push({ name: skill, value: entry.value, desc: entry.desc });
    }
  }
  const positiveSkillValue = skillValue;

  let positionBonus = 0;
  if (!isSpell) {
    const posKey = card.position || 'front';
    const subKey = card.subtype || '近战';
    positionBonus = POSITION_MODIFIER[subKey]?.[posKey] || 0;
  }

  const conflicts = checkConflicts(card.skills);
  const conflictPenalty = 0;
  const subtypeTax = isSpell ? 0 : (SUBTYPE_TAX[card.subtype || '近战'] ?? 0);
  const synergyBonus = Math.max(0, positiveSkillCount - 1) * 0.6;
  const comboRisk = getComboRisk(card, isSpell);
  const totalValue = bodyValue + skillValue + subtypeTax + positionBonus + synergyBonus + comboRisk + negativePenalty;
  const deviation = totalValue - baseValue;
  const warningLimit = card.cost <= 2 ? 6 : card.cost <= 5 ? 7 : 8;
  const hardLimit = 9 + card.cost * 0.8;
  const lowerLimit = -8;

  const warnings = conflicts.map(conflict => conflict.reason);
  const hardRuleViolations: string[] = [];
  const unimplemented = card.skills.filter(isUnimplementedSkill);
  const bodyHardCap = getBodyHardCap(card.cost);

  if (!isSpell && bodyValue > bodyHardCap) {
    hardRuleViolations.push(`身材超出彩卡上限（${bodyValue} > ${bodyHardCap}）`);
  }
  if (!isSpell && card.cost === 1 && bodyValue >= 7 && positiveSkillCount > 0) {
    hardRuleViolations.push('1费高身材单位不能携带正面技能');
  }
  if (!isSpell && card.cost === 2 && bodyValue >= 9 && positiveSkillValue > 2) {
    hardRuleViolations.push('2费高身材单位的正面技能价值不能超过2');
  }
  if (!isSpell && card.cost === 3 && bodyValue >= 11 && positiveSkillValue > 4) {
    hardRuleViolations.push('3费高身材单位的正面技能价值不能超过4');
  }
  if (!isSpell && card.cost <= 2 && bodyValue >= bodyHardCap && positiveSkillCount > 0) {
    hardRuleViolations.push('低费满上限身材不能叠加正面技能');
  }
  if (!isSpell && card.cost <= 2 && ['魔法', '随机', '狙击'].includes(card.subtype || '') && card.atk > 3) {
    hardRuleViolations.push('低费魔法/随机/狙击单位攻击过高');
  }

  if (card.cost <= 2) {
    const bannedFamilies = ['闪击', '消灭', '沉默2', '沉默5', '均衡3', '法力增幅5', '刷新增幅', '抽牌3'];
    for (const family of bannedFamilies) {
      if (hasSkill(card.skills, family)) hardRuleViolations.push(`低费卡禁止携带${family}`);
    }
    if (hasSkill(card.skills, '中毒') && hasSkill(card.skills, '毒爆')) hardRuleViolations.push('低费卡禁止中毒与毒爆组合');
    if (hasSkill(card.skills, '流血') && hasSkill(card.skills, '撕裂')) hardRuleViolations.push('低费卡禁止流血与撕裂组合');
    if (card.skills.some(skill => /(?:总部(?:伤害|直伤)|天火).*?(?:8|9|\d{2,})/.test(skill) || skill === '天火降临')) {
      hardRuleViolations.push('低费卡禁止8点及以上总部直伤');
    }
    if (card.skills.some(skill => /(限制部署|禁止部署|封锁部署)/.test(skill))) {
      hardRuleViolations.push('低费卡禁止限制部署');
    }
  }
  if (card.cost < 6 && hasSkill(card.skills, '消灭')) hardRuleViolations.push('消灭最低费用为6');
  if (card.cost < 6 && hasSkill(card.skills, '法力增幅5')) hardRuleViolations.push('法力增幅5最低费用为6');

  if (deviation > warningLimit) warnings.push(`评分偏差超过彩色警戒线（+${warningLimit}）`);
  if (deviation < lowerLimit) warnings.push(`评分偏差低于彩色亏模线（${lowerLimit}）`);

  let verdict: JudgeResult['verdict'];
  let color: JudgeResult['color'];
  let canSave = true;

  if (unimplemented.length > 0) {
    verdict = '未开放技能';
    color = 'red';
    canSave = false;
    hardRuleViolations.unshift(`包含未开放技能：${unimplemented.join('、')}`);
  } else if (hardRuleViolations.some(rule => rule.startsWith('身材超出彩卡上限'))) {
    verdict = '身材超出彩卡上限';
    color = 'red';
    canSave = false;
  } else if (hardRuleViolations.length > 0) {
    verdict = '破坏性组合';
    color = 'red';
    canSave = false;
  } else if (deviation > hardLimit) {
    verdict = '破坏性超模';
    color = 'red';
    canSave = false;
    hardRuleViolations.push(`评分偏差超过破坏性上限（+${hardLimit.toFixed(1)}）`);
  } else if (deviation > warningLimit) {
    verdict = '彩色高危';
    color = 'orange';
  } else if (deviation >= lowerLimit) {
    verdict = '彩色平衡';
    color = 'green';
  } else {
    verdict = '明显亏模';
    color = 'orange';
  }

  const suggestions = [
    ...hardRuleViolations.map(rule => `阻止保存：${rule}`),
    ...warnings.map(warning => `注意：${warning}`),
  ];
  if (suggestions.length === 0) suggestions.push('卡牌处于彩色尺度可接受区间，可以保存。');

  return {
    baseValue: baseValue.toFixed(1),
    bodyValue,
    skillValue: skillValue.toFixed(1),
    positionBonus,
    negativePenalty,
    conflictPenalty,
    totalValue: totalValue.toFixed(1),
    deviation: deviation.toFixed(1),
    verdict,
    color,
    skillDetails,
    conflicts,
    warnings,
    hardRuleViolations,
    details: {
      bodyValue,
      skillValue,
      positiveSkillValue,
      subtypeTax,
      positionBonus,
      synergyBonus,
      comboRisk,
      negativePenalty,
      hardLimit,
      warningLimit,
      lowerLimit,
    },
    suggestions,
    canSave,
  };
}

// ======== 4. DIY卡存储 ========
const DIY_CARDS_KEY = 'generals_diy_cards';

export interface DIYCard {
  id: string;
  name: string;
  cost: number;
  quality: '彩';
  type: '士兵' | '法术';
  subtype: '近战' | '弓箭' | '魔法' | '随机' | '狙击';
  atk: number;
  hp: number;
  armor: number;
  desc: string;
  skills: Skill[];
  faction: string;
  isDIY: true;
  position: 'front' | 'back' | 'both';
  damageType?: DamageType;
  createdAt: number;
  judgeResult?: JudgeResult;
}

export function loadDIYCards(): DIYCard[] {
  try {
    const saved = localStorage.getItem(DIY_CARDS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

export function saveDIYCard(card: DIYCard): void {
  // P2-05: 检查同名卡牌
  const cards = loadDIYCards();
  if (cards.some(c => c.name === card.name)) {
    // 自动重命名：名称_1, 名称_2...
    let suffix = 1;
    let newName = `${card.name}_${suffix}`;
    while (cards.some(c => c.name === newName)) {
      suffix++;
      newName = `${card.name}_${suffix}`;
    }
    card.name = newName;
  }
  cards.push(card);
  localStorage.setItem(DIY_CARDS_KEY, JSON.stringify(cards));
}

export function deleteDIYCard(id: string): void {
  const cards = loadDIYCards().filter(c => c.id !== id);
  localStorage.setItem(DIY_CARDS_KEY, JSON.stringify(cards));

  // P1-09: 级联清理卡组中引用该DIY卡的条目
  const deck = loadDeck();
  const originalLength = deck.length;
  const cleanedDeck = deck.filter(e => String(e.cardId) !== id);
  if (cleanedDeck.length < originalLength) {
    saveDeck(cleanedDeck);
  }
}

export function clearAllDIYCards(): void {
  localStorage.removeItem(DIY_CARDS_KEY);
  // 同时清理引用DIY卡的卡组
  const deck = loadDeck();
  const cleanedDeck = deck.filter(e => !e.isDIY);
  saveDeck(cleanedDeck);
}

export function updateDIYCard(id: string, updated: Partial<DIYCard>): void {
  const cards = loadDIYCards();
  const idx = cards.findIndex(c => c.id === id);
  if (idx >= 0) {
    cards[idx] = { ...cards[idx], ...updated, id };
    localStorage.setItem(DIY_CARDS_KEY, JSON.stringify(cards));
  }
}

// ======== 5. 卡组存储 ========
const DECK_KEY = 'generals_my_deck';

export interface DeckEntry {
  cardId: string;
  isDIY: boolean;
}

export function loadDeck(): DeckEntry[] {
  try {
    const saved = localStorage.getItem(DECK_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

export function saveDeck(deck: DeckEntry[]): void {
  localStorage.setItem(DECK_KEY, JSON.stringify(deck));
}

export function clearDeck(): void {
  localStorage.removeItem(DECK_KEY);
}

// ======== 6. 品质与同卡上限配置 ========
export const QUALITY_LIMITS = {
  '铜': 4,
  '银': 3,
  '金': 2,
  '彩': 1,
};

export const REPEAT_LIMITS = {
  '铜': 4,
  '银': 3,
  '金': 2,
  '彩': 1,
  'diy': 1,
};

// ======== 7. 卡组验证 ========
export interface DeckValidation {
  valid: boolean;
  errors: string[];
  counts: { copper: number; silver: number; gold: number; rainbow: number; diy: number; total: number };
  // 同卡重复检查详情
  repeatErrors: string[];
}

export function validateDeck(
  deck: DeckEntry[],
  allOfficialCards: CardDef[],
  diyCards?: DIYCard[]
): DeckValidation {
  const errors: string[] = [];
  const repeatErrors: string[] = [];
  const counts = { copper: 0, silver: 0, gold: 0, rainbow: 0, diy: 0, total: deck.length };

  // 统计同卡出现次数
  const cardCountMap = new Map<string, number>();

  for (const entry of deck) {
    const id = String(entry.cardId);
    cardCountMap.set(id, (cardCountMap.get(id) || 0) + 1);

    if (entry.isDIY) {
      counts.diy++;
      if (diyCards && !diyCards.some(c => c.id === id)) {
        errors.push(`卡组引用了不存在的DIY卡: ${id}`);
      }
      // P1-08: DIY卡单独计数，不增加彩虹计数
      // DIY卡的品质固定为'彩'，但独立配额
    } else {
      const card = allOfficialCards.find(c => String(c.id) === id);
      if (card) {
        const rarityMap: Record<string, keyof typeof counts> = {
          '铜': 'copper', '银': 'silver', '金': 'gold', '彩': 'rainbow',
        };
        const key = rarityMap[card.quality];
        if (key) counts[key]++;
      } else {
        errors.push(`卡组引用了不存在的官方卡牌: ${id}`);
      }
    }
  }

  // 检查同卡重复上限
  for (const [id, count] of cardCountMap) {
    if (id.startsWith('diy_')) {
      if (count > REPEAT_LIMITS.diy) {
        repeatErrors.push(`DIY卡「${id}」超过重复上限(${REPEAT_LIMITS.diy}张)，当前${count}张`);
      }
    } else {
      const card = allOfficialCards.find(c => String(c.id) === id);
      if (card) {
        const limit = REPEAT_LIMITS[card.quality as keyof typeof REPEAT_LIMITS];
        if (limit && count > limit) {
          repeatErrors.push(`${card.quality}卡「${card.name}」超过重复上限(${limit}张)，当前${count}张`);
        }
      }
    }
  }

  // 只检查卡组总数（必须40张）和同卡重复上限
  // 不限制各品质卡牌的总数量
  if (deck.length !== 40) errors.push(`卡组必须为40张，当前${deck.length}张`);

  const allErrors = [...errors, ...repeatErrors];
  return { valid: allErrors.length === 0, errors: allErrors, counts, repeatErrors };
}

// ======== 8. 查找卡牌（统一类型安全）========
export function findCard(
  entry: DeckEntry,
  allOfficialCards: CardDef[],
  diyCards: DIYCard[]
): CardDef | DIYCard | undefined {
  const id = String(entry.cardId);
  if (entry.isDIY) {
    return diyCards.find(c => c.id === id);
  }
  return allOfficialCards.find(c => String(c.id) === id);
}

// ======== 9. 获取卡组完整卡牌数据 ========
export function getDeckCards(
  deck: DeckEntry[],
  allOfficialCards: CardDef[],
  diyCards: DIYCard[]
): (CardDef | DIYCard)[] {
  return deck.map(entry => findCard(entry, allOfficialCards, diyCards)).filter(Boolean) as (CardDef | DIYCard)[];
}

// ======== 10. 预设模板 ========
export const CARD_TEMPLATES: Record<string, {
  name: string;
  desc: string;
  suggestion: { cost: number; hp: number; atk: number; subtype: string; position: 'front' | 'back' | 'both'; skills: string[] };
}> = {
  tank: {
    name: '坦克模板',
    desc: '高生命+嘲讽+抗性，前线抗压',
    suggestion: { cost: 4, hp: 6, atk: 2, subtype: '近战', position: 'front', skills: ['嘲讽', '物抗2', '反击'] },
  },
  dps: {
    name: '输出模板',
    desc: '高攻击+闪击/贯穿，快速击杀',
    suggestion: { cost: 3, hp: 2, atk: 4, subtype: '近战', position: 'front', skills: ['闪击', '贯穿'] },
  },
  support: {
    name: '辅助模板',
    desc: '光环+治疗，团队增益',
    suggestion: { cost: 3, hp: 3, atk: 1, subtype: '魔法', position: 'back', skills: ['战术指挥1', '治疗1'] },
  },
  control: {
    name: '控制模板',
    desc: '沉默+干扰，限制敌方',
    suggestion: { cost: 3, hp: 2, atk: 2, subtype: '魔法', position: 'back', skills: ['沉默1', '干扰'] },
  },
  sniper: {
    name: '狙击模板',
    desc: '高狙击+精准，远程点杀',
    suggestion: { cost: 3, hp: 2, atk: 4, subtype: '狙击', position: 'back', skills: ['精准1', '隐蔽'] },
  },
  dot: {
    name: 'DOT模板',
    desc: '流血+中毒，持续伤害',
    suggestion: { cost: 3, hp: 3, atk: 2, subtype: '近战', position: 'front', skills: ['流血2', '撕裂'] },
  },
};

// ======== 11. 回归验证与数据管理 ========

// 当前数据版本号
const DATA_VERSION = '1.0';
const DATA_VERSION_KEY = 'generals_data_version';

/** 导出所有游戏数据为JSON */
export function exportGameData(): string {
  const data = {
    version: DATA_VERSION,
    timestamp: Date.now(),
    diyCards: loadDIYCards(),
    deck: loadDeck(),
  };
  return JSON.stringify(data, null, 2);
}

/** 下载游戏数据为JSON文件 */
export function downloadGameData(): void {
  const json = exportGameData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `将领征服_存档_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 从JSON字符串导入游戏数据 */
export function importGameData(jsonStr: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonStr);

    // 验证数据结构
    if (!data.diyCards || !Array.isArray(data.diyCards)) {
      return { success: false, message: '数据格式错误：缺少DIY卡数据' };
    }
    if (!data.deck || !Array.isArray(data.deck)) {
      return { success: false, message: '数据格式错误：缺少卡组数据' };
    }

    // 版本迁移
    if (data.version !== DATA_VERSION) {
      const migrated = migrateData(data);
      if (!migrated.success) {
        return { success: false, message: migrated.message };
      }
    }

    // 保存数据
    localStorage.setItem(DIY_CARDS_KEY, JSON.stringify(data.diyCards));
    localStorage.setItem(DECK_KEY, JSON.stringify(data.deck));
    localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);

    return { success: true, message: `导入成功！DIY卡${data.diyCards.length}张，卡组${data.deck.length}张` };
  } catch (e) {
    return { success: false, message: '数据解析失败：' + (e as Error).message };
  }
}

/** 从文件读取并导入 */
export function importGameDataFromFile(file: File): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(importGameData(text));
    };
    reader.onerror = () => resolve({ success: false, message: '文件读取失败' });
    reader.readAsText(file);
  });
}

/** 数据版本迁移 */
interface MigratableGameData {
  version?: string;
  diyCards?: Array<{ damageType?: DamageType; id: string | number }>;
  deck?: Array<{ cardId: string | number }>;
}

function migrateData(data: MigratableGameData): { success: boolean; message: string } {
  // 历史版本 → V1.0 迁移
  if (!data.version || data.version < '1.0') {
    // 迁移DIY卡：添加damageType字段（如果缺失）
    for (const card of data.diyCards || []) {
      if (!card.damageType) {
        card.damageType = '物理';
      }
      // 确保id是string类型
      if (typeof card.id === 'number') {
        card.id = `diy_${card.id}`;
      }
    }
    // 迁移卡组：确保cardId是string
    for (const entry of data.deck || []) {
      if (typeof entry.cardId === 'number') {
        entry.cardId = String(entry.cardId);
      }
    }
  }
  data.version = DATA_VERSION;
  return { success: true, message: '数据迁移完成' };
}

/** 检查并修复损坏的数据 */
export function checkAndRepairData(): { repaired: boolean; messages: string[] } {
  const messages: string[] = [];
  let repaired = false;

  // 检查DIY卡数据
  try {
    const raw = localStorage.getItem(DIY_CARDS_KEY);
    if (raw) {
      const cards = JSON.parse(raw);
      if (!Array.isArray(cards)) {
        messages.push('DIY卡数据损坏，已重置');
        localStorage.removeItem(DIY_CARDS_KEY);
        repaired = true;
      }
    }
  } catch {
    messages.push('DIY卡数据解析失败，已重置');
    localStorage.removeItem(DIY_CARDS_KEY);
    repaired = true;
  }

  // 检查卡组数据
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (raw) {
      const deck = JSON.parse(raw);
      if (!Array.isArray(deck)) {
        messages.push('卡组数据损坏，已重置');
        localStorage.removeItem(DECK_KEY);
        repaired = true;
      }
    }
  } catch {
    messages.push('卡组数据解析失败，已重置');
    localStorage.removeItem(DECK_KEY);
    repaired = true;
  }

  // 版本检查
  const savedVersion = localStorage.getItem(DATA_VERSION_KEY);
  if (savedVersion && savedVersion !== DATA_VERSION) {
    messages.push(`数据版本从${savedVersion}迁移到${DATA_VERSION}`);
    localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
    repaired = true;
  }

  if (!repaired) {
    messages.push('数据检查通过，未发现损坏');
  }

  return { repaired, messages };
}

/** 清除所有游戏数据 */
export function clearAllGameData(): void {
  localStorage.removeItem(DIY_CARDS_KEY);
  localStorage.removeItem(DECK_KEY);
  localStorage.removeItem(DATA_VERSION_KEY);
}

/** 获取所有localStorage中的游戏数据键 */
export function getGameDataKeys(): string[] {
  return [DIY_CARDS_KEY, DECK_KEY, DATA_VERSION_KEY];
}
