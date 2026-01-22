import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, Heart } from 'lucide-react';

type Phase = 'optimize' | 'expand' | 'constrain';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function uniqCount(arr: number[]) {
  return new Set(arr).size;
}

function diversityScore(typeIdxs: number[]) {
  const u = uniqCount(typeIdxs);
  return clamp(10 + (u - 1) * 12, 10, 85);
}

function relevanceScore(typeIdxs: number[], primary: number, secondary: number | null) {
  const wPrimary = 1.0;
  const wSecondary = 0.65;
  const wOther = 0.25;
  let sum = 0;
  for (const t of typeIdxs) {
    sum += t === primary ? wPrimary : secondary !== null && t === secondary ? wSecondary : wOther;
  }
  return clamp(Math.round((sum / typeIdxs.length) * 100), 70, 99);
}

/** ✅ 阶段阈值：你可以按讲座口径微调 */
const THRESH = {
  OPT_TO_EXP: 0.12,  // < 0.12 => optimize
  EXP_TO_CON: 0.24,  // >=0.24 => constrain
} as const;

/** ✅ tab 点击时 slider 应该“跟随到临界值/典型值” */
const SNAP = {
  optimize: 0.08,   // 相关性优先：落在 optimize 区间更典型的位置
  expand: 0.18,     // 兴趣探索：落在 expand 区间中段
  constrain: 0.28,  // 结果约束：落在 constrain 区间中段
} as const;

function phaseFromExploreRatio(r: number): Phase {
  if (r < THRESH.OPT_TO_EXP) return 'optimize';
  if (r < THRESH.EXP_TO_CON) return 'expand';
  return 'constrain';
}

const MetricBar = ({ label, val, tone }: { label: string; val: number; tone: 'blue' | 'green' }) => (
  <div className="space-y-2">
    <div className="flex items-end justify-between">
      <span className="text-gray-400 text-xs font-black uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-black text-white">{val}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        animate={{ width: `${val}%` }}
        className={`h-full ${tone === 'green' ? 'bg-emerald-400/75' : 'bg-blue-400/70'}`}
      />
    </div>
  </div>
);

const DiversityControl: React.FC = () => {
  const [seed, setSeed] = useState(0);
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 用户兴趣画像（演示）
  const [primary] = useState(0);
  const [secondary, setSecondary] = useState<number | null>(null);

  /** ✅ phase 永远由 exploreRatio 推导：tab/slider 全部统一 */
  const phase = useMemo(() => phaseFromExploreRatio(exploreRatio), [exploreRatio]);

  const types = useMemo(
    () => [
      { name: '登山徒步', emoji: '⛰️', grad: 'from-emerald-500/35 to-emerald-900/10' },
      { name: '户外装备', emoji: '🎒', grad: 'from-teal-500/30 to-teal-900/10' },
      { name: '露营生活', emoji: '⛺', grad: 'from-lime-500/30 to-lime-900/10' },
      { name: '路线攻略', emoji: '🗺️', grad: 'from-cyan-500/25 to-cyan-900/10' },
      { name: '自然人文', emoji: '🌍', grad: 'from-indigo-500/25 to-indigo-900/10' },
      { name: '轻户外', emoji: '🌿', grad: 'from-green-500/25 to-green-900/10' },
    ],
    []
  );

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 6);

  const explorePositions = useMemo(() => {
    const base = [1, 3, 5, 8, 10, 11];
    const rotated = base.map((p) => (p + seed) % n);
    return rotated.slice(0, exploreSlots);
  }, [exploreSlots, seed]);

  const exploreSet = useMemo(() => new Set(explorePositions), [explorePositions]);

  const stage = useMemo(() => {
    if (phase === 'optimize') {
      return {
        badge: 'A',
        title: '相关性优先（单目标更强）',
        subtitle: '探索位很少时，结果更可能集中在主兴趣附近。',
        note: '短期稳定；风险：连续重复会降低发现性。',
        what: [
          '• 排序更接近“相关性/预测收益优先”的形态。',
          '• 多样性控制仍可能存在，但力度较轻（示意）。',
        ],
      };
    }
    if (phase === 'expand') {
      return {
        badge: 'B',
        title: '兴趣探索（预留探索位）',
        subtitle: '探索位增加后，会更积极引入“邻近但不重复”的内容。',
        note: '探索不是随机，而是从“语义邻近”里挑选候选做试探。',
        what: [
          '• 预留少量位置用于兴趣边界探索。',
          '• 观察反馈决定是否扩充兴趣画像。',
          '• 这一步常与重排/混排策略相邻（示意）。',
        ],
      };
    }
    return {
      badge: 'C',
      title: '结果约束（相关性 × 多样性平衡）',
      subtitle: '探索位更高时，通常会更明确地对结果施加“形态约束”。',
      note: '常见实现会包含 MMR 类思想：相关性之外加入相似度惩罚（示意）。',
      what: [
        '• 对最终展示结果做“形态约束”：避免连续重复、提升发现性。',
        '• 在总体相关可接受前提下，提高主题覆盖。',
        '• 常见实现会包含 MMR/相似度惩罚等（此处为科普示意）。',
      ],
    };
  }, [phase]);

  const feed = useMemo(() => {
    const corePool =
      secondary === null ? [0, 0, 0, 1, 2] : [0, 0, secondary, 1, 2];

    const neighborPool = (() => {
      const near = [3, 4, 5];
      const withSecondary = secondary === null ? near : [secondary, ...near];
      const r = clamp(exploreRatio, 0.05, 0.35);
      if (r < 0.14) return secondary === null ? [3, 3, 4] : [secondary, 3, 3, 4];
      if (r < 0.24) return withSecondary;
      return secondary === null ? [3, 4, 4, 5, 5] : [secondary, 3, 4, 4, 5, 5];
    })();

    const pick = (i: number) => {
      if (phase === 'optimize') {
        const p = clamp(exploreRatio, 0.05, 0.35);
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
      }

      if (phase === 'expand') {
        if (exploreSet.has(i)) return neighborPool[(i + seed) % neighborPool.length];
        return corePool[(i + seed) % corePool.length];
      }

      const base = exploreSet.has(i)
        ? neighborPool[(i + seed) % neighborPool.length]
        : corePool[(i + seed) % corePool.length];

      if (i === 0) return base;

      const prev = exploreSet.has(i - 1)
        ? neighborPool[(i - 1 + seed) % neighborPool.length]
        : corePool[(i - 1 + seed) % corePool.length];

      if (base === prev) {
        const alt = exploreSet.has(i) ? neighborPool : corePool;
        return alt[(i + seed + 1) % alt.length];
      }
      return base;
    };

    const scoreFor = (i: number, t: number) => {
      const base = 0.80 + (i % 4) * 0.03;
      const primaryBoost = t === primary ? 0.06 : 0;
      const secondaryBoost = secondary !== null && t === secondary ? 0.03 : 0;
      const explorePenalty = exploreSet.has(i) ? -0.03 : 0;
      const phaseAdj = phase === 'optimize' ? 0.05 : phase === 'expand' ? 0.02 : -0.01;
      const noise = Math.sin((i + seed) * 1.7) * 0.01;
      return clamp(base + primaryBoost + secondaryBoost + explorePenalty + phaseAdj + noise, 0, 1);
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      const score = scoreFor(i, t);

      const slotTag =
        phase === 'expand' || phase === 'constrain'
          ? (exploreSet.has(i) ? '探索位' : '主序位')
          : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
        i,
        typeIndex: t,
        score,
        slotTag,
        isExplore: exploreSet.has(i) && phase === 'expand',
      };
    });

    if (phase === 'constrain') {
      return items
        .sort((a, b) => b.score - a.score)
        .map((x, newRank) => ({ ...x, rank: newRank + 1 }));
    }

    return items.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [phase, seed, exploreSet, exploreRatio, primary, secondary]);

  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);
    let div = diversityScore(typeIdxs);
    let rel = relevanceScore(typeIdxs, primary, secondary);

    const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.85 : 0.7;
    const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05);

    div = clamp(Math.round(div + phaseW * (12 * rNorm)), 10, 85);
    rel = clamp(Math.round(rel - phaseW * (7 * rNorm)), 70, 99);

    if (secondary !== null) rel = clamp(rel + 2, 70, 99);

    return { relevance: rel, diversity: div };
  }, [feed, primary, secondary, phase, exploreRatio]);

  /** ✅ tab 点击：直接“吸附” slider 到该阶段典型值 → 所有东西跟着变 */
  const PhaseButton = ({ id, label }: { id: Phase; label: string }) => (
    <button
      onClick={() => {
        // 关键：不 setPhase！只 setExploreRatio！
        const target = SNAP[id];
        setExploreRatio(target);
      }}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        phase === id
          ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
          : 'text-gray-500 hover:text-gray-300'
      }`}
      title="点击会让探索位占比跟随到该阶段的典型值"
    >
      {label}
    </button>
  );

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-7 md:px-10 py-6 border-b border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                  Stage 04 · Diversity Control
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border border-blue-400/20 bg-blue-500/10 text-blue-200">
                        {stage.badge}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {stage.title}
                      </h2>
                    </div>
                    <div className="text-xs text-gray-400">{stage.subtitle}</div>
                    <div className="text-[11px] text-gray-500">{stage.note}</div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10">
                <PhaseButton id="optimize" label="相关性优先" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="expand" label="兴趣探索" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="constrain" label="结果约束" />
              </div>
            </div>

            {/* Explore Ratio 控制条 */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                  探索位占比（演示参数）
                </div>
                <div className="text-[11px] font-mono text-gray-400">
                  {(exploreRatio * 100).toFixed(0)}%（≈ {exploreSlots} / {n}）
                </div>
              </div>

              <div className="mt-3">
                <input
                  type="range"
                  min={0.05}
                  max={0.35}
                  step={0.01}
                  value={exploreRatio}
                  onChange={(e) => setExploreRatio(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400"
                />

                {/* ✅ 阈值提示（可选，但讲解时很顺） */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                  <span>相关性优先</span>
                  <span className="font-mono">|</span>
                  <span>
                    兴趣探索 <span className="text-gray-600">(≥ {(THRESH.OPT_TO_EXP * 100).toFixed(0)}%)</span>
                  </span>
                  <span className="font-mono">|</span>
                  <span>
                    结果约束 <span className="text-gray-600">(≥ {(THRESH.EXP_TO_CON * 100).toFixed(0)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 md:p-10 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_0.85fr] gap-6 items-start">
              {/* Feed */}
              <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">推荐结果（示意）</div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <Shuffle className="w-4 h-4" />
                    <span>cards: {n}</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {feed.map((item, idx) => {
                        const t = types[item.typeIndex];

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.28, delay: idx * 0.01 }}
                            className="relative h-[155px] rounded-2xl overflow-hidden border border-white/10 shadow-lg"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-b ${t.grad}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                            <div className="absolute top-2 left-2 flex items-center gap-2">
                              <div className="px-2 py-1 rounded-full text-[10px] font-black border border-white/10 bg-white/5 text-gray-200">
                                #{item.rank}
                              </div>
                              {(phase === 'expand' || phase === 'constrain') && (
                                <div
                                  className={`px-2 py-1 rounded-full text-[10px] font-black border ${
                                    item.slotTag === '探索位'
                                      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                                      : 'border-white/10 bg-white/5 text-gray-200'
                                  }`}
                                >
                                  {item.slotTag}
                                </div>
                              )}
                            </div>

                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl drop-shadow-lg">{t.emoji}</div>
                              <div className="mt-1 text-[11px] font-black text-white/90">{t.name}</div>
                              {secondary !== null && item.typeIndex === secondary && (
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">
                                  in interest
                                </div>
                              )}
                            </div>

                            {item.isExplore && phase === 'expand' && (
                              <button
                                onClick={() => setSecondary(item.typeIndex)}
                                className="absolute top-2 right-2 px-2.5 py-1.5 rounded-full text-[10px] font-black border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 transition"
                                title="模拟：用户对探索内容产生正反馈"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  Like
                                </span>
                              </button>
                            )}

                            <div className="absolute left-3 right-3 bottom-3">
                              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                                <span>score</span>
                                <span>{item.score.toFixed(2)}</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  animate={{ width: `${Math.min(100, item.score * 100)}%` }}
                                  className={`h-full ${
                                    item.slotTag === '探索位' ? 'bg-emerald-400/75' : 'bg-blue-400/70'
                                  }`}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-6">
                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="text-[12px] font-black text-gray-200 mb-4">当前阶段的结果变化（示意）</div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${phase}-${secondary ?? 'none'}-${exploreSlots}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      <MetricBar label="相关性指标（示意）" val={metrics.relevance} tone="blue" />
                      <MetricBar label="多样性指标（示意）" val={metrics.diversity} tone="green" />

                      <div className="flex items-start gap-3 text-[11px] text-gray-400 leading-relaxed">
                        <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                          <Info className="w-4 h-4 text-blue-300" />
                        </div>
                        <div>
                          {phase === 'expand' ? (
                            <>
                              你可以点某个探索位的 <span className="text-emerald-200 font-bold">Like</span>，
                              模拟“探索内容获得正反馈”。被点赞的类型会进入兴趣画像，后续更可能出现在相关候选中。
                            </>
                          ) : (
                            <>
                              这里展示“多样性控制”对结果形态的影响（示意）。探索位占比变化会带来内容构成与指标走向的变化。
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {secondary !== null && (
                    <div className="mt-4 text-[10px] font-mono text-emerald-200/90">
                      ✅ 已纳入兴趣画像：{types[secondary].name}
                      <button
                        onClick={() => setSecondary(null)}
                        className="ml-3 text-gray-500 hover:text-gray-300 underline"
                      >
                        reset
                      </button>
                    </div>
                  )}
                </div>

                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="text-[12px] font-black text-gray-200 mb-3">这一步在系统里通常做什么</div>
                  <div className="text-[11px] text-gray-400 leading-relaxed space-y-2">
                    {stage.what.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
};

export default DiversityControl;
