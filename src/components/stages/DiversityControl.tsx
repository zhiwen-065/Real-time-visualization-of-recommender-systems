import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, AlertTriangle, Info } from 'lucide-react';

type VideoType = { name: string; color: string; icon: string };

const DiversityControl: React.FC = () => {
  const [isDiverse, setIsDiverse] = useState(false);
  const [exploreRatio, setExploreRatio] = useState(0.18); // 探索比例（展示用）
  const [seed, setSeed] = useState(0); // 用于触发“重排”动画

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDiverse((prev) => !prev);
      setSeed((s) => s + 1);
    }, 4500);
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

  // 12 个候选内容：同质化=几乎都同一类；多样性=按类型打散，并带一点“探索位”
  const items = useMemo(() => {
    const n = 12;
    const base = Array.from({ length: n }).map((_, i) => {
      let typeIndex = 0;

      if (!isDiverse) {
        // 同质化：大部分都指向“最强兴趣类”
        typeIndex = i === 3 ? 3 : 0; // 偶尔混入一个“看起来不同但弱势”的
      } else {
        // 多样性：打散 + 预留探索位
        // 其中 exploreSlots 数量由 exploreRatio 决定（展示用逻辑）
        const exploreSlots = Math.max(1, Math.round(n * exploreRatio));
        const exploreSet = new Set<number>();
        // 固定挑几个位置当探索位（可重复稳定演示）
        [1, 4, 8, 10].slice(0, exploreSlots).forEach((x) => exploreSet.add(x));

        if (exploreSet.has(i)) {
          // 探索位：用“相邻语义”的类型（比如国家地理/路线攻略）
          typeIndex = (i % videoTypes.length + 3) % videoTypes.length;
        } else {
          // 主兴趣位：更靠近“登山徒步/户外装备/露营”
          const mainPool = [0, 1, 2];
          typeIndex = mainPool[i % mainPool.length];
        }

        // 再做一点点打散，让两行别完全一样
        typeIndex = (typeIndex + (i % 2)) % videoTypes.length;
      }

      const baseScore = 0.78 + (i % 4) * 0.03; // 粗略“兴趣分”
      const finalScore = isDiverse
        ? baseScore - 0.02 + (Math.random() * 0.02)
        : baseScore + 0.02;

      return {
        id: i,
        typeIndex,
        baseScore,
        finalScore,
        isExplore: isDiverse ? (i === 1 || i === 4 || i === 8 || i === 10) : false,
      };
    });

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiverse, exploreRatio, seed]);

  // 指标（展示用）
  const accuracy = isDiverse ? 95 : 98;
  const diversity = isDiverse ? 36 : 12;

  return (
    <div className="w-full h-full flex items-center justify-center px-10">
      {/* 主舞台面板：高大上排版核心 */}
      <div className="w-full max-w-[1100px]">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* 顶部：标题 + toggle */}
          <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
            <div className="space-y-1">
              <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                DIVERSITY & EXPLORATION
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                多样性重排：探索如何扩充你的兴趣资产
              </div>
              <div className="text-xs text-gray-400">
                推荐不只“猜你喜欢”，还会留出探索位，避免兴趣锁死与内容同质化
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => { setIsDiverse(false); setSeed(s => s + 1); }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  !isDiverse
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                信息茧房
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button
                onClick={() => { setIsDiverse(true); setSeed(s => s + 1); }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  isDiverse
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                多样性重排
              </button>
            </div>
          </div>

          {/* 中部内容：三段式（控制条 / 兴趣资产 / 卡牌墙） */}
          <div className="p-8 space-y-6">
            {/* 状态提示 + Explore Ratio */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isDiverse ? 'div' : 'rep'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  {isDiverse ? (
                    <Zap className="text-emerald-400 w-4 h-4" />
                  ) : (
                    <AlertTriangle className="text-red-400 w-4 h-4" />
                  )}
                  <span className={isDiverse ? 'text-emerald-200' : 'text-red-200'}>
                    {isDiverse
                      ? '已开启探索/打散：在相似语义里扩充兴趣边界'
                      : '同质化加剧：系统过度拟合历史行为，容易审美疲劳'}
                  </span>
                </motion.div>
              </AnimatePresence>

              <div className="flex-1 max-w-xl glass rounded-2xl border border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                    Explore Ratio
                  </div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {(exploreRatio * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 font-mono">0%</span>
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

                {/* slider 仅在多样性模式可调更有逻辑 */}
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
                    {isDiverse ? '探索位越高：更容易发现新兴趣，但准确度会轻微下降' : '开启多样性重排后可调探索比例'}
                  </div>
                </div>
              </div>
            </div>

            {/* 兴趣资产（chips） */}
            <div className="glass rounded-2xl border border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-black text-gray-300">
                  你的兴趣资产（会被不断扩充）
                </div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">
                  assets: {isDiverse ? 5 : 3}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['登山徒步', '自驾纪录片', '户外装备', ...(isDiverse ? ['露营生活', '国家地理'] : [])]).map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-gray-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 卡牌墙：12张但变小、像你截图那种 */}
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => {
                    const type = videoTypes[item.typeIndex];
                    const isRepetitive = !isDiverse && idx > 0;

                    return (
                      <motion.div
                        key={`${seed}-${idx}-${item.typeIndex}`}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.35, delay: idx * 0.02 }}
                        className="relative h-[150px] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                      >
                        {/* 背景渐变（高大上核心） */}
                        <div className={`absolute inset-0 bg-gradient-to-b ${type.color}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* 左上角标签：主兴趣 or 探索 */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div
                            className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                              item.isExplore && isDiverse
                                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                                : 'bg-white/5 text-gray-200 border-white/10'
                            }`}
                          >
                            {item.isExplore && isDiverse ? '探索位' : '核心兴趣'}
                          </div>
                        </div>

                        {/* 中心 icon */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-3xl drop-shadow-lg">{type.icon}</div>
                          <div className="mt-2 text-[11px] font-black text-white/90 tracking-tight">
                            {type.name}
                          </div>
                        </div>

                        {/* 底部：分数条（演示“排序”） */}
                        <div className="absolute left-3 right-3 bottom-3">
                          <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                            <span>score</span>
                            <span>{(isDiverse ? item.finalScore : item.baseScore).toFixed(2)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              animate={{
                                width: `${Math.min(100, (isDiverse ? item.finalScore : item.baseScore) * 100)}%`,
                              }}
                              className={`h-full ${
                                item.isExplore && isDiverse ? 'bg-emerald-400/80' : 'bg-blue-400/70'
                              }`}
                            />
                          </div>
                        </div>

                        {/* 同质化覆盖层 */}
                        {isRepetitive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-red-950/45 backdrop-blur-[1px] flex items-center justify-center"
                          >
                            <div className="px-2 py-1 rounded border border-red-400/50 bg-red-500/10">
                              <span className="text-[10px] font-black text-red-200 tracking-tight">
                                同质化
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* 底部双指标条（永远可见） */}
            <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
                <Shuffle size={120} className="rotate-12" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">
                      推荐准确度 (ACCURACY)
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
                    越高 = 越贴近历史兴趣（但可能更容易锁死）
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">
                      生态健康 (DIVERSITY)
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
                    越高 = 长尾覆盖更好，信息茧房更弱
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-400/20">
                  <Info className="text-blue-300 w-4 h-4" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  系统不会把“你最喜欢”的塞满一屏，而是保留一定比例的
                  <span className="text-white font-bold">探索位</span>：
                  这些内容在底层特征空间“相近但不重复”，一旦你产生正反馈，就会被吸收为新的兴趣资产。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 你 App 左下角那块 STAGE 文案会覆盖，这里预留一点底部空间更舒服 */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default DiversityControl;
