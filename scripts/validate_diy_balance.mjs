import assert from 'node:assert/strict';
import { judgeCard } from '../src/data/diySystem.ts';

const soldier = (overrides) => ({
  cost: 1,
  atk: 1,
  hp: 1,
  armor: 0,
  type: '士兵',
  subtype: '近战',
  position: 'front',
  skills: [],
  ...overrides,
});

const cases = [
  {
    name: '1费4/4近战白板可保存',
    card: soldier({ cost: 1, atk: 4, hp: 4 }),
    check: result => result.canSave && ['彩色平衡', '彩色高危'].includes(result.verdict),
  },
  {
    name: '1费4/4闪击被低费高身材规则拒绝',
    card: soldier({ cost: 1, atk: 4, hp: 4, skills: ['闪击'] }),
    check: result => !result.canSave && result.verdict === '破坏性组合',
  },
  {
    name: '1费4/4随机因低费攻击过高被拒绝',
    card: soldier({ cost: 1, atk: 4, hp: 4, subtype: '随机' }),
    check: result => !result.canSave && result.hardRuleViolations.includes('低费魔法/随机/狙击单位攻击过高'),
  },
  {
    name: '2费5/5近战白板可保存',
    card: soldier({ cost: 2, atk: 5, hp: 5 }),
    check: result => result.canSave,
  },
  {
    name: '2费5/5嘲讽被满上限身材规则拒绝',
    card: soldier({ cost: 2, atk: 5, hp: 5, skills: ['嘲讽'] }),
    check: result => !result.canSave && result.verdict === '破坏性组合',
  },
  {
    name: '5费随机飞翔强运撕裂可保存且高危',
    card: soldier({ cost: 5, atk: 6, hp: 5, subtype: '随机', skills: ['飞翔', '强运', '撕裂'] }),
    check: result => result.canSave && result.verdict === '彩色高危',
  },
  {
    name: '7费闪击强化贯穿反击可保存',
    card: soldier({ cost: 7, atk: 7, hp: 7, skills: ['闪击', '强化贯穿', '反击'] }),
    check: result => result.canSave,
  },
  {
    name: '隐踪作为未开放技能被拒绝',
    card: soldier({ cost: 3, atk: 3, hp: 3, skills: ['隐踪'] }),
    check: result => !result.canSave && result.verdict === '未开放技能',
  },
  {
    name: '疾行正常参与评分',
    card: soldier({ cost: 3, atk: 3, hp: 3, skills: ['疾行'] }),
    check: result => result.verdict !== '未开放技能',
  },
  {
    name: '低费抽3法术被拒绝',
    card: { cost: 2, atk: 0, hp: 0, type: '法术', skills: ['抽牌3'] },
    check: result => !result.canSave && result.verdict === '破坏性组合',
  },
];

for (const testCase of cases) {
  const result = judgeCard(testCase.card);
  assert.equal(testCase.check(result), true, `${testCase.name}: ${JSON.stringify(result)}`);
  console.log(`PASS ${testCase.name} -> ${result.verdict}（偏差 ${result.deviation}）`);
}

console.log(`DIY 彩卡尺度回归验证通过：${cases.length}/${cases.length}`);
