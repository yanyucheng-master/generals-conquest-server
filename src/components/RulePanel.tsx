import { useState } from 'react';
import { BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SKILL_LABELS } from '@/types/game';

const GAME_RULES = [
  { title: '战场结构', content: '双方各有底线（3格，中置为总部40HP）和前线（3格）。共4行×3列。' },
  { title: '前线不存在规则', content: '若一条前线的3格均无任何单位，则该前线在距离计算中被完全跳过。' },
  { title: '精确射程', content: '近战=1，弓箭=2，狙击≥2（距离1为盲区），魔法=不限。横向不消耗距离。' },
  { title: '攻击顺序', content: '前线左→前线中→前线右→底线左→底线中→底线右，每个单位攻击间隔1000ms。闪击单位部署时立即攻击。' },
  { title: '狙击规则', content: '多狙击共享1个手动指定目标。距离1盲区或射程不匹配则跳过攻击。敌方有【干扰】时目标随机化。' },
  { title: '护甲体系', content: '物理伤害先扣护甲；护甲破碎时溢出物理伤害被抵挡。法伤/真伤无视护甲。贯穿可破甲。' },
  { title: '伤害类型', content: '物理（近战/弓箭/狙击/随机）、魔法（无视护甲）、真实（随机伤害）。' },
  { title: '自动攻击优先级', content: '嘲讽单位优先。弓箭按斜方向规则（优先最远列）。近战/魔法优先正前方→左→右。' },
  { title: '回合流程', content: '资源阶段（金币+抽牌+利息+解冻）→部署阶段→攻击阶段→结束阶段→切换回合。' },
];

// 42个技能词典
const SKILL_ENTRIES = Object.entries(SKILL_LABELS).map(([key, label]) => {
  const descs: Record<string, string> = {
    flashStrike: '部署时立即额外攻击1次',
    taunt: '敌方优先攻击此单位',
    pierce: '无视护甲破碎保护，溢出伤害正常扣生命',
    lifesteal: '造成伤害时恢复等量生命',
    agile: '每回合可移动一次位置',
    counter: '被近战攻击命中时反击攻击者',
    tacticCmd: '近战友军+X攻',
    shootCmd: '弓箭友军+X攻',
    focusFire: '本回合全体攻击指定目标',
    magicDmg: '造成魔法伤害（无视护甲）',
    shield: '目标+2护甲',
    balance: '手牌中所有士兵费用变为指定值',
    magicSwap: '随机交换两个敌人位置',
    shortBow: '弓箭手可打距离1',
    spear: '近战射程变为1或2，优先距离1',
    intimidate: '敌方近战/弓箭-X攻',
    physResist: '减少X点物理伤害',
    magicResist: '减少X点魔法伤害',
    allResist: '减少X点所有伤害',
    pursuit: '敌方位移/前线部署时造成伤害',
    bleed: '攻击附加流血层数，每回合造成伤害',
    tear: '对流血目标造成额外真实伤害',
    poison: '攻击附加中毒层数，失效敌方光环技能',
    poisonBurst: '触发时消耗所有中毒层数造成真实伤害',
    nimble: '位置变化时+X/+X',
    growth: '受到治疗时+X/+X',
    conceal: '在底线不会被近战/弓箭/狙击选中',
    precision: '狙击无法被闪避/飞翔免疫且+X伤',
    ambush: '受击前对攻击者造成伤害，击杀则取消攻击',
    dodge: '50%概率闪避物理攻击',
    fly: '可闪避近战(50%)和弓箭(25%)',
    dive: '有飞翔时距离不限且+X伤',
    lucky: '随机伤害取最大值',
    extract: '击杀敌方单位后+X金币',
    revenge: '友方阵亡时立即攻击',
    fog: '隐藏己方单位信息',
    interest: '每回合开始时获得金币',
    bounty: '被击杀时击杀方+1金币',
    antiAir: '打飞翔必中且+X伤',
    magicBoost: '魔法友军+X攻',
    silence: '使敌方技能失效X回合',
    spellReflect: '反弹魔法伤害',
    riddleRealm: '手牌中的谜语法术就绪',
    holyLight: '敌方弃掉已激活谜语',
    magicPierce: '魔法攻击无视法抗和法术反弹',
    disguise: '不能被狙击/随机选中',
    stealth: '背面朝上，不能被法术选中',
    strongStrike: '无视物抗/法抗/全抗',
    jamming: '敌方狙击目标随机化',
    immune: '不能被法术指定为目标，不触发谜语',
  };
  return { key, label, desc: descs[key] || '特殊技能效果' };
});

export default function RulePanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);

  // 小屏幕检测
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 移动端切换按钮 */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-2 right-2 z-50 px-2 py-1.5 bg-blue-900/80 border border-blue-700 rounded-lg text-blue-300 text-xs font-bold flex items-center gap-1 lg:hidden"
      >
        <BookOpen className="w-3.5 h-3.5" />
        规则
      </button>

      {/* 面板 */}
      <div
        className={`
          fixed top-2 right-2 z-40 w-[260px] max-h-[90vh] rounded-xl overflow-hidden
          border border-blue-800/40 shadow-xl shadow-black/40
          transition-all duration-300
          ${mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
          lg:opacity-100 lg:translate-x-0 lg:pointer-events-auto
        `}
        style={{ background: 'rgba(15, 30, 60, 0.92)', backdropFilter: 'blur(12px)' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 bg-blue-900/40 border-b border-blue-800/30">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-blue-300">📖 规则 & 技能</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 hover:bg-blue-800/50 rounded">
              {collapsed ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronUp className="w-3 h-3 text-blue-400" />}
            </button>
            <button onClick={() => setMobileOpen(false)} className="p-0.5 hover:bg-blue-800/50 rounded lg:hidden">
              <X className="w-3 h-3 text-blue-400" />
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(90vh - 36px)' }}>
            {/* 游戏规则 */}
            <div className="px-3 py-2 space-y-2">
              <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">游戏规则</h3>
              {GAME_RULES.map((rule, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="text-[10px] font-bold text-blue-300">{rule.title}</div>
                  <div className="text-[9px] text-gray-400 leading-relaxed">{rule.content}</div>
                </div>
              ))}
            </div>

            {/* 分割线 */}
            <div className="border-t border-blue-800/20 my-1" />

            {/* 技能词典 */}
            <div className="px-3 py-2">
              <button
                onClick={() => setSkillOpen(!skillOpen)}
                className="flex items-center justify-between w-full mb-1"
              >
                <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">技能词典 ({SKILL_ENTRIES.length}个)</h3>
                {skillOpen ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
              </button>

              {skillOpen && (
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {SKILL_ENTRIES.map(skill => (
                    <div key={skill.key} className="flex gap-2 items-start">
                      <span className="text-[9px] font-bold text-cyan-400 shrink-0 whitespace-nowrap">{skill.label}</span>
                      <span className="text-[8px] text-gray-500 leading-relaxed">{skill.desc}</span>
                    </div>
                  ))}
                </div>
              )}
              {!skillOpen && (
                <div className="text-[8px] text-gray-600">点击展开查看全部技能...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
