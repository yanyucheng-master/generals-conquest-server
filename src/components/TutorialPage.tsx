import { useState } from 'react';
import {
  BookOpen, X, ChevronRight, ChevronLeft,
  Swords, Move, Zap, Sparkles, Coins, Heart, ArrowLeft, ZoomIn,
} from 'lucide-react';
import ImageLightbox from './ImageLightbox';

interface TutorialPageData {
  title: string;
  icon: React.ReactNode;
  image: string;
  imageCaption: string;
  content: React.ReactNode;
}

const TUTORIAL_PAGES: TutorialPageData[] = [
  {
    title: '欢迎来到将领：征服',
    icon: <Swords className="w-5 h-5 text-yellow-500" />,
    image: '/tutorial/tut_01_battlefield.jpg',
    imageCaption: '战场布局：双方各4行×3列，中间是HQ',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          这是一款基于<b className="text-yellow-400">精确距离体系</b>的1v1策略卡牌对战游戏。
          你需要部署士兵、释放法术，最终摧毁敌方总部！
        </p>
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/30">
          <p className="text-xs text-gray-300">
            <span className="text-yellow-400 font-bold">游戏目标</span>：将敌方总部HP从40打到0
          </p>
          <p className="text-xs text-gray-300">
            <span className="text-blue-400 font-bold">你的区域</span>：底线（3格，中间是HQ）+ 前线（3格）
          </p>
          <p className="text-xs text-gray-300">
            <span className="text-red-400 font-bold">敌方区域</span>：同样的布局，与你相对
          </p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-2.5">
          <p className="text-[11px] text-blue-300">
            <b>💡 提示</b>：将士兵拖到己方底线或前线来部署。不同兵种有不同的攻击距离！
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '距离计算（核心机制）',
    icon: <Move className="w-5 h-5 text-blue-400" />,
    image: '/tutorial/tut_02_distance.jpg',
    imageCaption: '五种攻击距离：近战=1 / 弓箭=2 / 狙击≥2 / 魔法=不限 / 随机=不限',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          距离是攻击能否命中的<b className="text-yellow-400">唯一标准</b>。每种兵种有固定射程：
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded-lg p-2">
            <span className="w-14 text-center font-bold text-red-400 shrink-0">近战</span>
            <span className="text-gray-300">只能打<b className="text-yellow-400">距离1</b>的目标（相邻行）</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-800/30 rounded-lg p-2">
            <span className="w-14 text-center font-bold text-orange-400 shrink-0">弓箭</span>
            <span className="text-gray-300">只能打<b className="text-yellow-400">距离2</b>的目标（隔一行）</span>
          </div>
          <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/30 rounded-lg p-2">
            <span className="w-14 text-center font-bold text-purple-400 shrink-0">狙击</span>
            <span className="text-gray-300">打距离≥2的目标，但<b className="text-red-400">距离1是盲区</b>！</span>
          </div>
          <div className="flex items-center gap-2 bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-2">
            <span className="w-14 text-center font-bold text-cyan-400 shrink-0">魔法</span>
            <span className="text-gray-300"><b className="text-yellow-400">不限距离</b>，想打哪打哪</span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-2">
            <span className="w-14 text-center font-bold text-yellow-400 shrink-0">随机</span>
            <span className="text-gray-300"><b className="text-yellow-400">不限距离</b>，完全随机选择目标，伤害随机（<b className="text-yellow-400">强运</b>可让伤害取最大值）</span>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2.5">
          <p className="text-[11px] text-yellow-400">
            💡 <b>前线不存在规则</b>：如果一条前线没有任何单位，该前线在距离计算中被<b>跳过</b>。这意味着空前线会让双方距离缩短！
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '攻击概念',
    icon: <Zap className="w-5 h-5 text-orange-400" />,
    image: '/tutorial/tut_03_attack.jpg',
    imageCaption: '攻击顺序：前线左→前线中→前线右→底线左→底线中→底线右',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          所有单位部署后<b className="text-green-400">本回合即可攻击</b>，按固定顺序依次出手：
        </p>
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
          <p className="text-xs text-gray-300 font-mono mb-1.5">
            <span className="text-red-400">前线左</span> → <span className="text-red-400">前线中</span> → <span className="text-red-400">前线右</span> → <span className="text-orange-400">底线左</span> → <span className="text-orange-400">底线中</span> → <span className="text-orange-400">底线右</span>
          </p>
          <p className="text-[10px] text-gray-400">每个单位攻击间隔1秒，可清楚看到攻击过程</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-xs text-gray-300 border border-gray-700/30">
          <p><b className="text-blue-400">嘲讽优先</b>：有嘲讽技能的单位会被优先集火</p>
          <p><b className="text-white">距离优先</b>：无嘲讽时攻击最近的目标</p>
          <p><b className="text-purple-400">狙击特殊</b>：多个狙击共享一个手动指定的目标</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-1.5 border border-gray-700/30">
          <p className="text-xs font-bold text-orange-400">三种伤害类型</p>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-red-900/30 border border-red-700/40 rounded p-1.5 text-center">
              <div className="text-red-400 font-bold">物理</div>
              <div className="text-gray-400">先扣护甲</div>
            </div>
            <div className="bg-purple-900/30 border border-purple-700/40 rounded p-1.5 text-center">
              <div className="text-purple-400 font-bold">魔法</div>
              <div className="text-gray-400">无视护甲</div>
            </div>
            <div className="bg-gray-700/40 border border-gray-500/40 rounded p-1.5 text-center">
              <div className="text-white font-bold">真实</div>
              <div className="text-gray-400">无视一切</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '常见技能一览',
    icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    image: '/tutorial/tut_04_skills.jpg',
    imageCaption: '掌握技能效果是制胜关键',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          每张卡牌可能携带1-3个技能，合理搭配技能才能发挥最大战力：
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-2">
            <b className="text-red-400">闪击</b> <span className="text-gray-400">部署时立即攻击一次</span>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2">
            <b className="text-blue-400">嘲讽</b> <span className="text-gray-400">敌方优先攻击你</span>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-2">
            <b className="text-yellow-400">贯穿</b> <span className="text-gray-400">护甲破碎不抵挡溢出</span>
          </div>
          <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-2">
            <b className="text-green-400">闪避</b> <span className="text-gray-400">50%免疫物理攻击</span>
          </div>
          <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-2">
            <b className="text-purple-400">伏击</b> <span className="text-gray-400">受击前反击攻击者</span>
          </div>
          <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-2">
            <b className="text-cyan-400">反击</b> <span className="text-gray-400">被近战命中时反击</span>
          </div>
          <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-2">
            <b className="text-orange-400">流血</b> <span className="text-gray-400">每回合持续扣血</span>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-2">
            <b className="text-emerald-400">中毒</b> <span className="text-gray-400">光环技能失效</span>
          </div>
        </div>
        <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400">
            游戏中点击右上角 📖 规则面板可查看完整技能词典，包含所有技能的详细说明
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '回合流程与资源',
    icon: <Coins className="w-5 h-5 text-yellow-500" />,
    image: '/tutorial/tut_05_turn.jpg',
    imageCaption: '四个阶段循环：资源→部署→攻击→结束',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          每回合固定经历四个阶段，理解流程是制定策略的基础：
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2">
            <span className="text-yellow-400 font-bold shrink-0">① 资源</span>
            <span className="text-gray-300">获得金币 + 抽1张牌 + 结算利息/DOT伤害</span>
          </div>
          <div className="flex items-start gap-2 bg-green-900/20 border border-green-700/30 rounded-lg p-2">
            <span className="text-green-400 font-bold shrink-0">② 部署</span>
            <span className="text-gray-300">消耗金币放置士兵到战场，或释放法术</span>
          </div>
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg p-2">
            <span className="text-red-400 font-bold shrink-0">③ 攻击</span>
            <span className="text-gray-300">所有单位按顺序自动攻击敌方目标</span>
          </div>
          <div className="flex items-start gap-2 bg-gray-800/50 border border-gray-600/30 rounded-lg p-2">
            <span className="text-gray-400 font-bold shrink-0">④ 结束</span>
            <span className="text-gray-300">切换回合，轮到对手行动</span>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2.5">
          <p className="text-[11px] text-yellow-400">
            💡 <b>金币增长曲线</b>：第1-2回合3金 → 3-4回合4金 → 5-6回合5金 → 逐渐增至8金上限。后期可以部署更强力的单位！
          </p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-2.5">
          <p className="text-[11px] text-blue-400">
            🎯 <b>胜负条件</b>：将敌方总部HP降至0即获胜；己方总部HP归零则失败
          </p>
        </div>
      </div>
    ),
  },
];

interface TutorialPageProps {
  onClose: () => void;
  onBack?: () => void;
}

export default function TutorialPage({ onClose, onBack }: TutorialPageProps) {
  const [page, setPage] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const current = TUTORIAL_PAGES[page];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a12]">
      {/* 图片放大灯箱（支持滚轮缩放/双指缩放/拖拽） */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          caption={current.imageCaption}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-800/50 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回
            </button>
          )}
          <BookOpen className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-gray-200">新手教程</span>
          <span className="text-[10px] text-gray-500">({page + 1}/{TUTORIAL_PAGES.length})</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition-colors cursor-pointer">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-3 sm:px-4 py-4">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-3">
            {current.icon}
            <h3 className="text-sm sm:text-base font-bold text-white">{current.title}</h3>
          </div>

          {/* 配图 - 点击放大 */}
          <div
            className={`mb-4 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg shadow-black/40 cursor-zoom-in group relative ${lightboxImage ? 'bg-black' : ''}`}
            onClick={() => !lightboxImage && setLightboxImage(current.image)}
          >
            <img
              src={current.image}
              alt={current.imageCaption}
              className={`w-full object-cover transition-all duration-300 group-hover:scale-[1.02] ${lightboxImage ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
            />
            {/* 灯箱打开时显示黑色占位 */}
            {lightboxImage && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <span className="text-gray-600 text-xs">图片已放大查看中</span>
              </div>
            )}
            {/* 放大提示图标 */}
            <div className={`absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${lightboxImage ? 'hidden' : ''}`}>
              <ZoomIn className="w-4 h-4 text-white" />
            </div>
            <div className={`bg-gray-900/80 px-3 py-1.5 text-center flex items-center justify-center gap-1 ${lightboxImage ? 'opacity-50' : ''}`}>
              <ZoomIn className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-400 italic">{current.imageCaption}（点击放大）</span>
            </div>
          </div>

          {/* 文字内容 */}
          {current.content}
        </div>
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-800/30 border-t border-gray-700 shrink-0">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer
            ${page === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> 上一页
        </button>
        <div className="flex gap-1.5">
          {TUTORIAL_PAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${i === page ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}
            />
          ))}
        </div>
        {page < TUTORIAL_PAGES.length - 1 ? (
          <button
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold text-gray-900 bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer"
          >
            下一页 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold text-gray-900 bg-green-500 hover:bg-green-400 transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5" /> 开始战斗
          </button>
        )}
      </div>
    </div>
  );
}