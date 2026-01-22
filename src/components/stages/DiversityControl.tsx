import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, AlertTriangle, Info } from 'lucide-react';

type VideoType = { name: string; color: string; icon: string };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * 科普演示：多样性控制发生在“重排（Re-ranking）”阶段的典型思路
 * - 目的：在“相关性/预测收益”与“内容多样性/发现性”之间做权衡
 * - 常见方法：基于相似度惩罚的打散（如 MMR 思想） + 预留探索位（exploration slots）
 *
 * 说明：这里是可视化演示，不是生产级推荐系统实现。
 */
const DiversityControl: React.FC = () => {
  const [isDiverse, setIsDiverse] = useState(false);
  const [exploreRatio, setExploreRatio] = useState(0.18); // 探索位比例（多样性模式下可调）
  const [seed, setSeed] = useState(0);

  // 自动切换演示（你想手动讲也可以把它删掉）
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDiverse((prev) => !prev);
      setSeed((s) => s + 1);
    }, 5200);
    return () => clearInterval(interval);
  }, []);

  const videoTypes: VideoType[] = [
    { name: '登山徒步', color: 'from-emerald-500/35 to-emerald-900/10', icon: '⛰️' },
    { name: '露营生活', color: 'from-lime-500/30 to-lime-900/10', icon: '⛺' },
    { name: '户外装备', color: 'from-teal-500/30 to-teal-900/10', icon: '🎒' },
    { name: '国家地理', color: 'from-indigo-500/25 to-indigo-900/10', icon: '🌍' },
    { name: '路线攻略', color: 'from-cyan-500/25 to-cyan-900/10', icon: '🗺️' },
    { name: '轻户外', color: 'from-green-500/25 to-green-900/10', icon: '🌿' },
  ];

  /**
   * 12张卡的构造逻辑：
   * - “只按相关性排序”（未开启多样性演示）：为了可视化更直观，全部来自同一主类（同质化更明显）
   * - “多样性重排”（开启演示）：保留核心兴趣位 + 探索位（语义邻近）+ 打散
   */
  const items = useMemo(() => {
    const n = 12;
    const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 4);

    // 固定探索位位置（讲解更稳定）
    const explorePos = [1, 4, 8, 10].slice(0, exploreSlots);
    const exploreSet = new Set<number>(explorePos);

    // 核心兴趣池（相关性较高的一组）
    const corePool = [0, 2, 1]; // 登山徒步 / 户外装备 / 露营生活
    // 探索池（语义邻近，但不完全重复）
    const explorePool = [3, 4, 5]; // 国家地理 / 路线攻略 / 轻户外

    return Array.from({ length: n }).map((_, i) => {
      let typeIndex = 0;

      if (!isDiverse) {
        // 演示：仅按相关性/预测收益排序时，结果可能出现高度同质化
        typeIndex = 0; // 12/12 登山徒步（为了把“同质化”讲清楚）
      } else {
        // 多样性重排：核心兴趣位 + 探索位
        typeIndex = exploreSet.has(i) ? explorePool[i % explorePool.length] : corePool[i % corePool.length];

        // 轻微打散：避免视觉上整齐重复（模拟“相似度惩罚后”的重排结果）
        if (i % 3 === 2) typeIndex = (typeIndex + 1) % videoTypes.length;
      }

      // 分数：仅用于展示“权衡”
      // 多样性开启后：相关性略降，但多样性/发现性上升（符合常见多目标权衡）
      const baseScore = 0.86 + (i % 4) * 0.02;
      const score = !isDiverse ? baseScore + 0.03 : baseScore - 0.02;
      const finalScore = clamp(score + (Math.sin((i + seed) * 1.7) * 0.008), 0, 1);

      return {
        id: i,
        typeIndex,
        finalScore,
        isExplore: isDiverse ? exploreSet.has(i) : false,
      };
    });
  }, [isDiverse, exploreRatio, seed, videoTypes.length]);

  // 指标：展示“权衡”（不是事实值，是演示值）
  const accuracy = isDiverse ? 95 : 98;
  const diversity = isDiverse ? 36 : 10;

  return (
    // ✅ 允许上下滚动：不会被12张卡“撑满屏幕导致其他内容看不到”
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      {/* ✅ 更宽：减少两侧留白 */}
      <div className="w-full max-w-[1480px] mx-auto">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* 顶部：标题 + 切换 */}
          <div className="px-7 md:px-10 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-white/10 bg-white/[0.02]">
            <div className="space-y-1">
              <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                DIVERSITY CONTROL · RE-RANKING
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                多样性重排：探索位与打散的权衡
              </div>
              <div className="text-xs text-gray-400">
                演示：在重排阶段，对相似内容施加“相似度惩罚”（MMR 思想）并预留探索位，减少同质化。
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => { setIsDiverse(false); setSeed(s => s + 1); }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  !isDiverse
                    ? 'bg-red-500/15 text-red-200 border border-red-500/35'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                仅按相关性排序
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button
                onClick={() => { setIsDiverse(true); setSeed(s => s + 1); }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  isDiverse
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/35'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                多样性重排
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="p-7 md:p-10 space-y-6">
            {/* 状态提示 + 探索位比例 */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isDiverse ? 'div' : 'rel'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  {isDiverse ? (
                    <Zap className="text-emerald-300 w-4 h-4" />
                  ) : (
                    <AlertTriangle className="text-red-300 w-4 h-4" />
                  )}
                  <span className={isDiverse ? 'text-emerald-200' : 'text-red-200'}>
                    {isDiverse
                      ? '重排：保留核心兴趣位，同时引入探索位，并对相似内容进行打散'
                      : '结果：仅按相关性排序时，候选可能出现较强的同质化'}
                  </span>
                </motion.div>
              </AnimatePresence>

              <div className="flex-1 max-w-2xl glass rounded-2xl border border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                    Explore Ratio（探索位占比）
                  </div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {(exploreRatio * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 font-mono">5%</span>
                  <div className="relative flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      animate={{ width: `${exploreRatio * 100}%` }}
                      className="h-full bg-emerald-400/70"
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: `${exploreRatio * 100}%` }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-emerald-400/20" />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">30%</span>
                </div>

                <div className="mt-3">
                  <input
                    disabled={!isDiverse}
                    type="range"
                    min={0.05}
                    max={0.3}
                    step={0.01}
                    value={exploreRatio}
                    onChange={(e) => { setExploreRatio(parseFloat(e.target.value)); setSeed(s => s + 1); }}
                    className={`w-full accent-emerald-400 ${!isDiverse ? 'opacity-30 cursor-not-allowed' : ''}`}
                  />
                  <div className="text-[10px] text-gray-500 mt-1">
                    {isDiverse
                      ? '探索位用于“兴趣边界探索”：通常选择语义相近但不完全重复的内容'
                      : '在该模式下，探索位关闭，仅展示“相关性排序”效果'}
                  </div>
                </div>
              </div>
            </div>

            {/* 兴趣资产 */}
            <div className="glass rounded-2xl border border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-black text-gray-300">
                  当前兴趣画像（示意）
                </div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">
                  profile size: {isDiverse ? 5 : 1}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(!isDiverse
                  ? ['登山徒步']
                  : ['登山徒步', '户外装备', '露营生活', '国家地理', '路线攻略']
                ).map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-gray-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 卡牌：缩小高度，避免占满屏 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, idx) => {
                  const type = videoTypes[item.typeIndex];

                  // 同质化标记：仅“相关性排序模式”下更突出
                  const showHomogeneousStamp = !isDiverse && idx > 0;

                  return (
                    <motion.div
                      key={`${seed}-${idx}-${item.typeIndex}`}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.985 }}
                      transition={{ duration: 0.35, delay: idx * 0.02 }}
                      className="relative h-[132px] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-b ${type.color}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      {/* tag */}
                      <div className="absolute top-2 left-2">
                        <div
                          className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                            isDiverse
                              ? item.isExplore
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                                : 'bg-white/5 text-gray-200 border-white/10'
                              : 'bg-white/5 text-gray-200 border-white/10'
                          }`}
                        >
                          {isDiverse ? (item.isExplore ? '探索位' : '核心兴趣') : '相关性排序'}
                        </div>
                      </div>

                      {/* center */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl drop-shadow-lg">{type.icon}</div>
                        <div className="mt-1.5 text-[11px] font-black text-white/90 tracking-tight">
                          {type.name}
                        </div>
                      </div>

                      {/* score bar */}
                      <div className="absolute left-3 right-3 bottom-3">
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                          <span>score</span>
                          <span>{item.finalScore.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            animate={{ width: `${Math.min(100, item.finalScore * 100)}%` }}
                            className={`h-full ${
                              isDiverse && item.isExplore ? 'bg-emerald-400/75' : 'bg-blue-400/65'
                            }`}
                          />
                        </div>
                      </div>

                      {showHomogeneousStamp && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] flex items-center justify-center"
                        >
                          <div className="px-2 py-1 rounded border border-red-400/40 bg-red-500/10">
                            <span className="text-[10px] font-black text-red-200 tracking-tight">
                              同质化提示
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* 指标区：权衡 + MMR解释 */}
            <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
                <Shuffle size={120} className="rotate-12" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">
                      相关性指标（示意）
                    </span>
                    <span className="text-2xl font-black text-white">{accuracy}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${accuracy}%` }}
                      className="h-full bg-blue-400/80"
                    />
                  </div>
                  <div className="text-[10px] text-gray-500">
                    多样性重排通常会对相关性产生轻微影响（多目标权衡）
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">
                      多样性指标（示意）
                    </span>
                    <span className="text-2xl font-black text-white">{diversity}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${diversity}%` }}
                      className={`h-full ${isDiverse ? 'bg-emerald-400/80' : 'bg-red-400/70'}`}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500">
                    多样性提升有助于内容发现性与长期体验
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-400/20">
                  <Info className="text-blue-300 w-4 h-4" />
                </div>
                <div className="text-xs text-gray-400 leading-relaxed space-y-1">
                  <div>
                    <span className="text-white font-bold">MMR（最大边际相关性）</span>常用于“打散”：
                    在保证候选仍然相关的前提下，对与已选内容高度相似的项施加惩罚，使结果更丰富。
                  </div>
                  <div>
                    <span className="text-white font-bold">探索位（Exploration Slots）</span>：
                    在结果中预留少量位置，用于展示“语义邻近但不完全重复”的内容；若用户对其产生正反馈，
                    系统可将其纳入兴趣画像，形成“扩充兴趣资产”的过程。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 给 App 左下角 stage 文案留空间 */}
        <div className="h-10" />
      </div>
    </div>
  );
};

export default DiversityControl;
