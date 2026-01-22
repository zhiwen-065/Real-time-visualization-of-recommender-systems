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

  // 探索位占比：唯一主控旋钮
  const [exploreRatio, setExploreRatio] = useState(0.2);

  // 主兴趣（演示）：登山徒步 = 0
  const primary = 0;

  // ✅ 兴趣资产：支持纳入多个（Like 多次）
  const [interestSet, setInterestSet] = useState<Set<number>>(() => new Set());

  // 内容类型：保持严谨、通用
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
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 5);

  // ✅ 阶段由 exploreRatio 自动推断（不需要 tab）
  const phase: Phase = useMemo(() => {
    if (exploreRatio < 0.14) return 'optimize';
    if (exploreRatio < 0.24) return 'expand';
    return 'constrain';
  }, [exploreRatio]);

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
        title: '兴趣探索（探索位注入）',
        subtitle: '预留少量位置展示邻近内容，用反馈判断是否扩充画像。',
        note: '探索通常是“邻近探索”，而不是随机推荐。',
      };
    }
    return {
      badge: 'C',
      title: '多目标重排（相关性 × 多样性平衡）',
      subtitle: '对过于相似的结果施加约束，避免连续重复，同时保留高相关内容。',
      note: '常见落点在重排/过滤附近：约束最终展示形态。',
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
        '• 预留少量探索预算：在相关候选中选取“邻近但不同”的内容。',
        '• 通过反馈（点赞/完播/停留等）判断是否将其纳入兴趣资产。',
      ];
    }
    return [
      '• 将“已命中”的探索内容纳入兴趣资产：后续可进入主序位（不再只是探索位）。',
      '• 对展示结果施加形态约束：降低连续相似内容密度（示意包含 MMR 类思想：相似度惩罚）。',
    ];
  }, [phase]);

  // ——探索池：只用于“探索位”，会排除已纳入兴趣的类型
  const exploreNeighborPool = useMemo(() => {
    const near = [3, 4, 5]; // 路线/人文/轻户外
    const pool = near.filter((t) => !interestSet.has(t));
    return pool.length > 0 ? pool : near; // 全被纳入时，仍保留一个可探索池（演示用）
  }, [interestSet]);

  // ——相关池：主兴趣 + 同主题邻近 + 已纳入兴趣资产（= 进入主序位）
  const corePool = useMemo(() => {
    const interestArr = Array.from(interestSet).filter((x) => x !== primary);
    // 保持“可讲解”的稳定形态：主兴趣占主导，兴趣资产逐步融入
    if (interestArr.length === 0) return [0, 0, 0, 1, 2];
    if (interestArr.length === 1) return [0, 0, interestArr[0], 1, 2, 0];
    return [0, 0, interestArr[0], interestArr[1], 1, 2, 0];
  }, [interestSet, primary]);

  // ——用于阶段 B：探索更“宽/窄”的示意（但仍只在探索位里抽）
  const explorePickPool = useMemo(() => {
    const r = clamp(exploreRatio, 0.05, 0.35);
    if (r < 0.14) return [exploreNeighborPool[0] ?? 3, exploreNeighborPool[0] ?? 3, exploreNeighborPool[1] ?? 4];
    if (r < 0.24) return exploreNeighborPool;
    return [...exploreNeighborPool, ...exploreNeighborPool, 4, 5].filter((x) => x !== undefined) as number[];
  }, [exploreNeighborPool, exploreRatio]);

  // ✅ 关键：Like 过的内容到了“多目标重排”阶段将进入主序位（不再算探索位）
  const feed = useMemo(() => {
    const pick = (i: number) => {
      // A：相关性优先（仍允许轻微扩散，保证 slider 在 A 也有体感）
      if (phase === 'optimize') {
        const p = clamp(exploreRatio, 0.05, 0.35);
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < p ? ([1, 2][(i + seed) % 2]) : 0;
      }

      // B：探索位注入（探索位只从 explorePickPool 抽；主序位从 corePool 抽）
      if (phase === 'expand') {
        if (exploreSet.has(i)) return explorePickPool[(i + seed) % explorePickPool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // C：多目标重排（探索位仍从 exploreNeighborPool 抽，但已命中兴趣资产的类型会更多出现在主序位）
      const base = exploreSet.has(i)
        ? exploreNeighborPool[(i + seed) % exploreNeighborPool.length]
        : corePool[(i + seed) % corePool.length];

      if (i === 0) return base;

      const prev = exploreSet.has(i - 1)
        ? exploreNeighborPool[(i - 1 + seed) % exploreNeighborPool.length]
        : corePool[(i - 1 + seed) % corePool.length];

      // 连续重复 -> 换一个（示意相似度惩罚）
      if (base === prev) {
        const alt = exploreSet.has(i) ? exploreNeighborPool : corePool;
        return alt[(i + seed + 1) % alt.length];
      }
      return base;
    };

    const scoreFor = (i: number, t: number) => {
      const base = 0.80 + (i % 4) * 0.03;
      const primaryBoost = t === primary ? 0.06 : 0;
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

      // ✅ 关键修正：探索位的“身份”会被兴趣资产重新定义
      // - expand/constrain：位置在 exploreSet 里，且该类型尚未纳入 interest => 探索位
      // - 一旦纳入 interest => 在重排阶段应视作主序位内容（不再只是探索位）
      const isExplore =
        phase !== 'optimize' &&
        exploreSet.has(i) &&
        !interestSet.has(t) &&
        t !== primary;

      const slotTag = phase === 'optimize' ? '主序位' : isExplore ? '探索位' : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
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
  }, [phase, seed, exploreSet, exploreRatio, primary, interestSet, corePool, exploreNeighborPool, explorePickPool]);

  // ✅ 指标：随 slider 增长 -> 多样性总体上升；Like 扩圈 -> 多样性/相关性也变化
  const metrics = useMemo(() => {
    const typeIdxs = feed.map((f) => f.typeIndex);

    let div = diversityScore(typeIdxs);
    let rel = relevanceScore(typeIdxs, interestSet, primary);

    const phaseW = phase === 'optimize' ? 0.25 : phase === 'expand' ? 0.85 : 0.75;
    const rNorm = (clamp(exploreRatio, 0.05, 0.35) - 0.05) / (0.35 - 0.05); // 0..1

    // slider 越往右，多样性越高（示意）
    div = clamp(Math.round(div + phaseW * (14 * rNorm)), 10, 92);

    // slider 越往右，相关性轻微下降（示意）
    rel = clamp(Math.round(rel - phaseW * (7 * rNorm)), 70, 99);

    // Like 扩圈：兴趣资产增加 => 多样性可持续性更强；相关性“定义变宽”可回补
    const interestN = Array.from(interestSet).filter((x) => x !== primary).length;
    div = clamp(div + clamp(Math.round(interestN * 2.0), 0, 8), 10, 95);
    rel = clamp(rel + clamp(Math.round(interestN * 1.4), 0, 6), 70, 99);

    return { relevance: rel, diversity: div };
  }, [feed, interestSet, phase, exploreRatio, primary]);

  const onLike = (typeIndex: number) => {
    if (typeIndex === primary) return;

    setInterestSet((prev) => {
      const next = new Set(prev);
      next.add(typeIndex);
      return next;
    });

    // Like 后刷新结果（更有“实时反馈”感）
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

  const resetInterest = () => {
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

  // ✅ 三段颜色（直接画在“轨道 div”上，避免浏览器 range track 不吃 background 的问题）
  const sliderStops = useMemo(() => {
    const t1 = ((0.14 - 0.05) / (0.35 - 0.05)) * 100; // optimize -> expand
    const t2 = ((0.24 - 0.05) / (0.35 - 0.05)) * 100; // expand -> constrain
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
      {/* range 样式（确保三段颜色可见、thumb 可控） */}
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
          margin-top: -3px; /* 让 thumb 垂直居中 */
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
                {/* 轨道：三段颜色 */}
                <div className="relative w-full">
                  <div
                    className="h-[12px] rounded-full"
                    style={{ backgroundImage: sliderBg }}
                  />
                  {/* range：透明轨道 + 可见 thumb（覆盖在上面） */}
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

                <div className="text-[10px] text-gray-500 mt-1">
                  拉动后：探索位数量与位置会变化，推荐结果与指标会随之变化。
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
                                <div className="mt-1 text-[10px] font-mono text-emerald-200/90">in interest</div>
                              )}
                            </div>

                            {/* 右上：探索位可见交互（只在“兴趣探索”阶段展示） */}
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
                              你可以对探索位内容点击 <span className="text-emerald-200 font-bold">Like</span>，用来模拟“探索命中”后画像扩充。
                              被纳入的类型在后续阶段会进入主序位（不再只是探索位），并反映到指标变化中。
                            </>
                          ) : (
                            <>
                              这里展示多样性控制对结果形态的影响。探索位占比控制探索预算，用户反馈决定探索是否转化为兴趣资产。
                            </>
                          )}
                        </div>
                      </div>

                      {/* ✅ 只保留这里的“已纳入兴趣画像” */}
                      {Array.from(interestSet).filter((x) => x !== primary).length > 0 && (
                        <div className="pt-1">
                          <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                            已纳入兴趣画像（演示）
                          </div>

                          <div className="flex flex-wrap gap-2">
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
