import { useState, useCallback } from 'react';
import { ArrowLeft, Wand2, AlertTriangle, CheckCircle, XCircle, Sparkles, Save } from 'lucide-react';
import { SKILL_VALUES, SKILL_GROUPS, judgeCard, checkConflicts, saveDIYCard, CARD_TEMPLATES, mapSkillNameToCode } from '@/data/diySystem';
import type { JudgeResult, DIYCard } from '@/data/diySystem';
import type { Skill, DamageType } from '@/types/game';

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

export default function CardCreator({ onBack, onSaved }: Props) {
  // 基础信息
  const [name, setName] = useState('');
  const [cost, setCost] = useState(3);
  const [subtype, setSubtype] = useState<'近战' | '弓箭' | '魔法' | '随机' | '狙击'>('近战');
  const [hp, setHp] = useState(3);
  const [atk, setAtk] = useState(2);
  const [position, setPosition] = useState<'front' | 'back' | 'both'>('front');
  const [damageType, setDamageType] = useState<DamageType>('物理');
  const [skills, setSkills] = useState<string[]>(['', '', '']);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSkillChange = (index: number, value: string) => {
    const next = [...skills];
    next[index] = value;
    setSkills(next);
    setJudgeResult(null);
  };

  const handleJudge = useCallback(() => {
    const selectedSkills = skills.filter(Boolean);
    const result = judgeCard({ cost, atk, hp, armor: 0, type: '士兵', skills: selectedSkills, position, subtype });
    setJudgeResult(result);
  }, [cost, atk, hp, skills, position, subtype]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    if (!judgeResult?.canSave) return;

    const selectedSkills = skills.filter(Boolean);

    // P0-02: 严格类型安全的技能映射
    const mappedSkills: Skill[] = [];
    for (const s of selectedSkills) {
      const code = mapSkillNameToCode(s);
      if (code) {
        mappedSkills.push(code);
      } else {
        console.error(`未知技能: ${s}`);
      }
    }

    // 如果所有技能都映射失败，不允许保存
    if (mappedSkills.length === 0 && selectedSkills.length > 0) {
      return;
    }

    const diyCard: Omit<DIYCard, 'isDIY' | 'id'> & { isDIY: true; id: string } = {
      id: `diy_${Date.now()}`,
      name: name.trim(),
      cost,
      quality: '彩',
      type: '士兵',
      subtype,
      atk,
      hp,
      armor: 0,
      desc: selectedSkills.map(s => SKILL_VALUES[s]?.desc || s).join('；'),
      skills: mappedSkills, // Skill[] 类型，安全
      faction: '自定义',
      isDIY: true,
      position,
      damageType,
      createdAt: Date.now(),
      judgeResult,
    };

    saveDIYCard(diyCard as DIYCard);
    onSaved();
  }, [name, cost, subtype, hp, atk, position, damageType, skills, judgeResult, onSaved]);

  const applyTemplate = (templateId: string) => {
    const t = CARD_TEMPLATES[templateId];
    if (!t) return;
    setCost(t.suggestion.cost);
    setHp(t.suggestion.hp);
    setAtk(t.suggestion.atk);
    setSubtype(t.suggestion.subtype as typeof subtype);
    setPosition(t.suggestion.position);
    const newSkills = ['', '', ''];
    t.suggestion.skills.forEach((s, i) => { if (i < 3) newSkills[i] = s; });
    setSkills(newSkills);
    setJudgeResult(null);
    setShowTemplates(false);
  };

  const selectedSkills = skills.filter(Boolean);
  const conflicts = selectedSkills.length > 0 ? checkConflicts(selectedSkills) : [];

  // P2-03: 数值比较替代字符串比较
  const deviationNum = judgeResult ? Number(judgeResult.deviation) : 0;

  return (
    <div className="relative w-full min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
      <div className="fixed inset-0 bg-black/88 z-[1]" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-3 sm:px-4 py-6 pb-20">
        {/* 顶部栏 */}
        <div className="w-full max-w-2xl flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg text-gray-300 transition-all cursor-pointer hover:scale-105">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">
            <Wand2 className="w-5 h-5 inline mr-1" />创造新卡
          </h1>
          <button onClick={() => setShowTemplates(!showTemplates)} className="px-3 py-2 bg-purple-900/60 hover:bg-purple-800/60 border border-purple-600 rounded-lg text-purple-300 text-xs cursor-pointer transition-all">
            模板
          </button>
        </div>

        {/* 模板选择 */}
        {showTemplates && (
          <div className="w-full max-w-2xl flex flex-wrap gap-2">
            {Object.entries(CARD_TEMPLATES).map(([id, t]) => (
              <button key={id} onClick={() => applyTemplate(id)} className="px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-gray-300 text-xs hover:bg-gray-700 cursor-pointer transition-all hover:scale-105">
                <span className="font-bold text-white">{t.name}</span>
                <span className="text-gray-500 ml-1">{t.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* 基础信息 */}
        <div className="w-full max-w-2xl bg-gray-900/80 border border-gray-700 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-300">基础信息</h2>

          {/* 名称 */}
          <div>
            <label className="text-xs text-gray-400">卡牌名称（1-10字）</label>
            <input
              value={name}
              onChange={e => setName(e.target.value.slice(0, 10))}
              placeholder="输入卡牌名称..."
              className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* 费用 */}
          <div>
            <label className="text-xs text-gray-400">费用: <span className="text-blue-400 font-bold">{cost}</span></label>
            <input type="range" min={1} max={10} value={cost} onChange={e => { setCost(+e.target.value); setJudgeResult(null); }} className="w-full mt-1 accent-blue-500" />
            <div className="flex justify-between text-[10px] text-gray-500"><span>1</span><span>10</span></div>
          </div>

          {/* 攻击类型 */}
          <div>
            <label className="text-xs text-gray-400">攻击类型</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(['近战', '弓箭', '魔法', '随机', '狙击'] as const).map(s => (
                <button key={s} onClick={() => { setSubtype(s); setJudgeResult(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subtype === s ? 'bg-blue-700 text-white border border-blue-500' : 'bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 生命值 */}
          <div>
            <label className="text-xs text-gray-400">生命值: <span className="text-green-400 font-bold">{hp}</span></label>
            <input type="range" min={1} max={20} value={hp} onChange={e => { setHp(+e.target.value); setJudgeResult(null); }} className="w-full mt-1 accent-green-500" />
          </div>

          {/* 攻击值 */}
          <div>
            <label className="text-xs text-gray-400">攻击值: <span className="text-red-400 font-bold">{atk}</span></label>
            <input type="range" min={0} max={10} value={atk} onChange={e => { setAtk(+e.target.value); setJudgeResult(null); }} className="w-full mt-1 accent-red-500" />
          </div>

          {/* 部署位置 */}
          <div>
            <label className="text-xs text-gray-400">部署位置</label>
            <div className="flex gap-2 mt-1">
              {([
                { key: 'front' as const, label: '仅前线' },
                { key: 'back' as const, label: '仅底线' },
                { key: 'both' as const, label: '均可' },
              ]).map(p => (
                <button key={p.key} onClick={() => { setPosition(p.key); setJudgeResult(null); }} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${position === p.key ? 'bg-green-700 text-white border border-green-500' : 'bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* P1-02: 伤害类型 */}
          <div>
            <label className="text-xs text-gray-400">伤害类型</label>
            <div className="flex gap-2 mt-1">
              {([
                { key: '物理' as DamageType, label: '物理（默认）' },
                { key: '魔法' as DamageType, label: '魔法' },
                { key: '真实' as DamageType, label: '真实' },
              ]).map(d => (
                <button key={d.key} onClick={() => setDamageType(d.key)} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${damageType === d.key ? 'bg-purple-700 text-white border border-purple-500' : 'bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 技能选择 - P0-05: 按功能分组 */}
        <div className="w-full max-w-2xl bg-gray-900/80 border border-gray-700 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-300">技能选择（最多3个）</h2>

          {[0, 1, 2].map(i => (
            <div key={i}>
              <label className="text-xs text-gray-400">技能{i + 1}（可选）</label>
              <select
                value={skills[i]}
                onChange={e => handleSkillChange(i, e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm outline-none focus:border-yellow-500 cursor-pointer"
              >
                <option value="">-- 选择技能 --</option>
                {SKILL_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.skills.map(s => {
                      // 只显示SKILL_VALUES中实际存在的技能
                      if (!SKILL_VALUES[s]) return null;
                      return (
                        <option key={s} value={s}>
                          {s} ({SKILL_VALUES[s]?.desc})
                        </option>
                      );
                    }).filter(Boolean)}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}

          {/* 冲突警告 */}
          {conflicts.length > 0 && (
            <div className="space-y-1">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5 bg-yellow-900/30 border border-yellow-700 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <span className="text-yellow-400 text-xs">{c.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 评判按钮 */}
        <button
          onClick={handleJudge}
          className="w-full max-w-2xl py-3 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 border border-cyan-500 rounded-lg text-white font-bold transition-all cursor-pointer hover:scale-[1.01] flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> 系统评判
        </button>

        {/* 评判结果 */}
        {judgeResult && (
          <div className={`w-full max-w-2xl rounded-xl border p-4 space-y-2 ${
            judgeResult.color === 'green' ? 'bg-green-950/40 border-green-700' :
            judgeResult.color === 'red' ? 'bg-red-950/40 border-red-700' :
            'bg-orange-950/40 border-orange-700'
          }`}>
            <div className="text-center">
              <h3 className={`text-lg font-bold ${
                judgeResult.color === 'green' ? 'text-green-400' :
                judgeResult.color === 'red' ? 'text-red-400' : 'text-orange-400'
              }`}>
                {judgeResult.verdict === '彩色平衡' ? <CheckCircle className="w-5 h-5 inline mr-1" /> :
                 !judgeResult.canSave ? <XCircle className="w-5 h-5 inline mr-1" /> :
                 <AlertTriangle className="w-5 h-5 inline mr-1" />}
                {judgeResult.verdict}
              </h3>
              {/* P2-03: 数值比较 */}
              <div className="text-xs text-gray-400 mt-1">偏差: {deviationNum > 0 ? '+' : ''}{judgeResult.deviation}</div>
            </div>

            <div className="space-y-1 text-xs text-gray-300">
              <div className="flex justify-between border-b border-gray-700 pb-1">
                <span className="text-gray-400">费用基准</span><span>{judgeResult.baseValue}</span>
              </div>
              <div className="flex justify-between border-b border-gray-700 pb-1">
                <span className="text-gray-400">基础身材</span><span>{judgeResult.bodyValue} ({atk}攻+{hp}血)</span>
              </div>
              <div className="flex justify-between border-b border-gray-700 pb-1">
                <span className="text-gray-400">技能价值</span><span>{judgeResult.skillValue}</span>
              </div>
              {judgeResult.details.subtypeTax !== 0 && (
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="text-gray-400">子类型税</span><span>+{judgeResult.details.subtypeTax.toFixed(1)}</span>
                </div>
              )}
              {judgeResult.positionBonus !== 0 && (
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="text-gray-400">部署修正</span><span>{judgeResult.positionBonus > 0 ? '+' : ''}{judgeResult.positionBonus.toFixed(1)}</span>
                </div>
              )}
              {judgeResult.details.synergyBonus !== 0 && (
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="text-gray-400">多技能协同</span><span>+{judgeResult.details.synergyBonus.toFixed(1)}</span>
                </div>
              )}
              {judgeResult.details.comboRisk !== 0 && (
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="text-gray-400">组合风险</span><span className="text-orange-400">+{judgeResult.details.comboRisk.toFixed(1)}</span>
                </div>
              )}
              {judgeResult.negativePenalty !== 0 && (
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="text-gray-400">负面修正</span><span className="text-green-400">{judgeResult.negativePenalty.toFixed(1)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>总价值</span><span>{judgeResult.totalValue}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>警戒线 +{judgeResult.details.warningLimit.toFixed(1)}</span>
                <span>破坏性上限 +{judgeResult.details.hardLimit.toFixed(1)}</span>
              </div>
            </div>

            {judgeResult.hardRuleViolations.length > 0 && (
              <div className="space-y-1">
                {judgeResult.hardRuleViolations.map((rule, i) => (
                  <div key={i} className="flex items-start gap-1.5 rounded-lg border border-red-700 bg-red-950/50 p-2 text-xs text-red-300">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{rule}
                  </div>
                ))}
              </div>
            )}

            {/* 建议 - P2-04: 动态生成 */}
            <div className="space-y-1">
              {judgeResult.suggestions.map((s, i) => (
                <div key={i} className="text-xs text-gray-400">• {s}</div>
              ))}
            </div>

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              disabled={!judgeResult.canSave || !name.trim()}
              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                judgeResult.canSave && name.trim()
                  ? 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 border border-green-500 text-white hover:scale-[1.01]'
                  : 'bg-gray-800 border border-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {judgeResult.canSave ? '保存为DIY卡' : '评判未通过，无法保存'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
