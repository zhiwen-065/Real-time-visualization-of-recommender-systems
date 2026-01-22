import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, AlertTriangle, Info } from 'lucide-react';

type VideoType = { name: string; color: string; icon: string };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * 贴近抖音/TikTok的“exploitation vs exploration”演示：
 * - Bubble(未开启多样性)：极致迎合历史兴趣 => 12/12 都是同一大类（登山徒步）
 * - Diversity(开启多样性)：保留核心兴趣位 + 预留探索位(语义相近但不重复) + 打散重排
 *
 * 注意：这里是演示逻辑，不是生产级推荐（没有真实召回/排序）。
 */
const DiversityControl: React.FC = () => {
  const [isDiverse, setIsDiverse] = useState(false);
  const [exploreRatio, setExploreRatio] = useState(0.18); // 探索位比例（仅在多样性模式可调）
  const [seed, setSeed] = useState(0);

  // 自动切换演示（可保留，也可删掉）
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

  /**
   * 12个候选卡：
   * - 未开启多样性：12/12 全是登山徒步（极致迎合）
   * - 开启多样性：核心兴趣(主池) + 探索位(相近语义池) + 打散
   */
  const items = useMemo(() => {
    const n = 12;
    const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 4);

    // 固定几个位置做“探索位”（演示更稳定）
    const explorePos = [1, 4, 8, 10].slice(0, exploreSlots);
    const exploreSet = new Set<number>(explorePos);

    // 主兴趣池：依旧围绕“户外/登山”语义（更符合“相近但不重复”）
    const mainPool = [0, 2, 1]; // 登山徒步/户外装备/露营生活
    // 探索池：仍然在“户外大语义”附近扩展边界（国家地理/路线攻略/轻户外）
    const explorePool = [3, 4, 5];

    return Array.from({ length: n }).map((_, i) => {
      let typeIndex = 0;

      if (!isDiverse) {
        // 极致 exploitation：把“你最可能停留”的塞满
        typeIndex = 0; // 12/12 全部登山徒步
      } else {
        // 多样性：核心兴趣位 + 探索位
        if (exploreSet.has(i)) {
          typeIndex = explorePool[i % explorePool.length];
        } else {
          typeIndex = mainPool[i % mainPool.length];
        }

        // 轻微打散：让两行不要完全重复（但仍保持语义一致）
        if (i % 3 === 2) typeIndex = (typeIndex + 1) % videoTypes.length;
      }

      // 分数：未开启多样性更“贴合”（准确度高）
      // 开启多样性会牺牲一点点准确度（更像平台的多目标折中）
      const baseScore = 0.88 + (i % 4) * 0.02; // 展示用
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

  // 指标：展示用（符合“多样性 ↑ => 准确度 ↓ 一点点”）
  const accuracy = isDiverse ? 95 : 98;
  const diversity = isDiverse ? 36 : 10;

  return (
    // ✅ 允许上下滚动：如果屏幕小/内容多不会被卡死
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      {/* ✅ 更宽：把 max-w 拉大，减少两边留白 */}
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* Top: 标题 + Toggle */}
          <div className="px-7 md:px-10 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-white/10 bg-white/[0.02]">
            <div className="space-y-1">
              <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                DIVERSITY & EXPLORATION
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                多样性重排：探索如何扩充你的兴趣资产
              </div>
              <div className="text-xs text-gray-400">
                未开启时：极致迎合历史行为 → 可能 12 条都是同一类；开启后：保留探索位 + 打散重排
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => { setIsDiverse(false); setSeed(s => s + 1); }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  !isDiverse
                    ? 'bg-red-500/20 text-red-200 border border-red-500/40'
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

          {/* Body */}
          <div className="p-7 md:p-10 space-y-6">
            {/* 状态提示 + Explore Ratio */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
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
                      ? '开启探索位：相近语义里扩充兴趣边界，避免“登山徒步锁死”'
                      : '极致迎合：系统认为你最可能停留 → 12条都推登山徒步（同质化）'}
                  </span>
                </motion.div>
              </AnimatePresence>

              <div className="flex-1 max-w-2xl glass rounded-2xl border border-white/10 px-5 py-4">
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
                      ? '探索位越高：更容易扩充兴趣资产，但准确度会轻微下降（多目标折中）'
                      : '未开启多样性时：系统只追求停留/完播/互动最大化 → 极度同质化'}
                  </div>
                </div>
              </div>
            </div>

            {/* 兴趣资产 chips */}
            <div className="glass rounded-2xl border border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-black text-gray-300">
                  你的兴趣资产（会被不断扩充）
                </div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">
                  assets: {isDiverse ? 5 : 1}
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

            {/* 卡牌墙：12张，但小一点，不撑屏 */}
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => {
                    const type = videoTypes[item.typeIndex];
                    // 同质化 stamp：如果未开启多样性，则除第一个外都盖章（更直观）
                    const showHomogeneousStamp = !isDiverse && idx > 0;

                    return (
                      <motion.div
                        key={`${seed}-${idx}-${item.typeIndex}`}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.35, delay: idx * 0.02 }}
                        className="relative h-[135px] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-b ${type.color}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* tag */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div
                            className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                              item.isExplore && isDiverse
                                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                                : 'bg-white/5 text-gray-200 border-white/10'
                            }`}
                          >
                            {isDiverse ? (item.isExplore ? '探索位' : '核心兴趣') : '极致迎合'}
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
                              animate={{
                                width: `${Math.min(100, item.finalScore * 100)}%`,
                              }}
                              className={`h-full ${
                                item.isExplore && isDiverse ? 'bg-emerald-400/80' : 'bg-blue-400/70'
                              }`}
                            />
                          </div>
                        </div>

                        {showHomogeneousStamp && (
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

            {/* 指标区 */}
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
                    极致迎合时更高：更像“你会停留的内容”
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
                    多样性更高：长尾覆盖更好，信息茧房更弱
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-400/20">
                  <Info className="text-blue-300 w-4 h-4" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  抖音/TikTok 的核心不是“标签匹配”，而是在特征空间做
                  <span className="text-white font-bold">概率预估</span>。
                  为了避免“永远登山徒步”，系统会保留一定比例探索位：
                  这些内容往往与主兴趣
                  <span className="text-white font-bold">底层语义相近</span>（户外体系内扩展），
                  一旦你正反馈，就会被吸收为新的兴趣资产。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 给你App左下角Stage文字留一点空间 */}
        <div className="h-10" />
      </div>
    </div>
  );
};

export default DiversityControl;
