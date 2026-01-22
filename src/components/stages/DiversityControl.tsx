import React, { useMemo, useState } from 'react';
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

// 相关性分数示意：兴趣集合越丰富，“相关”的定义越宽（0~100）
function relevanceScore(typeIdxs: number[], effectiveInterest: Set<number>, primary: number) {
  const wPrimary = 1.0;
  const wInInterest = 0.72;
  const wOther = 0.28;

  let sum = 0;
  for (const t of typeIdxs) {
    if (t === primary) sum += wPrimary;
    else if (effectiveInterest.has(t)) sum += wInInterest;
    else sum += wOther;
  }
  return clamp(Math.round((sum / typeIdxs.length) * 100), 70, 99);
}

const DiversityControl: React.FC = () => {
  const [seed, setSeed] = useState(0);

  // 探索位占比：唯一主控旋钮
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 主兴趣（演示）：登山徒步 = 0
  const primary = 0;

  /**
   * ✅ 两段式：Like 先进入 pending（兴趣探索阶段记录正反馈）
   *           到多目标重排阶段（constrain）才“生效”进入 interestSet（主序位相关池）
   */
  const [pendingSet, setPendingSet] = useState<Set<number>>(() => new Set());
  const [interestSet, setInterestSet] = useState<Set<number>>(() => new Set());

  // 内容类型：保持严谨、通用
  const types = useMemo(
    () => [
      { name: '登山徒步', emoji: '⛰️', grad: 'from-emerald-500/35 to-emerald-900/10' }, // 0 primary
      { name: '户外装备', emoji: '🎒', grad: 'from-teal-500/30 to-teal-900/10' },       // 1
      { name: '露营生活', emoji: '⛺', grad: 'from-lime-500/30 to-lime-900/10' },        // 2

      // ✅ 兴趣探索阶段只允许这三个“邻近候选”
      { name: '路线攻略', emoji: '🗺️', grad: 'from-cyan-500/25 to-cyan-900/10' },       // 3 neighbor
      { name: '自然人文', emoji: '🌍', grad: 'from-indigo-500/25 to-indigo-900/10' },   // 4 neighbor
      { name: '轻户外', emoji: '🌿', grad: 'from-green-500/25 to-green-900/10' },       // 5 neighbor

      // ✅ 新方向：只在多目标重排阶段作为“新的探索候选”
      { name: '摄影纪实', emoji: '📷', grad: 'from-fuchsia-500/20 to-fuchsia-900/10' }, // 6 new
      { name: '科学科普', emoji: '🧪', grad: 'from-sky-500/20 to-sky-900/10' },         // 7 new
      { name: '城市漫游', emoji: '🏙️', grad: 'from-violet-500/20 to-violet-900/10' },  // 8 new
    ],
    []
  );

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 5);

  // ✅ 阶段由 exploreRatio 自动推断（不需要 tab）
  const phase: Phase = useMemo(() => {
    if (exploreRatio < 0.14) return 'optimize';
    if (exploreRatio < 0.24) return 'expand';
    return 'constrain';
  }, [exploreRatio]);

  // ✅ 进入多目标重排阶段时，将 pendingSet “提交”到 interestSet（生效进入主序位相关池）
  // 用 useMemo 做“阶段边界触发”的轻量方式：当 phase 变为 constrain 时，如果有 pending 就合并
  // （不引入 useEffect，仍然可控且不会自动播放）
  const phaseCommitKey = useMemo(() => {
    if (phase !== 'constrain') return 'no-commit';
    // 仅当 pending 有内容才触发合并
    if (pendingSet.size === 0) return 'no-commit';
    // 触发一次合并：用 seed 变化保证 UI 更新
    setInterestSet((prev) => {
      const next = new Set(prev);
      for (const t of pendingSet) next.add(t);
      return next;
    });
    setPendingSet(new Set());
    // 返回一个 key（无实际意义）
    return `commit-${seed}-${pendingSet.size}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]); // 故意只依赖 phase，保证“只在阶段切换到 constrain 时”发生

  // 探索位位置：用 seed 打散
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
        note: '集中推荐会降低发现性，兴趣边界容易变窄。',
      };
    }
    if (phase === 'expand') {
      return {
        badge: 'B',
        title: '兴趣探索（邻近候选）',
        subtitle: '探索位只从邻近集合中抽取，用反馈判断是否值得扩充画像。',
        note: '这一步只做“验证”，不立刻改变主序位结构。',
      };
    }
    return {
      badge: 'C',
      title: '多目标重排（相关性 × 多样性平衡）',
      subtitle: '将探索命中的内容纳入画像后，再进行重排；同时引入新方向补充探索。',
      note: '既降低连续相似密度，也避免探索池枯竭。',
    };
  }, [phase]);

  // ✅ “系统里通常做什么”随阶段变化
  const systemDo = useMemo(() => {
    if (phase === 'optimize') {
      return [
        '• 以预测收益为主导：优先输出更高相关的候选内容。',
        '• 风险在于：连续消费时结果容易集中，发现性下降。',
      ];
    }
    if (phase === 'expand') {
      return [
        '• 只在邻近候选集合内做探索：用少量位置测试兴趣边界。',
        '• Like 等反馈先进入“待确认集合”，用于后续阶段的画像扩充决策。',
      ];
    }
    return [
      '• 将探索命中的候选纳入画像：随后更可能进入主序位相关池。',
      '• 同时引入新的候选方向补充探索，避免探索池枯竭。',
      '• 重排时可加入 MMR 类思想：相关性之外加入相似度惩罚（此处为示意）。',
    ];
  }, [phase]);

  // ========== 关键池子定义 ==========
  const NEAR: number[] = [3, 4, 5];     // 邻近候选（兴趣探索阶段唯一允许的探索来源）
  const FRESH: number[] = [6, 7, 8];    // 新方向候选（只在多目标重排阶段出现）

  // ✅ 主序位相关池：在 expand 阶段不吸收 pending；在 constrain 阶段才吸收 interestSet
  const corePool = useMemo(() => {
    // 生效兴趣（只包含已提交的 interestSet，不包含 pendingSet）
    const interestArr = Array.from(interestSet).filter((x) => x !== primary);

    if (interestArr.length === 0) return [0, 0, 0, 1, 2];
    if (interestArr.length === 1) return [0, 0, interestArr[0], 1, 2, 0];
    return [0, 0, interestArr[0], interestArr[1], 1, 2, 0];
  }, [interestSet, primary]);

  // ✅ 兴趣探索阶段的探索池：只允许 NEAR（不允许 FRESH）
  const explorePoolExpand = useMemo(() => {
    // 如果 pending 已经点过了，也可以少量再出现（复测/补强），但仍只在 NEAR 内
    const likedNear = NEAR.filter((t) => pendingSet.has(t) || interestSet.has(t));
    const unlikedNear = NEAR.filter((t) => !pendingSet.has(t) && !interestSet.has(t));

    // 比例示意：未命中的邻近更常出现，命中的也会再出现少量（利于你讲“验证”）
    return [
      ...unlikedNear,
      ...unlikedNear,
      ...likedNear,
    ];
  }, [pendingSet, interestSet]);

  // ✅ 多目标重排阶段的探索池：NEAR（未命中可复测、降权） + FRESH（新方向补充）
  const explorePoolConstrain = useMemo(() => {
    const likedNear = NEAR.filter((t) => interestSet.has(t)); // 已提交命中
    const unlikedNear = NEAR.filter((t) => !interestSet.has(t)); // 仍未命中（不等于不喜欢，只是未确认）

    // 邻近命中“越多”，越需要新方向补充探索
    const saturation = likedNear.length / NEAR.length; // 0..1
    const freshBoost = saturation >= 1 ? 3 : saturation >= 2 / 3 ? 2 : 1;

    const freshWeighted: number[] = [];
    for (let k = 0; k < freshBoost; k++) freshWeighted.push(...FRESH);

    // unlikedNear 仍会复测，但降权（少一些）
    const retestWeighted = [
      ...unlikedNear, // 1x
      ...(exploreRatio > 0.28 ? unlikedNear : []), // 预算更大时允许更频繁复测
    ];

    return [
      ...retestWeighted,
      ...freshWeighted,
    ];
  }, [interestSet, exploreRatio]);

  // ========= 生成 feed =========
  const feed = useMemo(() => {
    // 选择本阶段探索池
    const explorePool = phase === 'expand' ? explorePoolExpand : explorePoolConstrain;

    const pick = (i: number) => {
      // A：相关性优先（仍允许轻微扩散，保证 slider 在 A 也有体感）
      if (phase === 'optimize') {
        const p = clamp(exploreRatio, 0.05, 0.35);
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
      }

      // B：兴趣探索（探索位=NEAR）
      if (phase === 'expand') {
        if (exploreSet.has(i)) return explorePool[(i + seed) % explorePool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // C：多目标重排（探索位=NEAR 复测 + FRESH 新方向）
      const base = exploreSet.has(i)
        ? explorePool[(i + seed) % explorePool.length]
        : corePool[(i + seed) % corePool.length];

      if (i === 0) return base;

      const prev = exploreSet.has(i - 1)
        ? explorePool[(i - 1 + seed) % explorePool.length]
        : corePool[(i - 1 + seed) % corePool.length];

      // 连续重复 -> 换一个（示意相似度惩罚）
      if (base === prev) {
        const alt = exploreSet.has(i) ? explorePool : corePool;
        return alt[(i + seed + 1) % alt.length];
      }
      return base;
    };

    const scoreFor = (i: number, t: number) => {
      const base = 0.80 + (i % 4) * 0.03;
      const primaryBoost = t === primary ? 0.06 : 0;

      // ✅ 只有“已提交”的兴趣（interestSet）在重排阶段会提升主序位的可见得分
      const inInterestBoost = interestSet.has(t) ? 0.03 : 0;

      // 探索位轻微折扣（示意）
      const explorePenalty = exploreSet.has(i) && phase !== 'optimize' ? -0.03 : 0;

      // 阶段微调（示意）
      const phaseAdj = phase === 'optimize' ? 0.05 : phase === 'expand' ? 0.02 : 0.0;
      const noise = Math.sin((i + seed) * 1.7) * 0.01;

      return clamp(base + primaryBoost + inInterestBoost + explorePenalty + phaseAdj + noise, 0, 1);
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      const score = scoreFor(i, t);

      // ✅ 探索位身份规则：
      // - expand：探索位就是探索位（即便 pending Like 了，也仍显示为探索位）
      // - constrain：如果该类型已提交进 interestSet，则不再算探索位（进入主序位）
      const isExplore =
        phase !== 'optimize' &&
        exploreSet.has(i) &&
        t !== primary &&
        (phase === 'expand' ? true : !interestSet.has(t));

      const slotTag = phase === 'optimize' ? '主序位' : isExplore ? '探索位' : '主序位';

      return {
        id: `${phase}-${seed}-${i}-${phaseCommitKey}`, // phaseCommitKey 确保提交后 UI 刷新
        i,
        typeIndex: t,
        score,
        slotTag,
        isExplore,
      };
    });

    // C：按 score 排序更直观（最终展示顺序）
    if (phase === 'constrain') {
      return items.sort((a, b) => b.score - a.score).map((x, idx) => ({ ...x, rank: idx + 1 }));
    }

    return items.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [
    phase,
    seed,
    exploreSet,
    exploreRatio,
    primary,
    interestSet,
    pendingSet,
    corePool,
    explorePoolExpand,
    explorePoolConstrain,
    phaseCommitKey,
  ]);

  // ✅ 指标：Like 在 expand 阶段只会轻微变化（因为只是 pending），到 constrain 阶段会更明显（提交生效）
  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);

    // effectiveInterest：只有 constrain 才把 interestSet “生效”得更强；
    // expand 阶段 pending 只做轻微加成（示意“确认前影响较弱”）
    const effectiveInterest = new Set<number>(interestSet);
    if (phase === 'expand') {
      for (const t of pendingSet) effectiveInterest.add(t);
    }

    let div = diversityScore(typeIdxs);
    let rel = relevanceScore(typeIdxs, effectiveInterest, primary);

    const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.85 : 0.75;
    const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05); // 0..1

    div = clamp(Math.round(div + phaseW * (14 * rNorm)), 10, 92);
    rel = clamp(Math.round(rel - phaseW * (7 * rNorm)), 70, 99);

    const confirmedN = Array.from(interestSet).filter((x) => x !== primary).length;
    const pendingN = Array.from(pendingSet).filter((x) => x !== primary).length;

    // ✅ pending 影响弱，confirmed 影响强
    div = clamp(div + clamp(Math.round(confirmedN * 2.0 + pendingN * 0.8), 0, 10), 10, 95);
    rel = clamp(rel + clamp(Math.round(confirmedN * 1.4 + pendingN * 0.5), 0, 7), 70, 99);

    return { relevance: rel, diversity: div };
  }, [feed, interestSet, pendingSet, phase, exploreRatio, primary]);

  // Like：只在 expand 阶段出现按钮；Like 进入 pending，不立刻变主序位
  const onLike = (typeIndex: number) => {
    if (typeIndex === primary) return;
    setPendingSet((prev) => {
      const next = new Set(prev);
      next.add(typeIndex);
      return next;
    });
    setSeed((s) => s + 1);
  };

  const removeInterest = (typeIndex: number) => {
    // 移除时，同时从 pending 与 confirmed 都移除（更直观）
    setPendingSet((prev) => {
      const next = new Set(prev);
      next.delete(typeIndex);
      return next;
    });
    setInterestSet((prev) => {
      const next = new Set(prev);
      next.delete(typeIndex);
      return next;
    });
    setSeed((s) => s + 1);
  };

  const resetInterest = () => {
    setPendingSet(new Set());
    setInterestSet(new Set());
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

  // 三段颜色（画在轨道 div 上）
  const sliderStops = useMemo(() => {
    const t1 = ((0.14 - 0.05) / (0.35 - 0.05)) * 100;
    const t2 = ((0.24 - 0.05) / (0.35 - 0.05)) * 100;
    return { t1, t2 };
  }, []);

  const sliderBg = useMemo(() => {
    const { t1, t2 } = sliderStops;
    return `linear-gradient(90deg,
      rgba(59,130,246,0.85) 0%,
      rgba(59,130,246,0.85) ${t1}%,
      rgba(16,185,129,0.85) ${t1}%,
      rgba(16,185,129,0.85) ${t2}%,
      rgba(168,85,247,0.85) ${t2}%,
      rgba(168,85,247,0.85) 100%
    )`;
  }, [sliderStops]);

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      <style>{`
        .range3 {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          background: transparent;
          outline: none;
        }
        .range3::-webkit-slider-runnable-track {
          height: 12px;
          background: transparent;
          border-radius: 9999px;
        }
        .range3::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: rgba(16,185,129,1);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 20px rgba(16,185,129,0.35);
          margin-top: -3px;
          cursor: pointer;
        }
        .range3::-moz-range-track {
          height: 12px;
          background: transparent;
          border-radius: 9999px;
        }
        .range3::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: rgba(16,185,129,1);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 20px rgba(16,185,129,0.35);
          cursor: pointer;
        }
      `}</style>

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
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{stage.title}</h2>
                    </div>
                    <div className="text-xs text-gray-400">{stage.subtitle}</div>
                    <div className="text-[11px] text-gray-500">{stage.note}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Explore Ratio 控制条（线本身三段颜色） */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">探索位占比（演示参数）</div>
                <div className="text-[11px] font-mono text-gray-400">
                  {(exploreRatio * 100).toFixed(0)}%（≈ {exploreSlots} / {n}）
                </div>
              </div>

              <div className="mt-3">
                <div className="relative w-full">
                  <div className="h-[12px] rounded-full" style={{ backgroundImage: sliderBg }} />
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
                    className="range3 absolute inset-0"
                    aria-label="explore ratio"
                  />
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                  <span>相关性优先</span>
                  <span>兴趣探索</span>
                  <span>多目标重排</span>
                </div>

                <div className="text-[10px] text-gray-500 mt-1">拉动后：探索位数量与位置会变化，推荐结果与指标会随之变化。</div>
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
                        const isPending = pendingSet.has(item.typeIndex) && phase === 'expand';
                        const isConfirmed = interestSet.has(item.typeIndex) && phase === 'constrain';

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

                              {/* ✅ 不增加新的右上“画像提示”，只在卡片内部做轻量状态 */}
                              {isPending && (
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">
                                  pending
                                </div>
                              )}
                              {isConfirmed && item.typeIndex !== primary && (
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">
                                  in interest
                                </div>
                              )}
                            </div>

                            {/* 右上：探索位可见交互（只在兴趣探索阶段展示） */}
                            {item.isExplore && phase === 'expand' && (
                              <button
                                onClick={() => onLike(item.typeIndex)}
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
                      key={`${phase}-${seed}-${interestSet.size}-${pendingSet.size}-${exploreSlots}`}
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
                              用来模拟“探索命中”。命中会先进入待确认集合，进入下一阶段后再纳入兴趣画像并影响主序位。
                            </>
                          ) : phase === 'constrain' ? (
                            <>
                              在多目标重排阶段，已命中的内容会更倾向进入主序位；同时会引入新的候选方向补充探索，避免探索池枯竭。
                            </>
                          ) : (
                            <>
                              这里展示多样性控制对结果形态的影响。探索位占比控制探索预算，反馈用于后续画像扩充决策。
                            </>
                          )}
                        </div>
                      </div>

                      {(pendingSet.size > 0 || interestSet.size > 0) && (
                        <div className="pt-1">
                          <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                            已纳入兴趣画像（演示）
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {/* ✅ 只把“已提交”的展示为纳入画像；pending 不算纳入画像 */}
                            {Array.from(interestSet)
                              .filter((tIdx) => tIdx !== primary)
                              .map((tIdx) => (
                                <button
                                  key={tIdx}
                                  onClick={() => removeInterest(tIdx)}
                                  className="px-3 py-1 rounded-full text-[11px] border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/18 transition"
                                  title="点击移除（模拟画像收敛/降权）"
                                >
                                  {types[tIdx]?.name ?? `type-${tIdx}`} <span className="opacity-70">×</span>
                                </button>
                              ))}

                            <button
                              onClick={resetInterest}
                              className="px-3 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition"
                              title="清空演示"
                            >
                              reset
                            </button>
                          </div>

                          {/* ✅ pending 只作为提示，不算“已纳入画像” */}
                          {pendingSet.size > 0 && phase === 'expand' && (
                            <div className="mt-2 text-[10px] text-gray-500">
                              待确认：{Array.from(pendingSet).map((i) => types[i]?.name).join(' / ')}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="text-[12px] font-black text-gray-200 mb-3">这一步在系统里通常做什么</div>
                  <div className="text-[11px] text-gray-400 leading-relaxed space-y-2">
                    {systemDo.map((line, i) => (
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
