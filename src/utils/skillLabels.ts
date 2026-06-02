import type { Skill } from '@/types/game';
import { SKILL_LABELS } from '@/types/game';

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
  { skill: 'magicBoost', pattern: /法力增幅(\d*)/, defaultNum: '1' },
  { skill: 'balance', pattern: /均衡(\d+)/, defaultNum: '4' },
  { skill: 'precision', pattern: /精准(\d+)/, defaultNum: '1' },
  { skill: 'magicPierce', pattern: /法力贯穿/, defaultNum: '' },
];

// 从desc中解析技能标签（含数值）
export function parseSkillLabels(skills: Skill[] | undefined, desc: string): string[] {
  const labels: string[] = [];

  for (const sk of skills ?? []) {
    // 尝试匹配带数值的技能
    const patternEntry = SKILL_NUM_PATTERNS.find(p => p.skill === sk);
    if (patternEntry) {
      const match = desc.match(patternEntry.pattern);
      if (match && match[1]) {
        labels.push(`${SKILL_LABELS[sk] || sk}${match[1]}`);
      } else {
        labels.push(`${SKILL_LABELS[sk] || sk}${patternEntry.defaultNum}`);
      }
    } else {
      // 无数值的技能直接显示名称
      const name = SKILL_LABELS[sk];
      if (name) labels.push(name);
    }
  }

  // 最多返回3个
  return labels.slice(0, 3);
}
