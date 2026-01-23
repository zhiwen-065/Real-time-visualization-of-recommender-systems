import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Sparkles, TrendingUp, Filter, ShieldCheck, Layers, Info, ArrowRight, RefreshCcw } from 'lucide-react';

type ChannelKey = 'cf' | 'ann' | 'hot' | 'follow';

type RawItem = {
  id: number;
  title: string;
  channel: ChannelKey;
  score: number; // 0~1（召回置信度/相似度示意）
  freshness: number; // 0~1（新鲜度示意）
  risk: 'low' | 'mid' | 'high'; // 安全风险示意
  dup: number; // 近重复簇 id（示意）
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

const CHANNELS: { key: ChannelKey; name: string; icon: React.ReactNode; tone: string; desc: string }[] = [
  {
    key: 'cf',
    name: '协同过滤 (CF)',
    icon: <Users className="w-5 h-5 text-blue-300" />,
    tone: 'border-blue-500/25 bg-blue-500/10',
    desc: '基于群体共现关系，从“看过此内容的人也看了”中快速捞取相似候选。',
  },
  {
    key: 'ann',
    name: '向量召回 (ANN)',
    icon: <Sparkles className="w-5 h-5 text-purple-300" />,
    tone: 'border-purple-500/25 bg-purple-500/10',
    desc: '将用户与内容映射到同一向量空间，通过近邻检索得到语义相似候选。',
  },
  {
    key: 'hot',
    name: '热点保底 (Hot)',
    icon: <TrendingUp className="w-5 h-5 text-cyan-300" />,
    tone: 'border-cyan-500/25 bg-cyan-500/10',
    desc: '对实时爆发内容做保底召回，用于提升时效性与覆盖外部趋势。',
  },
  {
    key: 'follow',
    name: '关系链召回 (Follow)',
    icon: <Layers className="w-5 h-5 text-emerald-300" />,
    tone: 'border-emerald-500/25 bg-emerald-500/10',
    desc: '从关注/互动关系中召回内容，强化“确定性兴趣”与信任链路。',
  },
];

const StageBadge: React.FC<{ text: string; sub: string }> = ({ text, sub }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10 bg-white/5 text-gray-200">
    <Search className="w-3.5 h-3.5 text-blue-300" />
    <span>{text}</span>
    <span className="opacity-50">·</span>
    <span className="text-gray-400">{sub}</span>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${tone ?? 'border-white/10 bg-white/5 text-gray-200'}`}>
    {children}
  </span>
);

const Bar: React.FC<{ label: string; value: number; tone: 'blue' | 'purple' | 'cyan' }> = ({ label, value, tone }) => (
  <div className="space-y-2">
    <div className="flex items-end justify-between">
      <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</span>
      <span className="text-[12px] font-mono text-gray-200">{Math.round(value * 100)}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamp(value, 0, 1) * 100}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`h-full ${
          tone === 'blue' ? 'bg-blue-400/70' : tone === 'purple' ? 'bg-purple-400/70' : 'bg-cyan-400/70'
        }`}
      />
    </div>
  </div>
);

const CandidateRetrieval: React.FC = () => {
  const [seed, setSeed] = useState(1);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  // 固定的“目标规模”：最终进入后续阶段的候选数（示意）
  const FINAL_N = 80;

  // ========== 生成一个“超大库”的视觉数字（不做真实计算，只做展示） ==========
  const library = useMemo(() => {
    // 做一点 seed 抖动，让“总库规模”看起来更像实时系统里波动的统计
    const base = 100_000_000;
    const jitter = Math.round(Math.sin(seed * 1.7) * 3_200_000 + Math.cos(seed * 0.9) * 1_400_000);
    return base + jitter;
  }, [seed]);

  // ========== 生成各通道 raw 召回（示意数据，重点是“过程”与“可解释”） ==========
  const rawByChannel: Record<ChannelKey, RawItem[]> = useMemo(() => {
    const mk = (channel: ChannelKey, count: number, biasScore: number, biasFresh: number, dupBase: number) => {
      const items: RawItem[] = [];
      for (let i = 0; i < count; i++) {
        const id = (seed * 10_000 + i + channel.charCodeAt(0) * 10) % 999_999;
        const score = clamp(biasScore + Math.sin((i + seed) * 0.37) * 0.12 + Math.random() * 0.06, 0.25, 0.99);
        const freshness = clamp(biasFresh + Math.cos((i + seed) * 0.22) * 0.18 + Math.random() * 0.06, 0.05, 0.99);

        // 风险示意：热点通道更“波动”；关系链更稳
        const rGate = ((i * 19 + seed * 31) % 100) / 100;
        const risk: RawItem['risk'] =
          channel === 'hot'
            ? rGate > 0.86
              ? 'high'
              : rGate > 0.65
              ? 'mid'
              : 'low'
            : channel === 'ann'
            ? rGate > 0.92
              ? 'high'
              : rGate > 0.72
              ? 'mid'
              : 'low'
            : channel === 'cf'
            ? rGate > 0.95
              ? 'high'
              : rGate > 0.78
              ? 'mid'
              : 'low'
            : rGate > 0.97
            ? 'high'
            : rGate > 0.82
            ? 'mid'
            : 'low';

        // 近重复簇（示意）：ANN/CF 更容易命中相似内容
        const dup =
          channel === 'ann' || channel === 'cf'
            ? (dupBase + ((i + seed) % 10)) // 聚得更紧
            : (dupBase + ((i + seed) % 18)); // 更分散

        items.push({
          id,
          title: `内容 ${channel.toUpperCase()} · ${i + 1}`,
          channel,
          score,
          freshness,
          risk,
          dup,
        });
      }
      return items;
    };

    return {
      cf: mk('cf', 120, 0.76, 0.38, 100),
      ann: mk('ann', 140, 0.80, 0.42, 200),
      hot: mk('hot', 80, 0.70, 0.82, 300),
      follow: mk('follow', 60, 0.74, 0.55, 400),
    };
  }, [seed]);

  // ========== Stage 0: 展示“通道召回”的 raw 合并 ==========
  const rawMerged = useMemo(() => {
    const all = [...rawByChannel.cf, ...rawByChannel.ann, ...rawByChannel.hot, ...rawByChannel.follow];
    // 打散一下顺序（示意并行完成后汇聚）
    return all.sort((a, b) => (b.score + b.freshness * 0.25) - (a.score + a.freshness * 0.25));
  }, [rawByChannel]);

  // ========== Stage 1: 风险过滤（只保留 low/mid） ==========
  const filtered = useMemo(() => {
    return rawMerged.filter((x) => x.risk !== 'high');
  }, [rawMerged]);

  // ========== Stage 2: 近重复去重（每个 dup 簇保留 topK） ==========
  const deduped = useMemo(() => {
    const topK = 2; // 每簇最多保留 2 条（示意）
    const buckets = new Map<number, RawItem[]>();
    for (const it of filtered) {
      const arr = buckets.get(it.dup) ?? [];
      arr.push(it);
      buckets.set(it.dup, arr);
    }
    const kept: RawItem[] = [];
    for (const [, arr] of buckets) {
      arr.sort((a, b) => (b.score + b.freshness * 0.15) - (a.score + a.freshness * 0.15));
      kept.push(...arr.slice(0, topK));
    }
    // 去重后再整体排一下
    return kept.sort((a, b) => (b.score + b.freshness * 0.25) - (a.score + a.freshness * 0.25));
  }, [filtered]);

  // ========== Stage 3: 截断（进入后续排序的“可控规模”） ==========
  const finalCandidates = useMemo(() => {
    return deduped.slice(0, FINAL_N);
  }, [deduped]);

  // 当前“展示集合”：随 stage 变化，让观众清晰看到收敛过程
  const currentList = useMemo(() => {
    if (stage === 0) return rawMerged;
    if (stage === 1) return filtered;
    if (stage === 2) return deduped;
    return finalCandidates;
  }, [stage, rawMerged, filtered, deduped, finalCandidates]);

  // 指标：用于解释“每一步做了什么”
  const stats = useMemo(() => {
    const rawN = rawMerged.length;
    const filN = filtered.length;
    const dedN = deduped.length;
    const finN = finalCandidates.length;

    const riskHigh = rawMerged.filter((x) => x.risk === 'high').length;

    const dupSetRaw = new Set(rawMerged.map((x) => x.dup)).size;
    const dupSetDed = new Set(deduped.map((x) => x.dup)).size;

    const avgScore = (arr: RawItem[]) => arr.reduce((s, x) => s + x.score, 0) / Math.max(1, arr.length);
    const avgFresh = (arr: RawItem[]) => arr.reduce((s, x) => s + x.freshness, 0) / Math.max(1, arr.length);

    return {
      rawN,
      filN,
      dedN,
      finN,
      riskHigh,
      dupSetRaw,
      dupSetDed,
      score: round2(avgScore(finalCandidates)),
      fresh: round2(avgFresh(finalCandidates)),
    };
  }, [rawMerged, filtered, deduped, finalCandidates]);

  const stageMeta = useMemo(() => {
    if (stage === 0)
      return {
        badge: 'A',
        title: '多路召回并集（Raw Merge）',
        subtitle: '并行通道各自捞取候选，汇聚成一个更大覆盖的候选池。',
        note: '此时重复与噪声是正常现象，后续会逐步收敛。',
      };
    if (stage === 1)
      return {
        badge: 'B',
        title: '风险过滤（Safety Filter）',
        subtitle: '先挡掉明显高风险内容，避免后续算力浪费与策略风险外溢。',
        note: '过滤越早越省资源，也更稳定。',
      };
    if (stage === 2)
      return {
        badge: 'C',
        title: '近重复去重（Dedup）',
        subtitle: '同一相似簇仅保留少量代表内容，降低相似堆叠与素材轰炸。',
        note: '去重不等于降相关，而是减少“重复曝光”。',
      };
    return {
      badge: 'D',
      title: '候选截断（Truncation）',
      subtitle: '把规模收敛到后续排序层可承载的候选集合，进入精排/策略链路。',
      note: '规模可控，才有稳定时延与可复现的优化闭环。',
    };
  }, [stage]);

  const StepDot: React.FC<{ active: boolean }> = ({ active }) => (
    <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-400' : 'bg-white/15'}`} />
  );

  const channelCountIn = (arr: RawItem[], key: ChannelKey) => arr.filter((x) => x.channel === key).length;

  const ChannelMini: React.FC<{ k: ChannelKey; label: string; tone: string }> = ({ k, label, tone }) => (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {CHANNELS.find((x) => x.key === k)?.icon}
          <div className="text-[12px] font-black text-white">{label}</div>
        </div>
        <div className="text-[12px] font-mono text-gray-200">{channelCountIn(currentList, k)}</div>
      </div>
      <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
        {CHANNELS.find((x) => x.key === k)?.desc}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-6 py-8">
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-7 md:px-10 py-6 border-b border-white/10 bg-white/[0.02] space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="space-y-2">
                <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                  Stage 02 · Candidate Retrieval
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <StageBadge text="Multi-Channel Recall" sub="process demo" />
                  <Pill>总库规模：{library.toLocaleString()}</Pill>
                  <Pill tone="border-blue-400/20 bg-blue-500/10 text-blue-200">进入后续：Top {FINAL_N}</Pill>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={stage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border border-blue-400/20 bg-blue-500/10 text-blue-200">
                        {stageMeta.badge}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{stageMeta.title}</h2>
                    </div>
                    <div className="text-xs text-gray-400">{stageMeta.subtitle}</div>
                    <div className="text-[11px] text-gray-500">{stageMeta.note}</div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSeed((s) => s + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition text-[12px] font-black"
                  title="重新生成一轮示意数据（用于演示“每次请求都有波动”）"
                >
                  <RefreshCcw className="w-4 h-4" />
                  refresh
                </button>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-black/40">
                  <StepDot active={stage === 0} />
                  <StepDot active={stage === 1} />
                  <StepDot active={stage === 2} />
                  <StepDot active={stage === 3} />
                  <span className="ml-2 text-[11px] font-mono text-gray-400">step {stage + 1}/4</span>
                </div>

                <div className="inline-flex rounded-2xl border border-white/10 overflow-hidden">
                  {(['召回并集', '风险过滤', '近重复去重', '候选截断'] as const).map((t, i) => (
                    <button
                      key={t}
                      onClick={() => setStage(i as 0 | 1 | 2 | 3)}
                      className={`px-4 py-2 text-[12px] font-black transition ${
                        stage === i ? 'bg-blue-500/20 text-blue-200' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Process strip */}
            <div className="glass rounded-2xl border border-white/10 px-5 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <Info className="w-4 h-4 text-blue-300" />
                  <span>
                    展示“候选从大到小的收敛过程”：通道召回 → 过滤 → 去重 → 截断（进入后续排序）
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
                  <span className="opacity-70">raw</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="opacity-70">filtered</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="opacity-70">deduped</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="text-gray-200">final</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] font-black tracking-widest uppercase text-gray-500">raw merged</div>
                  <div className="mt-1 text-2xl font-black text-white">{stats.rawN}</div>
                  <div className="mt-1 text-[11px] text-gray-500">多路并集后的候选量</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] font-black tracking-widest uppercase text-gray-500">filtered</div>
                  <div className="mt-1 text-2xl font-black text-white">{stats.filN}</div>
                  <div className="mt-1 text-[11px] text-gray-500">剔除 high risk（{stats.riskHigh}）</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] font-black tracking-widest uppercase text-gray-500">deduped</div>
                  <div className="mt-1 text-2xl font-black text-white">{stats.dedN}</div>
                  <div className="mt-1 text-[11px] text-gray-500">dup 簇：{stats.dupSetRaw} → {stats.dupSetDed}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] font-black tracking-widest uppercase text-gray-500">final</div>
                  <div className="mt-1 text-2xl font-black text-white">{stats.finN}</div>
                  <div className="mt-1 text-[11px] text-gray-500">截断进入后续排序</div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 md:p-10 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
              {/* Left: Channel explain */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChannelMini k="cf" label="协同过滤 (CF)" tone="border-blue-500/20 bg-blue-500/10" />
                  <ChannelMini k="ann" label="向量召回 (ANN)" tone="border-purple-500/20 bg-purple-500/10" />
                  <ChannelMini k="hot" label="热点保底 (Hot)" tone="border-cyan-500/20 bg-cyan-500/10" />
                  <ChannelMini k="follow" label="关系链召回 (Follow)" tone="border-emerald-500/20 bg-emerald-500/10" />
                </div>

                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                      <Filter className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-black text-gray-200">候选收敛为什么必要</div>
                      <div className="text-[11px] text-gray-500">召回阶段允许“更广覆盖”，但后续阶段需要“更可控规模”。</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500">quality snapshot</div>
                        <Pill>Top {FINAL_N}</Pill>
                      </div>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Bar label="平均召回置信度（示意）" value={stats.score} tone="blue" />
                        <Bar label="平均新鲜度（示意）" value={stats.fresh} tone="cyan" />
                      </div>
                      <div className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                        • 这一步不追求“最终排序”，只保证候选池足够大、足够解释、足够可控。<br />
                        • 去重与过滤让候选池更稳定，减少重复与明显风险内容对后续阶段的扰动。
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <div className="text-[12px] font-black text-gray-200">解释视角</div>
                      </div>
                      <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                        每条候选都带着“来源通道 + 召回置信度 + 新鲜度 + 风险等级 + 近重复簇”的标签。<br />
                        这样后续做排序、做策略、做分析时，能够定位问题来自哪个环节。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Candidate list */}
              <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">候选池（随步骤变化）</div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                    <span>items:</span>
                    <span className="text-gray-200">{currentList.length}</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                      {currentList.slice(0, 24).map((it, idx) => {
                        const tone =
                          it.channel === 'cf'
                            ? 'border-blue-500/20 bg-blue-500/10'
                            : it.channel === 'ann'
                            ? 'border-purple-500/20 bg-purple-500/10'
                            : it.channel === 'hot'
                            ? 'border-cyan-500/20 bg-cyan-500/10'
                            : 'border-emerald-500/20 bg-emerald-500/10';

                        const riskTone =
                          it.risk === 'low'
                            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                            : it.risk === 'mid'
                            ? 'border-yellow-400/25 bg-yellow-500/10 text-yellow-200'
                            : 'border-red-400/25 bg-red-500/10 text-red-200';

                        return (
                          <motion.div
                            key={`${stage}-${seed}-${it.channel}-${it.id}`}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.26, delay: idx * 0.01 }}
                            className={`rounded-2xl border p-4 ${tone}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-[12px] font-black text-white">{it.title}</div>
                              <Pill tone={riskTone}>{it.risk}</Pill>
                            </div>

                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <Pill>{it.channel.toUpperCase()}</Pill>
                              <Pill>dup #{it.dup}</Pill>
                              <Pill tone="border-white/10 bg-white/5 text-gray-200">score {it.score.toFixed(2)}</Pill>
                              <Pill tone="border-white/10 bg-white/5 text-gray-200">fresh {it.freshness.toFixed(2)}</Pill>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  animate={{ width: `${it.score * 100}%` }}
                                  className="h-full bg-blue-400/70"
                                />
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  animate={{ width: `${it.freshness * 100}%` }}
                                  className="h-full bg-cyan-400/70"
                                />
                              </div>
                            </div>

                            <div className="mt-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                              source → merge → filter → dedup → truncate
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  <div className="mt-4 text-[11px] text-gray-500">
                    仅展示前 24 条用于视觉说明；真实系统中候选规模更大，后续进入排序链路处理。
                  </div>
                </div>
              </div>
            </div>

            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateRetrieval;
