import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, Heart, X } from 'lucide-react';

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

// 相关性分数示意：兴趣集合越丰富，“相关”的定义越宽（0~100）
function relevanceScore(typeIdxs: number[], interestSet: Set<number>, primary: number) {
  const wPrimary = 1.0;
  const wInInterest = 0.72;
  const wOther = 0.28;

  let sum = 0;
  for (const t of typeIdxs) {
    if (t === primary) sum += wPrimary;
    else if (interestSet.has(t)) sum += wInInterest;
    else sum += wOther;
  }
  return clamp(Math.round((sum / typeIdxs.length) * 100), 70, 99);
}

const DiversityControl: React.FC = () => {
  const [seed, setSeed] = useState(0);

  // 探索位占比：唯一主控旋钮（用三段颜色表达阶段）
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 主兴趣（演示）：登山徒步 = 0
  const primary = 0;

  // ✅ 兴趣资产：允许纳入多个（你想要的：like 两次都能进）
  const [interestSet, setInterestSet] = useState<Set<number>>(() => new Set());

  // （可选）演示：连续对探索内容正反馈 -> 轻微上调探索预算（默认关，严谨）
  const AUTO_BUMP_ON_LIKE = false;

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

  // ✅ 阶段由 exploreRatio 自动推断（取代 tab）
  const phase: Phase = useMemo(() => {
    if (exploreRatio < 0.14) return 'optimize';     // 相关性优先
    if (exploreRatio < 0.24) return 'expand';       // 兴趣探索
    return 'constrain';                              // 约束更强 / 更宽探索预算
  }, [exploreRatio]);

  // 探索位位置：用 seed 打散，slider/like 时刷新 seed -> 位置变化更明显
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
        subtitle: '主要按预测收益排序，结果更集中于主兴趣附近。',
        note: '在连续消费的场景里，集中推荐会降低发现性，兴趣边界容易变窄。',
      };
    }
    if (phase === 'expand') {
      return {
        badge: 'B',
        title: '兴趣探索（探索位注入）',
        subtitle: '预留少量位置展示“邻近但不重复”的内容，用反馈判断是否扩充画像。',
        note: '探索不是随机：通常挑选与主兴趣在语义/行为层面更接近的候选。',
      };
    }
    return {
      badge: 'C',
      title: '结果约束（相关性 × 多样性平衡）',
      subtitle: '对过于相似的结果施加约束，避免连续重复，同时保留高相关内容。',
      note: '常见落点在重排/过滤附近：不改主流程，但约束最终展示形态。',
    };
  }, [phase]);

  // 探索位的候选池：ratio 越大，探索越“宽”
  const neighborPool = useMemo(() => {
    const near = [3, 4, 5]; // 路线/人文/轻户外
    const interestArr = Array.from(interestSet);

    // 将已纳入兴趣资产的类型也纳入“可被抽到”的邻近池（更贴近真实：画像扩展后更易出现）
    const base = interestArr.length > 0 ? [...interestArr, ...near] : near;

    const r = clamp(exploreRatio, 0.05, 0.35);
    if (r < 0.14) return base.length ? [...base, ...base] : near; // 更谨慎：更靠近
    if (r < 0.24) return base;                                    // 中等宽度
    return [...base, 4, 4, 5, 5];                                 // 更宽：更容易抽到泛邻近
  }, [interestSet, exploreRatio]);

  const feed = useMemo(() => {
    // 相关池：主兴趣 + 少量同主题邻近 + 已纳入兴趣资产（让“like 两次”更有体感）
    const interestArr = Array.from(interestSet).filter((x) => x !== primary);

    const corePool =
      interestArr.length === 0
        ? [0, 0, 0, 1, 2]
        : [0, 0, interestArr[0] ?? 1, interestArr[1] ?? 2, 1, 2];

    const pick = (i: number) => {
      // A：相关性优先，但 exploreRatio 越大，轻微扩散越多（让 slider 在 A 也能看出区别）
      if (phase === 'optimize') {
        const p = clamp(exploreRatio, 0.05, 0.35);
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
      }

      // B：探索位注入
      if (phase === 'expand') {
        if (exploreSet.has(i)) return neighborPool[(i + seed) % neighborPool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // C：约束更强：同样保留探索位，但避免连续重复（示意相似度惩罚 / MMR 类思想）
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
      const inInterestBoost = interestSet.has(t) ? 0.03 : 0;
      const explorePenalty = exploreSet.has(i) && phase !== 'optimize' ? -0.03 : 0;
      const phaseAdj = phase === 'optimize' ? 0.05 : phase === 'expand' ? 0.02 : 0.0;
      const noise = Math.sin((i + seed) * 1.7) * 0.01;
      return clamp(base + primaryBoost + inInterestBoost + explorePenalty + phaseAdj + noise, 0, 1);
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      const score = scoreFor(i, t);
      const slotTag = phase === 'optimize' ? '主序位' : exploreSet.has(i) ? '探索位' : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
        i,
        typeIndex: t,
        score,
        slotTag,
        isExplore: exploreSet.has(i) && phase !== 'optimize',
      };
    });

    // C：按 score 做“最终排序”的观感
    if (phase === 'constrain') {
      return items
        .sort((a, b) => b.score - a.score)
        .map((x, idx) => ({ ...x, rank: idx + 1 }));
    }

    return items.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [phase, seed, exploreSet, exploreRatio, primary, interestSet, neighborPool]);

  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);
    let div = diversityScore(typeIdxs);
    let rel = relevanceScore(typeIdxs, interestSet, primary);

    // 让指标“方向正确且可讲解”：探索位占比对指标的影响显式化（示意）
    const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.8 : 0.65;
    const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05);

    div = clamp(Math.round(div + phaseW * (10 * rNorm)), 10, 85);
    rel = clamp(Math.round(rel - phaseW * (6 * rNorm)), 70, 99);

    // 兴趣资产越多，相关性“理解范围”变大，轻微回补相关性（示意）
    const interestBonus = clamp(interestSet.size * 1.2, 0, 4);
    rel = clamp(rel + Math.round(interestBonus), 70, 99);

    return { relevance: rel, diversity: div };
  }, [feed, interestSet, phase, exploreRatio, primary]);

  const onLike = (typeIndex: number) => {
    setInterestSet((prev) => {
      const next = new Set(prev);
      if (typeIndex !== primary) next.add(typeIndex);
      return next;
    });

    if (AUTO_BUMP_ON_LIKE) {
      setExploreRatio((r) => clamp(r + 0.02, 0.05, 0.35));
    }

    setSeed((s) => s + 1);
  };

  const removeInterest = (typeIndex: number) => {
    setInterestSet((prev) => {
      const next = new Set(prev);
      next.delete(typeIndex);
      return next;
    });
    setSeed((s) => s + 1);
  };

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

              {/* 兴趣资产 chips */}
              <div className="flex flex-col items-start xl:items-end gap-2">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                  已纳入兴趣画像（演示）
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...interestSet].length === 0 && (
                    <span className="text-[11px] text-gray-500">（暂无）</span>
                  )}
                  {[...interestSet].map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    >
                      {types[t]?.name ?? `type-${t}`}
                      <button
                        onClick={() => removeInterest(t)}
                        className="opacity-70 hover:opacity-100"
                        title="移除"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Explore Ratio 控制条 + 三段颜色 */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                  探索位占比（演示参数）
                </div>
                <div className="text-[11px] font-mono text-gray-400">
                  {(exploreRatio * 100).toFixed(0)}%（≈ {exploreSlots} / {n}）
                </div>
              </div>

              {/* 三段彩条（optimize / expand / constrain） */}
              <div className="mt-3 relative">
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div className="w-[33%] bg-blue-500/35" />
                  <div className="w-[34%] bg-emerald-500/30" />
                  <div className="w-[33%] bg-purple-500/30" />
                </div>

                {/* slider 放在彩条上方 */}
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
                  className="w-full -mt-2 accent-emerald-400"
                />

                <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                  <span>相关性优先</span>
                  <span>兴趣探索</span>
                  <span>结果约束</span>
                </div>

                <div className="mt-1 text-[10px] text-gray-500">
                  调整后：探索位数量与位置会变化，feed 形态与指标会随之变化（阶段会随区间自动变化）。
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
                              {phase !== 'optimize' && (
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
                              {interestSet.has(item.typeIndex) && item.typeIndex !== primary && (
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">
                                  in interest
                                </div>
                              )}
                            </div>

                            {/* 右上：探索位的可见用户动作（Like） */}
                            {item.isExplore && phase === 'expand' && (
                              <button
                                onClick={() => onLike(item.typeIndex)}
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

              {/* Right Panel: 指标 + 说明 */}
              <div className="space-y-6">
                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="text-[12px] font-black text-gray-200 mb-4">当前阶段的结果变化（示意）</div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${phase}-${seed}-${interestSet.size}-${exploreSlots}`}
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
                              你可以对探索位内容点击 <span className="text-emerald-200 font-bold">Like</span>，
                              用来模拟“探索命中”后画像扩充。
                              被纳入的内容类型会在后续结果中更频繁进入“相关池”，并影响指标走势。
                            </>
                          ) : (
                            <>
                              这里展示“这一秒的多样性控制”对结果形态的影响。
                              探索位占比是策略旋钮；用户反馈决定探索是否转化为兴趣资产。
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {interestSet.size > 0 && (
                    <div className="mt-4 text-[10px] font-mono text-emerald-200/90">
                      ✅ 已纳入兴趣画像：{[...interestSet].map((t) => types[t]?.name).join('、')}
                      <button
                        onClick={() => {
                          setInterestSet(new Set());
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
                    <div>• 在排序之后，对结果做形态约束：降低连续相似内容的密度，提高发现性。</div>
                    <div>• 预留少量探索预算：用“邻近候选”探索兴趣边界，依赖反馈决定是否扩充画像。</div>
                    <div>• 常见实现会包含 MMR 类思想：在相关性之外加入相似度惩罚（此处为示意）。</div>
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
