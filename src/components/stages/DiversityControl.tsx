import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, Heart } from 'lucide-react';

type Phase = 'optimize' | 'expand' | 'constrain';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function uniqCount(arr: number[]) {
  return new Set(arr).size;
}

// 多样性分数示意：唯一类型数越多分数越高（0~100）
function diversityScore(typeIdxs: number[]) {
  const u = uniqCount(typeIdxs);
  return clamp(10 + (u - 1) * 12, 10, 85);
}

// 相关性分数示意：越偏向主兴趣越高（0~100）
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

function phaseFromExploreRatio(r: number): Phase {
  // 你说的“拉到一定数值会变阶段”：这里用阈值切换（可自行调）
  if (r < 0.12) return 'optimize';
  if (r < 0.24) return 'expand';
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

  // 探索位占比（slider）
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 阶段：会被 slider 阈值自动驱动；也允许你手动点按钮（手动后仍会在下次 slider 变化时回到阈值逻辑）
  const [phase, setPhase] = useState<Phase>(() => phaseFromExploreRatio(0.2));

  // 用户兴趣画像（演示）：主兴趣=登山(0)；secondary 会在探索内容 Like 后“纳入兴趣资产”
  const [primary] = useState(0);
  const [secondary, setSecondary] = useState<number | null>(null);

  // slider 变化时：自动切阶段 + 让画面更“动”
  useEffect(() => {
    const next = phaseFromExploreRatio(exploreRatio);
    setPhase(next);
    setSeed((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreRatio]);

  // 内容类型（通用、科普语气）
  const types = useMemo(
    () => [
      { name: '登山徒步', emoji: '⛰️', grad: 'from-emerald-500/35 to-emerald-900/10' }, // primary
      { name: '户外装备', emoji: '🎒', grad: 'from-teal-500/30 to-teal-900/10' },
      { name: '露营生活', emoji: '⛺', grad: 'from-lime-500/30 to-lime-900/10' },
      { name: '路线攻略', emoji: '🗺️', grad: 'from-cyan-500/25 to-cyan-900/10' }, // neighbor
      { name: '自然人文', emoji: '🌍', grad: 'from-indigo-500/25 to-indigo-900/10' }, // neighbor
      { name: '轻户外', emoji: '🌿', grad: 'from-green-500/25 to-green-900/10' }, // neighbor
    ],
    []
  );

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 6);

  // 探索位位置：打散（让占比变化肉眼明显）
  const explorePositions = useMemo(() => {
    const base = [1, 3, 5, 8, 10, 11];
    const rotated = base.map((p) => (p + seed) % n);
    return rotated.slice(0, exploreSlots);
  }, [exploreSlots, seed]);

  const exploreSet = useMemo(() => new Set(explorePositions), [explorePositions]);

  // 阶段文案（会随 slider 阈值切换）
  const stage = useMemo(() => {
    if (phase === 'optimize') {
      return {
        badge: 'A',
        title: '相关性优先（单目标更强）',
        subtitle: '探索位很少时，结果更可能集中在主兴趣附近。',
        note: '现象：短期稳定；风险：连续重复会降低发现性。',
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
        subtitle: '探索位增加后，系统会更积极地引入“邻近但不重复”的内容。',
        note: '关键：探索不是随机，而是从“语义邻近”里挑选候选进行试探。',
        what: [
          '• 预留少量位置用于兴趣边界探索。',
          '• 观察反馈（Like/停留等）决定是否扩充兴趣画像。',
          '• 这一步常与重排/混排策略相邻（示意）。',
        ],
      };
    }
    return {
      badge: 'C',
      title: '结果约束（相关性 × 多样性平衡）',
      subtitle: '探索位更高时，系统通常会对“过于相似”的结果施加更明确的形态约束。',
      note: '做法常包含 MMR 类思想：在相关性之外加入相似度惩罚（这里做示意）。',
      what: [
        '• 对最终展示结果做“形态约束”：避免连续重复、提升发现性。',
        '• 在保证总体相关的前提下，提高类目/主题覆盖。',
        '• 常见实现会包含 MMR/相似度惩罚等。',
      ],
    };
  }, [phase]);

  // ——生成 feed：连贯演进（同一套候选在不同阶段“形态变化”）
  const feed = useMemo(() => {
    const corePool =
      secondary === null
        ? [0, 0, 0, 1, 2] // 未扩圈：登山为主，少量装备/露营
        : [0, 0, secondary, 1, 2]; // 扩圈后：secondary 进入相关池

    // neighborPool：探索位承载的邻近内容池（exploreRatio 越大越“宽”）
    const neighborPool = (() => {
      const near = [3, 4, 5];
      const withSecondary = secondary === null ? near : [secondary, ...near];
      const r = clamp(exploreRatio, 0.05, 0.35);
      if (r < 0.14) return secondary === null ? [3, 3, 4] : [secondary, 3, 3, 4];
      if (r < 0.24) return withSecondary;
      return secondary === null ? [3, 4, 4, 5, 5] : [secondary, 3, 4, 4, 5, 5];
    })();

    const pick = (i: number) => {
      // A：相关性优先 — 仍以主兴趣为主，exploreRatio 越大，越可能出现同主题邻近（1/2）
      if (phase === 'optimize') {
        const p = clamp(exploreRatio, 0.05, 0.35);
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
      }

      // B：兴趣探索 — 探索位放邻近内容，其余放相关池
      if (phase === 'expand') {
        if (exploreSet.has(i)) return neighborPool[(i + seed) % neighborPool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // C：结果约束 — 相关为主 + 避免连续重复（示意“相似度惩罚/约束”）
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

      // 阶段权衡：A 更偏相关；B 轻微权衡；C 更强调“结果形态”（示意）
      const phaseAdj = phase === 'optimize' ? 0.05 : phase === 'expand' ? 0.02 : -0.01;

      const noise = Math.sin((i + seed) * 1.7) * 0.01;
      return clamp(base + primaryBoost + secondaryBoost + explorePenalty + phaseAdj + noise, 0, 1);
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      const score = scoreFor(i, t);

      const slotTag =
        phase === 'expand' || phase === 'constrain' ? (exploreSet.has(i) ? '探索位' : '主序位') : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
        i,
        typeIndex: t,
        score,
        slotTag,
        isExplore: exploreSet.has(i) && phase === 'expand',
      };
    });

    // C：让“最终输出排序”更直观（按 score 排序）
    if (phase === 'constrain') {
      return items
        .sort((a, b) => b.score - a.score)
        .map((x, newRank) => ({ ...x, rank: newRank + 1 }));
    }

    // A/B：按原位置展示
    return items.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [phase, seed, exploreSet, exploreRatio, primary, secondary]);

  // 指标：跟 slider / 阶段 / Like 扩圈一起变化（强调“牵动关系”）
  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);

    let div = diversityScore(typeIdxs);
    let rel = relevanceScore(typeIdxs, primary, secondary);

    // 让探索位占比对指标的方向影响更“可讲解”（示意）
    const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.85 : 0.7;

    const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05);

    div = clamp(Math.round(div + phaseW * (12 * rNorm)), 10, 85);
    rel = clamp(Math.round(rel - phaseW * (7 * rNorm)), 70, 99);

    // 如果 secondary 已纳入兴趣资产，相关性给一点“回升”（示意）
    if (secondary !== null) rel = clamp(rel + 2, 70, 99);

    return { relevance: rel, diversity: div };
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
      title="可手动切换；拖动探索位占比会按阈值自动切换"
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

            {/* Explore Ratio 控制条：驱动阶段 + 驱动结果 + 驱动指标 */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                  探索位占比（演示参数）
                </div>
                <div className="text-[11px] font-mono text-gray-400">
                  {(exploreRatio * 100).toFixed(0)}%（≈ {exploreSlots} / {n}） · phase →{' '}
                  <span className="text-gray-200">{phaseFromExploreRatio(exploreRatio)}</span>
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
                <div className="text-[10px] text-gray-500 mt-1">
                  拖动会同时改变：探索位数量/位置 → 推荐结果形态 → 指标数值，并按阈值切换阶段。
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

                            {/* 右上：探索阶段才允许“反馈 -> 扩圈” */}
                            {item.isExplore && phase === 'expand' && (
                              <button
                                onClick={() => {
                                  setSecondary(item.typeIndex);
                                  setSeed((s) => s + 1);
                                }}
                                className="absolute top-2 right-2 px-2.5 py-1.5 rounded-full text-[10px] font-black border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 transition"
                                title="模拟：用户对探索内容产生正反馈"
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
                              用来模拟“探索内容获得正反馈”。
                              被点赞的类型会进入兴趣画像：后续结果中，它会更频繁地出现在相关候选中。
                            </>
                          ) : (
                            <>
                              这个面板展示“多样性控制”对结果形态的影响（示意）。
                              重点：探索位占比与用户反馈会改变后续的内容构成与指标走向。
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
                        onClick={() => {
                          setSecondary(null);
                          setSeed((s) => s + 1);
                        }}
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
                    <div className="pt-2 text-[10px] text-gray-500">
                      注：这里是举例，数值与规则为示意；目的是让观众理解“为什么要做多样性控制，以及它如何与反馈形成闭环”。
                    </div>
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
