import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, Heart } from 'lucide-react';

type Phase = 'optimize' | 'expand' | 'constrain';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function uniqCount(arr: number[]) {
  return new Set(arr).size;
}

// 用一个简单的“多样性分数示意”：唯一类型数越多分数越高（0~100）
function diversityScore(typeIdxs: number[]) {
  const u = uniqCount(typeIdxs);
  // 12格里，1种=>10分，6种=>60分左右（示意）
  return clamp(10 + (u - 1) * 12, 10, 85);
}

// 用一个简单的“相关性分数示意”：越偏向主兴趣越高（0~100）
function relevanceScore(typeIdxs: number[], primary: number, secondary: number | null) {
  const wPrimary = 1.0;
  const wSecondary = 0.65;
  const wOther = 0.25;
  let sum = 0;
  for (const t of typeIdxs) {
    sum += t === primary ? wPrimary : secondary !== null && t === secondary ? wSecondary : wOther;
  }
  // 归一到 0~100（示意）
  return clamp(Math.round((sum / typeIdxs.length) * 100), 70, 99);
}

const DiversityControl: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('optimize');
  const [seed, setSeed] = useState(0);

  // 探索位占比（你要求：拉动要明显影响）
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 用户兴趣画像（演示用）：主兴趣=登山(0)，secondary 会在用户对探索内容点赞后被“纳入兴趣资产”
  const [primary] = useState(0);
  const [secondary, setSecondary] = useState<number | null>(null);


  // 内容类型：保持严谨、通用、讲座可用
  const types = useMemo(
    () => [
      { name: '登山徒步', emoji: '⛰️', grad: 'from-emerald-500/35 to-emerald-900/10' }, // primary
      { name: '户外装备', emoji: '🎒', grad: 'from-teal-500/30 to-teal-900/10' },
      { name: '露营生活', emoji: '⛺', grad: 'from-lime-500/30 to-lime-900/10' },
      { name: '路线攻略', emoji: '🗺️', grad: 'from-cyan-500/25 to-cyan-900/10' },     // neighbor
      { name: '自然人文', emoji: '🌍', grad: 'from-indigo-500/25 to-indigo-900/10' },   // neighbor
      { name: '轻户外', emoji: '🌿', grad: 'from-green-500/25 to-green-900/10' },       // neighbor
    ],
    []
  );

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 5);

  // 探索位位置：用 seed 打散，让“占比变化”肉眼明显 + 位置不是固定死的
  const explorePositions = useMemo(() => {
    const base = [1, 3, 5, 8, 10, 11]; // 分散在前中后
    const rotated = base.map((p) => (p + seed) % n);
    return rotated.slice(0, exploreSlots);
  }, [exploreSlots, seed]);

  const exploreSet = useMemo(() => new Set(explorePositions), [explorePositions]);

  // 三个阶段的“动机式”命名 + 解释（不再用“相关性排序/打散”这种行为名）
  const stage = useMemo(() => {
    if (phase === 'optimize') {
      return {
        badge: 'A',
        title: '单目标最优（相关性优先）',
        subtitle: '如果只追求预测收益最大，结果很可能集中在同一主题附近。',
        note:
          '风险：短期更稳，但连续重复会降低发现性，兴趣边界容易被锁定。',
      };
    }
    if (phase === 'expand') {
      return {
        badge: 'B',
        title: '兴趣扩圈（探索位注入）',
        subtitle: '在保证整体相关的前提下，预留少量位置展示“邻近但不重复”的内容。',
        note:
          '关键：探索不是随机推荐，而是挑选“语义邻近”的候选来测试你的边界反应。',
      };
    }
    return {
      badge: 'C',
      title: '结果约束（相关性 × 多样性平衡）',
      subtitle: '对“过于相似”的结果施加约束，避免连续重复，同时保留高相关内容。',
      note:
        '这通常发生在重排/过滤附近：不改变主流程，但对最终展示结果做形态约束。',
    };
  }, [phase]);

  // ——生成同一条 feed 在不同阶段的“连贯演进”
  const feed = useMemo(() => {
    const corePool = secondary === null
      ? [0, 0, 0, 1, 2]          // 还没扩圈：登山为主，少量装备/露营
      : [0, 0, secondary, 1, 2]; // 已扩圈：secondary 进入“相关池”而不再只是探索

    // neighborPool：探索位承载的“邻近内容池”
// exploreRatio 越大，探索越“宽”（从强相关邻近 → 更泛的邻近）
const neighborPool = (() => {
  // 基础邻近：路线/人文/轻户外
  const near = [3, 4, 5];

  // 扩圈后：secondary 更可能被抽到（模拟兴趣资产进入探索候选）
  const withSecondary = secondary === null ? near : [secondary, ...near];

  // exploreRatio 小：探索更谨慎（更多抽 secondary/更近邻）
  // exploreRatio 大：探索更宽（更容易抽到 4/5 这类更“泛”的邻近）
  const r = clamp(exploreRatio, 0.05, 0.35);
  if (r < 0.14) return secondary === null ? [3, 3, 4] : [secondary, 3, 3, 4];
  if (r < 0.24) return withSecondary; // [secondary?,3,4,5]
  return secondary === null ? [3, 4, 4, 5, 5] : [secondary, 3, 4, 4, 5, 5];
})();


    const pick = (i: number) => {
      // A：单目标最优（相关性优先）
// 仍然以主兴趣为主，但允许少量“非重复但高相关”的内容出现
// exploreRatio 越大，这个“轻微扩散”的概率越高（让 slider 在 A 也有体感）
if (phase === 'optimize') {
  const p = clamp(exploreRatio, 0.05, 0.35); // 0.05~0.35
  // 用位置 + seed 做一个确定性“抖动”，避免随机导致讲解不稳定
  const gate = ((i * 17 + seed * 29) % 100) / 100; // 0~1
  // 大部分还是 0（主兴趣），少量变成 1/2（同主题邻近：装备/露营）
  return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
}


      // B：兴趣扩圈 => 探索位放邻近内容，其余放相关池
      if (phase === 'expand') {
        if (exploreSet.has(i)) return neighborPool[(i + seed) % neighborPool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // C：结果约束 => 仍以相关为主，但避免“连续重复”
      const base = exploreSet.has(i)
        ? neighborPool[(i + seed) % neighborPool.length]
        : corePool[(i + seed) % corePool.length];

      if (i === 0) return base;

      const prev = exploreSet.has(i - 1)
        ? neighborPool[(i - 1 + seed) % neighborPool.length]
        : corePool[(i - 1 + seed) % corePool.length];

      // 如果连续重复，就换一个仍然相关/邻近的类型（示意“相似度惩罚/多样性约束”）
      if (base === prev) {
        const alt = exploreSet.has(i) ? neighborPool : corePool;
        return alt[(i + seed + 1) % alt.length];
      }
      return base;
    };

    const scoreFor = (i: number, t: number) => {
      // 分数示意：主兴趣略高；探索位略低；约束阶段整体会有轻微权衡
      const base = 0.80 + (i % 4) * 0.03;
      const primaryBoost = t === primary ? 0.06 : 0;
      const secondaryBoost = secondary !== null && t === secondary ? 0.03 : 0;
      const explorePenalty = exploreSet.has(i) ? -0.03 : 0;
      const phaseAdj = phase === 'optimize' ? 0.05 : phase === 'expand' ? 0.02 : 0.0;
      const noise = Math.sin((i + seed) * 1.7) * 0.01;
      return clamp(base + primaryBoost + secondaryBoost + explorePenalty + phaseAdj + noise, 0, 1);
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      const score = scoreFor(i, t);
      const slotTag = phase === 'expand' || phase === 'constrain'
        ? (exploreSet.has(i) ? '探索位' : '主序位')
        : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
        i,
        typeIndex: t,
        score,
        slotTag,
        isExplore: exploreSet.has(i) && phase !== 'optimize',
      };
    });

    // C 阶段：展示“最终顺序”更直观 —— 按 score 排一下（这会让用户感觉“经过约束层输出排序”）
    if (phase === 'constrain') {
      return items
        .map((x, rank0) => ({ ...x, _rank0: rank0 }))
        .sort((a, b) => b.score - a.score)
        .map((x, newRank) => ({ ...x, rank: newRank + 1 }));
    }

    return items.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [phase, seed, exploreSet, exploreSlots, exploreRatio, primary, secondary]);

  // 指标：跟着当前阶段、跟着 slider、跟着点赞扩圈而变化（解决“无影响感”）
  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);
    let div = diversityScore(typeIdxs);
let rel = relevanceScore(typeIdxs, primary, secondary);

// 让指标更“可讲解”：探索位占比对指标的方向影响显式化（示意）
// A 阶段影响弱；B/C 阶段影响更强
const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.8 : 0.65;

// rNorm：0~1
const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05);

// 多样性：随探索位上升而上升（更稳定）
div = clamp(Math.round(div + phaseW * (10 * rNorm)), 10, 85);

// 相关性：随探索位上升而轻微下降（B/C 更明显）
rel = clamp(Math.round(rel - phaseW * (6 * rNorm)), 70, 99);


    // 这里不追求真实数值，只追求“方向正确、可讲解”
    return {
      relevance: rel,
      diversity: div,
    };
  }, [feed, primary, secondary, phase, exploreRatio]);

  const PhaseButton = ({ id, label }: { id: Phase; label: string }) => (
    <button
      onClick={() => {
        setPhase(id);
        setSeed((s) => s + 1);
      }}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        phase === id
          ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

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
                <PhaseButton id="optimize" label="单目标最优" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="expand" label="兴趣扩圈" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="constrain" label="结果约束" />
              </div>
            </div>

            {/* Explore Ratio 控制条：现在会显著改变探索位数量/分布/结果 */}
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
                  onChange={(e) => {
                    setExploreRatio(parseFloat(e.target.value));
                    setSeed((s) => s + 1);
                  }}
                  className="w-full accent-emerald-400"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  调整后：探索位数量与位置会变化，feed 形态与指标会随之变化。
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

                            {/* 左上：位次/标签 */}
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

                            {/* 中间：类型 */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl drop-shadow-lg">{t.emoji}</div>
                              <div className="mt-1 text-[11px] font-black text-white/90">{t.name}</div>
                              {secondary !== null && item.typeIndex === secondary && (
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">
                                  in interest
                                </div>
                              )}
                            </div>

                            {/* 右上：对探索内容提供一个“可见的用户动作” */}
                            {item.isExplore && phase === 'expand' && (
                              <button
                                onClick={() => setSecondary(item.typeIndex)}
                                className="absolute top-2 right-2 px-2.5 py-1.5 rounded-full text-[10px] font-black border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 transition"
                                title="模拟：你对探索内容产生正反馈"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  Like
                                </span>
                              </button>
                            )}

                            {/* 底部：score */}
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

              {/* Right Panel: 指标 + 说明（不再出现讲座衔接句） */}
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
                              模拟“用户对邻近内容产生正反馈”。
                              被点赞的类型会进入兴趣资产：后续阶段它不再只出现在探索位里，而会更多进入“相关池”。
                            </>
                          ) : (
                            <>
                              这个面板只展示“这一秒多样性控制”对结果形态的影响。
                              指标变化是示意，重点是：探索位占比与用户反馈会改变后续的内容构成。
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {secondary !== null && (
                    <div className="mt-4 text-[10px] font-mono text-emerald-200/90">
                      ✅ 新兴趣已纳入：{types[secondary].name}
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
                    <div>• 在排序之后，对结果做“形态约束”：避免连续重复、提升发现性。</div>
                    <div>• 预留少量位置用于兴趣边界探索，靠反馈决定是否扩充画像。</div>
                    <div>• 常见实现会包含 MMR 类思想：在相关性之外加入相似度惩罚（这里做的是示意）。</div>
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
