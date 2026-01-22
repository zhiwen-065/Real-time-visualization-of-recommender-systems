import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, Info, ArrowRight } from 'lucide-react';

type VideoType = { name: string; color: string; icon: string };
type Phase = 'before' | 'mixed' | 'after';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const DiversityControl: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('before');
  const [exploreRatio, setExploreRatio] = useState(0.18);
  const [seed, setSeed] = useState(0);

  // 自动演示三阶段（你想手动讲也可以删掉这段）
  useEffect(() => {
    const order: Phase[] = ['before', 'mixed', 'after'];
    const interval = setInterval(() => {
      setPhase((p) => {
        const next = order[(order.indexOf(p) + 1) % order.length];
        return next;
      });
      setSeed((s) => s + 1);
    }, 5200);
    return () => clearInterval(interval);
  }, []);

  const videoTypes: VideoType[] = [
    { name: '登山徒步', color: 'from-emerald-500/35 to-emerald-900/10', icon: '⛰️' },
    { name: '户外装备', color: 'from-teal-500/30 to-teal-900/10', icon: '🎒' },
    { name: '露营生活', color: 'from-lime-500/30 to-lime-900/10', icon: '⛺' },
    { name: '国家地理', color: 'from-indigo-500/25 to-indigo-900/10', icon: '🌍' },
    { name: '路线攻略', color: 'from-cyan-500/25 to-cyan-900/10', icon: '🗺️' },
    { name: '轻户外', color: 'from-green-500/25 to-green-900/10', icon: '🌿' },
  ];

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 4);
  const explorePos = [1, 4, 8, 10].slice(0, exploreSlots); // 固定探索位位置，便于讲解
  const exploreSet = new Set(explorePos);

  // 三种列表：before / mixed / after
  const lists = useMemo(() => {
    // “核心兴趣池”：相关性较高（同主题族群）
    const corePool = [0, 0, 0, 1, 2]; // 以登山徒步为主，少量户外装备/露营（仍偏同质）
    // “边界探索池”：语义邻近但不完全重复
    const explorePool = [3, 4, 5]; // 国家地理 / 路线攻略 / 轻户外

    const build = (mode: Phase) =>
      Array.from({ length: n }).map((_, i) => {
        let typeIndex = 0;
        let tag: 'core' | 'explore' | 'reranked' = 'core';

        if (mode === 'before') {
          // 1) 相关性排序：为了把“同质化”讲清楚，这里做成高度集中
          typeIndex = 0; // 12/12 登山徒步
          tag = 'core';
        }

        if (mode === 'mixed') {
          // 2) 中间态：在相关性排序结果里，插入少量“探索位（边界内容）”
          if (exploreSet.has(i)) {
            typeIndex = explorePool[(i + seed) % explorePool.length];
            tag = 'explore';
          } else {
            typeIndex = corePool[(i + seed) % corePool.length];
            tag = 'core';
          }
        }

        if (mode === 'after') {
          // 3) 重排：保留核心 + 探索，同时做“打散”（MMR思想：相似度惩罚）
          // 这里用一个非常直观的“防连号”打散：避免连续出现同一类
          const base = exploreSet.has(i)
            ? explorePool[(i + seed) % explorePool.length]
            : corePool[(i + seed) % corePool.length];

          // 打散：如果与前一个相同，换成下一个邻近类（演示用）
          if (i > 0) {
            const prev = (i - 1);
            const prevType = (exploreSet.has(prev)
              ? explorePool[(prev + seed) % explorePool.length]
              : corePool[(prev + seed) % corePool.length]);
            typeIndex = base === prevType ? (base + 1) % videoTypes.length : base;
          } else {
            typeIndex = base;
          }

          tag = exploreSet.has(i) ? 'explore' : 'reranked';
        }

        // 分数（演示用）：after 稍微牺牲一点相关性，但提升发现性与生态多样性
        const baseScore = 0.86 + (i % 4) * 0.02;
        const adjust =
          mode === 'before' ? 0.04 :
          mode === 'mixed' ? 0.01 :
          -0.01;
        const finalScore = clamp(baseScore + adjust + Math.sin((i + seed) * 1.7) * 0.008, 0, 1);

        return { id: `${mode}-${i}`, i, typeIndex, finalScore, tag };
      });

    return {
      before: build('before'),
      mixed: build('mixed'),
      after: build('after'),
    };
  }, [seed, exploreRatio, exploreSlots, videoTypes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    // 演示用数值（不是事实值）
    if (phase === 'before') return { accuracy: 98, diversity: 10 };
    if (phase === 'mixed') return { accuracy: 97, diversity: 22 };
    return { accuracy: 95, diversity: 36 };
  }, [phase]);

  const chips = useMemo(() => {
    if (phase === 'before') return ['登山徒步'];
    if (phase === 'mixed') return ['登山徒步', '户外装备', '露营生活']; // 探索位还没“吸收进画像”
    return ['登山徒步', '户外装备', '露营生活', '国家地理', '路线攻略']; // 演示：探索成功后“扩充兴趣资产”
  }, [phase]);

  const PhaseButton = ({ p, label }: { p: Phase; label: string }) => (
    <button
      onClick={() => { setPhase(p); setSeed((s) => s + 1); }}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        phase === p ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const Panel = ({ title, subtitle, mode }: { title: string; subtitle: string; mode: Phase }) => (
    <div className="glass rounded-3xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="text-[12px] font-black text-gray-200">{title}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>
      </div>

      {/* 卡牌区域：固定高度，不会撑满全屏 */}
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {lists[mode].map((item, idx) => {
              const type = videoTypes[item.typeIndex];
              const isExplore = item.tag === 'explore';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.28, delay: idx * 0.01 }}
                  className="relative h-[118px] rounded-2xl overflow-hidden border border-white/10 shadow-lg"
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${type.color}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* 标签：只用“探索位/核心/重排后”，不出现“不喜欢” */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                        isExplore
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                          : item.tag === 'reranked'
                            ? 'bg-white/5 text-gray-200 border-white/10'
                            : 'bg-white/5 text-gray-200 border-white/10'
                      }`}
                    >
                      {isExplore ? '探索位' : mode === 'after' ? '重排后' : '核心位'}
                    </div>
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl drop-shadow-lg">{type.icon}</div>
                    <div className="mt-1 text-[11px] font-black text-white/90">{type.name}</div>
                  </div>

                  <div className="absolute left-3 right-3 bottom-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                      <span>score</span>
                      <span>{item.finalScore.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        animate={{ width: `${Math.min(100, item.finalScore * 100)}%` }}
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
  );

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      <div className="w-full max-w-[1520px] mx-auto">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-7 md:px-10 py-6 border-b border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                  DIVERSITY · EXPLORATION · RE-RANKING
                </div>
                <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  过程演示：插入探索位 → 重排打散 → 扩充兴趣资产
                </div>
                <div className="text-xs text-gray-400">
                  说明：中间态会把少量“边界内容”插入结果中；若出现正反馈，系统会更新画像并持续探索。
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10">
                <PhaseButton p="before" label="① 相关性排序" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton p="mixed" label="② 插入探索位" />
                <div className="w-px h-6 bg-white/10" />
                <PhaseButton p="after" label="③ 重排打散" />
              </div>
            </div>

            {/* Explore Ratio */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
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
                  onChange={(e) => { setExploreRatio(parseFloat(e.target.value)); setSeed((s) => s + 1); }}
                  className="w-full accent-emerald-400"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  探索位选择“语义邻近但不完全重复”的内容，用于兴趣边界探索（不等价于低质量或负面内容）。
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 md:p-10 space-y-8">
            {/* 三面板：展示过程 */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
              <Panel
                title="① 相关性排序结果"
                subtitle="候选按相关性/预测收益排序，结果可能高度集中在同一主题"
                mode="before"
              />

              <div className="hidden xl:flex items-center justify-center">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <Panel
                title="② 中间态：插入探索位"
                subtitle="在结果中预留少量位置，插入边界内容（探索位）以观察反馈"
                mode="mixed"
              />

              <div className="hidden xl:flex items-center justify-center">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <Panel
                title="③ 重排：相似度惩罚 + 打散（MMR 思想）"
                subtitle="对与已选内容高度相似的项施加惩罚，使结果更丰富；探索成功会扩充画像"
                mode="after"
              />
            </div>

            {/* 画像变化 */}
            <div className="glass rounded-2xl border border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-black text-gray-300">兴趣资产（示意）</div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">phase: {phase}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-gray-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                讲解建议：②阶段“先插入探索位观察反馈”，③阶段“探索有效则纳入画像并持续探索”。
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
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">相关性指标（示意）</span>
                    <span className="text-2xl font-black text-white">{metrics.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${metrics.accuracy}%` }} className="h-full bg-blue-400/80" />
                  </div>
                  <div className="text-[10px] text-gray-500">多样性重排通常会对相关性产生轻微影响（多目标权衡）</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">多样性指标（示意）</span>
                    <span className="text-2xl font-black text-white">{metrics.diversity}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${metrics.diversity}%` }}
                      className={`h-full ${phase === 'before' ? 'bg-red-400/70' : 'bg-emerald-400/80'}`}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500">探索位 + 打散有助于内容发现性与长期体验</div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-400/20">
                  <Info className="text-blue-300 w-4 h-4" />
                </div>
                <div className="text-xs text-gray-400 leading-relaxed space-y-1">
                  <div>
                    <span className="text-white font-bold">中间态（②）</span>的核心是：保留大部分相关内容，同时插入少量探索位来做兴趣边界探索。
                  </div>
                  <div>
                    <span className="text-white font-bold">重排（③）</span>常使用 MMR 思想：在“仍然相关”的前提下，对与已选内容过于相似的项施加惩罚，从而实现打散。
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
