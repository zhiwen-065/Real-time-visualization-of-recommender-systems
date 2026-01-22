import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, ArrowRight } from 'lucide-react';

type Phase = 'relevance' | 'explore' | 'rerank';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const DiversityControl: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('relevance');
  const [seed, setSeed] = useState(0);
  const [exploreRatio, setExploreRatio] = useState(0.18);

  // 自动逐一播放（你想全手动讲，就把这段 useEffect 删掉）
  useEffect(() => {
    const order: Phase[] = ['relevance', 'explore', 'rerank'];
    const t = setInterval(() => {
      setPhase((p) => order[(order.indexOf(p) + 1) % order.length]);
      setSeed((s) => s + 1);
    }, 5200);
    return () => clearInterval(t);
  }, []);

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

  // ——卡牌类型（不要出现平台名，且内容贴合讲座）
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
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 4);
  const explorePositions = [1, 4, 8, 10].slice(0, exploreSlots);
  const exploreSet = new Set(explorePositions);

  // ——三个阶段在“同一个 feed”里生成不同的内容组合
  const feed = useMemo(() => {
    // 核心相关池：仍然偏向用户主兴趣
    const corePool = [0, 0, 0, 1, 2]; // 登山为主，少量装备/露营
    // 探索池：语义邻近但不重复（用于探索边界，不是“讨厌内容”）
    const explorePool = [3, 4, 5]; // 路线/自然人文/轻户外

    const pickType = (i: number) => {
      if (phase === 'relevance') {
        // ① 相关性排序：高度集中，便于解释“同质化风险”
        return 0; // 12/12 登山徒步
      }

      if (phase === 'explore') {
        // ② 插入探索位：在结果中预留少量位置插入边界内容
        if (exploreSet.has(i)) return explorePool[(i + seed) % explorePool.length];
        return corePool[(i + seed) % corePool.length];
      }

      // ③ 重排打散：MMR 思想（示意）——在“仍然相关”的前提下惩罚相似度，避免连着重复
      const base = exploreSet.has(i)
        ? explorePool[(i + seed) % explorePool.length]
        : corePool[(i + seed) % corePool.length];

      if (i === 0) return base;
      // 如果与前一个类型相同，就切到邻近类型（演示用的“相似度惩罚”效果）
      const prevBase = exploreSet.has(i - 1)
        ? explorePool[(i - 1 + seed) % explorePool.length]
        : corePool[(i - 1 + seed) % corePool.length];

      return base === prevBase ? (base + 1) % types.length : base;
    };

    const scoreFor = (i: number, typeIndex: number) => {
      // 分数是“示意”，用于配合讲解：探索/打散会带来轻微权衡
      const base = 0.86 + (i % 4) * 0.02;
      const phaseAdj = phase === 'relevance' ? 0.04 : phase === 'explore' ? 0.01 : -0.01;
      const typeAdj = typeIndex === 0 ? 0.012 : 0; // 核心类型略高
      const noise = Math.sin((i + seed) * 1.7) * 0.008;
      return clamp(base + phaseAdj + typeAdj + noise, 0, 1);
    };

    return Array.from({ length: n }).map((_, i) => {
      const typeIndex = pickType(i);
      const score = scoreFor(i, typeIndex);
      const slotTag =
        phase === 'explore' && exploreSet.has(i)
          ? '探索位'
          : phase === 'rerank' && exploreSet.has(i)
            ? '探索位'
            : '主序位';

      return {
        id: `${phase}-${seed}-${i}`,
        i,
        typeIndex,
        score,
        slotTag,
      };
    });
  }, [phase, seed, exploreRatio, exploreSlots, exploreSet, types.length]);

  // ——每个阶段的解释与指标（只展示当前阶段，不并排三份）
  const stage = useMemo(() => {
    if (phase === 'relevance') {
      return {
        title: '多样性控制：从“排序结果”开始观察',
        subtitle: '候选内容按预测收益/相关性排序后，结果可能高度集中在相近主题。',
        badge: 'Step A',
        accuracy: 98,
        diversity: 10,
        hint:
          '讲解点：这个阶段不是“算法坏”，而是单目标优化容易把相似内容推到一起，用户体验可能变得单一。',
      };
    }
    if (phase === 'explore') {
      return {
        title: '多样性控制：插入少量探索位',
        subtitle: '在结果中预留少量位置，插入“语义邻近但不重复”的内容，用于兴趣边界探索。',
        badge: 'Step B',
        accuracy: 97,
        diversity: 22,
        hint:
          '讲解点：探索位不是随机塞内容，而是在“仍可能相关”的范围内做探索；用户反馈会影响后续画像与排序。',
      };
    }
    return {
      title: '多样性控制：重排打散（MMR 思想示意）',
      subtitle: '在“仍然相关”的前提下，对与已选内容高度相似的项施加惩罚，避免连续重复。',
      badge: 'Step C',
      accuracy: 95,
      diversity: 36,
      hint:
        '讲解点：多目标权衡——相关性可能轻微下降，但发现性/长期体验更稳；这一步通常发生在重排层。',
    };
  }, [phase]);

  const MetricBar = ({
    label,
    val,
    max = 100,
    tone = 'blue',
  }: {
    label: string;
    val: number;
    max?: number;
    tone?: 'blue' | 'green' | 'red';
  }) => {
    const pct = clamp((val / max) * 100, 0, 100);
    const barClass =
      tone === 'green' ? 'bg-emerald-400/80' : tone === 'red' ? 'bg-red-400/80' : 'bg-blue-400/80';

    return (
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest">{label}</span>
          <span className="text-2xl font-black text-white">{val}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${pct}%` }} className={`h-full ${barClass}`} />
        </div>
      </div>
    );
  };

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
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10">
                <PhaseButton id="relevance" label="相关性排序" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="explore" label="插入探索位" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton id="rerank" label="重排打散" />
              </div>
            </div>

            {/* Explore Ratio（只在探索/重排时展示更合理；但你讲座可一直展示） */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">
                  Explore Slots Ratio（探索位占比）
                </div>
                <div className="text-[11px] font-mono text-gray-400">
                  {(exploreRatio * 100).toFixed(0)}%（≈ {exploreSlots} / {n}）
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] text-gray-500 font-mono">5%</span>
                <div className="relative flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    animate={{ width: `${exploreRatio * 100}%` }}
                    className="h-full bg-emerald-400/70"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono">30%</span>
              </div>

              <div className="mt-3">
                <input
                  type="range"
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  value={exploreRatio}
                  onChange={(e) => {
                    setExploreRatio(parseFloat(e.target.value));
                    setSeed((s) => s + 1);
                  }}
                  className="w-full accent-emerald-400"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  用于展示“探索位”比例变化对结果形态的影响（演示参数）。
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 md:p-10 space-y-8">
            {/* Feed + Right Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6 items-start">
              {/* Feed */}
              <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">当前推荐结果（示意）</div>
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
                        const isExplore = item.slotTag === '探索位';

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.28, delay: idx * 0.01 }}
                            className="relative h-[150px] rounded-2xl overflow-hidden border border-white/10 shadow-lg"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-b ${t.grad}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                            <div className="absolute top-2 left-2">
                              <div
                                className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                                  isExplore
                                    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                                    : 'bg-white/5 text-gray-200 border-white/10'
                                }`}
                              >
                                {item.slotTag}
                              </div>
                            </div>

                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl drop-shadow-lg">{t.emoji}</div>
                              <div className="mt-1 text-[11px] font-black text-white/90">{t.name}</div>
                            </div>

                            <div className="absolute left-3 right-3 bottom-3">
                              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                                <span>score</span>
                                <span>{item.score.toFixed(2)}</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  animate={{ width: `${Math.min(100, item.score * 100)}%` }}
                                  className={`h-full ${isExplore ? 'bg-emerald-400/75' : 'bg-blue-400/65'}`}
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

              {/* Metrics */}
              <div className="space-y-6">
                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="text-[12px] font-black text-gray-200 mb-4">这一秒里，这一步在优化什么</div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      <MetricBar label="相关性指标（示意）" val={stage.accuracy} tone="blue" />
                      <MetricBar
                        label="多样性指标（示意）"
                        val={stage.diversity}
                        tone={stage.diversity < 15 ? 'red' : 'green'}
                      />

                      <div className="pt-1 text-[11px] text-gray-400 leading-relaxed">
                        {stage.hint}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                      <Info className="w-4 h-4 text-blue-300" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-[12px] font-black text-gray-200">讲座衔接句（可直接念）</div>
                      <div className="text-[11px] text-gray-400 leading-relaxed">
                        “在候选内容已经打完分之后，还会有一步专门处理‘结果长得像不像’。
                        这一步不会改变推荐系统的主流程目标，但会对结果做约束：既保证相关，也避免过度重复，
                        同时留出少量位置进行兴趣边界探索，靠实时反馈决定下一秒是否继续扩展画像。”
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                        <ArrowRight className="w-4 h-4" />
                        <span>下一页你就可以接：策略干预 / 节假日提权 / 地域分发 / 用户分层</span>
                      </div>
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
