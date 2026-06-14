import type { Skill } from '@/types/game';
import { SKILL_LABELS, SKILL_NAMES } from '@/types/game';

const HIDDEN_EFFECT_CODES = new Set(['magicDmg', 'manaPierce']);

export function getVisibleSkills<T extends string>(skills: T[]): T[] {
  return skills.filter(skill => !HIDDEN_EFFECT_CODES.has(skill));
}

export function getSkillDisplayName(skill: string): string {
  return SKILL_NAMES[skill] || skill;
}

// 需要显示数值的技能及其正则匹配模式
const SKILL_NUM_PATTERNS: { skill: Skill; pattern: RegExp; defaultNum?: string }[] = [
  { skill: 'bleed', pattern: /流血(\d+)/, defaultNum: '1' },
  { skill: 'poison', pattern: /中毒(\d+)/, defaultNum: '2' },
  { skill: 'ambush', pattern: /伏击(\d+)/, defaultNum: '2' },
  { skill: 'physResist', pattern: /物抗(\d+)/, defaultNum: '2' },
  { skill: 'magicResist', pattern: /法抗(\d+)/, defaultNum: '2' },
  { skill: 'allResist', pattern: /全抗(\d+)/, defaultNum: '2' },
  { skill: 'intimidate', pattern: /叱吓(\d+)/, defaultNum: '2' },
  { skill: 'pursuit', pattern: /追击(\d+)/, defaultNum: '1' },
  { skill: 'dive', pattern: /俯冲(\d+)/, defaultNum: '2' },
  { skill: 'extract', pattern: /萃取(\d+)/, defaultNum: '2' },
  { skill: 'interest', pattern: /利息(\d+)/, defaultNum: '1' },
  { skill: 'antiAir', pattern: /防空(\d+)/, defaultNum: '2' },
  { skill: 'silence', pattern: /沉默(\d+)/, defaultNum: '1' },
  { skill: 'magicBoost', pattern: /(?:法力)?增幅(\d+)/, defaultNum: '1' },
  { skill: 'balance', pattern: /均衡(\d+)/, defaultNum: '4' },
  { skill: 'precision', pattern: /精准(\d+)/, defaultNum: '1' },
  { skill: 'tacticCmd', pattern: /战术指挥(\d+)/, defaultNum: '1' },
  { skill: 'shootCmd', pattern: /射击指挥(\d+)/, defaultNum: '1' },
  { skill: 'armor', pattern: /护甲(\d+)/, defaultNum: '1' },
  { skill: 'heal', pattern: /治疗(\d+)/, defaultNum: '1' },
  { skill: 'aoeHeal', pattern: /群体治疗(\d+)/, defaultNum: '1' },
  { skill: 'healHQ', pattern: /总部(?:恢复|回复)(\d+)/, defaultNum: '3' },
  { skill: 'growth', pattern: /生长(\d+)/, defaultNum: '1' },
  { skill: 'nimble', pattern: /灵动(\d+)/, defaultNum: '1' },
];

// 从desc中解析技能标签（含数值）
export function parseSkillLabels(skills: Skill[] | undefined, desc: string): string[] {
  return getVisibleSkillLabels(skills ?? [], desc, 3);
}

export function getVisibleSkillLabels(skills: string[], desc: string, limit = Number.POSITIVE_INFINITY): string[] {
  const labels: string[] = [];
  for (const skill of getVisibleSkills(skills)) {
    const patternEntry = SKILL_NUM_PATTERNS.find(pattern => pattern.skill === skill);
    const baseName = SKILL_LABELS[skill] || SKILL_NAMES[skill] || skill;
    if (patternEntry) {
      const match = desc.match(patternEntry.pattern);
      labels.push(`${baseName}${match?.[1] ?? patternEntry.defaultNum ?? ''}`);
    } else {
      labels.push(baseName);
    }
  }
  return labels.slice(0, limit);
}
