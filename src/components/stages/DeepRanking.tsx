import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Activity,
  Target,
  Cpu,
  Sparkles,
  Info,
  ArrowDownUp,
  Gauge,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type ObjectiveKey = 'ctr' | 'watch' | 'eng' | 'satisfy';

type Candidate = {
  id: number;
  title: string;
  // 召回侧带来的“粗信号”（示意），排序侧会把它当作输入之一
  recallConfidence: number; // 0..1
  freshness: number; // 0..1
  creatorQuality: number; // 0..1
  risk: 'low' | 'mid' | 'high';
};

type Scored = Candidate & {
  // 多任务 head 预测（0..1）
  pCTR: number;
  pWatch: number;
  pEng: number;
  pSatisfy: number;

  // 解释用：每个目标的分值（0..100）
  sCTR: number;
  sWatch: number;
  sEng: number;
  sSatisfy: number;

  // 总分（0..100）
  final: number;

  // 阶段标签（示意）
  gate: 'pass' | 'downrank' | 'filtered';
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

const HEADER_H = 92;

const DeepRanking: React.FC = () => {
  // ✅ 只用于演示：让“在线预测”看起来在变化（无需用户调参）
  const [t, setT] = useState(0);
  const [seed, setSeed] = useState(7);

  useEffect(() => {
    const timer = setInterval(() => setT((x) => x + 1), 260);
    return () => clearInterval(timer);
  }, []);

  // ✅ 演示规模：从候选池进入精排，再取 TopK
  const N_IN = 2000;
  const TOPK = 50;

  // ✅ 生成候选（示意）：不暴露参数，不给观众“调权重”的心智负担
  const candidates: Candidate[] = useMemo(() => {
    const mk = (i: number): Candidate => {
      const id = (seed * 10_000 + i) % 999_999;
      const recallConfidence = clamp(0.55 + Math.sin((i + seed) * 0.37) * 0.18 + Math.random() * 0.08, 0.05, 0.99);
      const freshness = clamp(0.45 + Math.cos((i + seed) * 0.21) * 0.28 + Math.random() * 0.08, 0.02, 0.99);
      const creatorQuality = clamp(0.50 + Math.sin((i + seed) * 0.13) * 0.22 + Math.random() * 0.08, 0.05, 0.99);

      const rGate = ((i * 19 + seed * 31) % 100) / 100;
      const risk: Candidate['risk'] =
        rGate > 0.965 ? 'high' : rGate > 0.82 ? 'mid' : 'low';

      return {
        id,
        title: `候选 ${i + 1}`,
        recallConfidence,
        freshness,
        creatorQuality,
        risk,
      };
    };

    return Array.from({ length: N_IN }).map((_, i) => mk(i));
  }, [seed]);

  // ========== 模型侧：多任务预测（示意） ==========
  // 注：这里的“预测”不依赖用户调参；只是把过程“可视化”
  const scoredAll: Scored[] = useMemo(() => {
    const sin = (x: number) => Math.sin(x);
    const cos = (x: number) => Math.cos(x);

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    return candidates.map((c, idx) => {
      const phase = idx * 0.004 + c.id * 0.0007;

      // 将“输入特征”组合成 logit（示意）：召回置信度/新鲜度/创作者质量 + 少量波动
      const base = 0.9 * c.recallConfidence + 0.55 * c.creatorQuality + 0.25 * c.freshness;
      const wobble = 0.08 * sin(t / 4 + phase) + 0.06 * cos(t / 6 + phase);

      // 多任务 head：不同目标关注点不同（示意）
      const pCTR = clamp(sigmoid(2.2 * (base - 0.65) + 0.8 * wobble), 0, 1);
      const pWatch = clamp(sigmoid(1.9 * (0.55 * base + 0.45 * c.freshness - 0.55) + 0.7 * cos(t / 5 + phase)), 0, 1);
      const pEng = clamp(sigmoid(2.0 * (0.60 * c.creatorQuality + 0.40 * base - 0.62) + 0.6 * sin(t / 6 + phase)), 0, 1);
      const pSatisfy = clamp(sigmoid(2.1 * (0.50 * pWatch + 0.35 * pEng + 0.15 * pCTR - 0.52)), 0, 1);

      // 风险：高风险直接过滤；中风险做下调（示意）
      const hardFiltered = c.risk === 'high';
      const downrank = c.risk === 'mid';

      // 分数映射到 0..100（解释更直观）
      const sCTR = clamp(Math.round(pCTR * 100), 0, 100);
      const sWatch = clamp(Math.round(pWatch * 100), 0, 100);
      const sEng = clamp(Math.round(pEng * 100), 0, 100);
      const sSatisfy = clamp(Math.round(pSatisfy * 100), 0, 100);

      // ✅ “综合排序分”：这里不暴露可调权重，强调“多目标融合 + 风险门控”
      // 观众理解重点：不是“加权怎么调”，而是“多目标 + 约束 → 一个可排序的标量”
      const fused =
        0.32 * sCTR +
        0.33 * sWatch +
        0.20 * sEng +
        0.15 * sSatisfy;

      const penalty = downrank ? 8 : 0;
      const final = hardFiltered ? 0 : clamp(Math.round(fused - penalty), 0, 100);

      const gate: Scored['gate'] = hardFiltered ? 'filtered' : downrank ? 'downrank' : 'pass';

      return {
        ...c,
        pCTR,
        pWatch,
        pEng,
        pSatisfy,
        sCTR,
        sWatch,
        sEng,
        sSatisfy,
        final,
        gate,
      };
    });
  }, [candidates, t]);

  // 排序：先过滤 high risk，再按 final 排
  const ranking = useMemo(() => {
    return scoredAll
      .filter((x) => x.gate !== 'filtered')
      .sort((a, b) => b.final - a.final);
  }, [scoredAll]);

  const topK = useMemo(() => ranking.slice(0, TOPK), [ranking]);

  // 选一个“当前焦点候选”用于展示多任务分数变化
  const focus = useMemo(() => {
    const idx = (t * 3) % Math.min(120, ranking.length);
    return ranking[idx];
  }, [ranking, t]);

  // 指标：用于“严谨解释”（不让观众只看炫酷动画）
  const metrics = useMemo(() => {
    const filteredN = scoredAll.filter((x) => x.gate === 'filtered').length;
    const downrankN = scoredAll.filter((x) => x.gate === 'downrank').length;

    const avg = (arr: Scored[], key: keyof Scored) =>
      arr.reduce((s, x) => s + (x[key] as number), 0) / Math.max(1, arr.length);

    const avgTop = {
      ctr: avg(topK, 'sCTR'),
      watch: avg(topK, 'sWatch'),
      eng: avg(topK, 'sEng'),
      sat: avg(topK, 'sSatisfy'),
      final: avg(topK, 'final'),
    };

    // 估计时延（示意）：把“规模 + 特征 + 模型”抽象成毫秒级延迟
    const latencyMs = clamp(Math.round(7 + Math.log10(N_IN) * 3 + (Math.sin(t / 7) + 1) * 2), 6, 18);

    return {
      filteredN,
      downrankN,
      passN: N_IN - filteredN,
      latencyMs,
      avgTop,
    };
  }, [scoredAll, topK, t]);

  const stickyTop = `${HEADER_H}px`;
  const stickyH = `calc(100dvh - ${HEADER_H}px - 24px)`;

  return (
    <div className="w-full h-[100dvh] overflow-y-auto bg-transparent flex items-start justify-center px-6 md:px-10 py-6">
      <div className="w-full max-w-[1500px]">
        <div className="glass rounded-[2rem] border border-white/10 shadow-[0_0_70px_rgba(59,130,246,0.10)] bg-transparent">
          {/* Header */}
          <div className="sticky top-0 z-20 px-8 py-5 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white">深度排序：多目标预测与在线门控</div>
                <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase">
                  candidates → multi-task model → gating → final ranking
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSeed((s) => s + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition text-[12px] font-black"
                title="刷新一轮候选分布（用于演示输入变化）"
              >
                <Sparkles className="w-4 h-4" />
                refresh
              </button>

              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-mono text-green-400 tracking-widest uppercase">Live</span>
            </div>
          </div>

          {/* Main grid */}
          <div className="relative grid grid-cols-12 bg-[#030712] rounded-b-[2rem]">
            {/* Left: Model architecture (sticky) */}
            <div className="col-span-12 lg:col-span-4 lg:border-r border-white/10">
              <div className="lg:sticky z-10" style={{ top: stickyTop, height: stickyH }}>
                <div className="h-full bg-[#030712] border-b lg:border-b-0 border-white/10">
                  <div className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-gray-200">模型结构（示意）</div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">inference</div>
                    </div>
                  </div>

                  <div className="px-8 pb-8 overflow-y-auto h-[calc(100%-88px)] pr-6 space-y-6">
                    <div className="relative aspect-[16/10] rounded-3xl border border-white/10 bg-white/5 overflow-hidden p-6">
                      <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10 bg-black/30 text-gray-200">
                        <Cpu className="w-3.5 h-3.5 text-blue-300" />
                        multi-task ranking model
                      </div>

                      <div className="absolute right-4 top-4 text-[10px] font-mono text-blue-300/60">
                        INFERENCE_LATENCY: {metrics.latencyMs}ms
                      </div>

                      <div className="h-full flex items-center justify-between px-3">
                        <NeuralColumn count={5} label="用户 / 上下文" />
                        <FlowLine dir="lr" />
                        <NeuralColumn count={8} label="交叉特征 / 表示学习" />
                        <FlowLine dir="rl" />
                        <NeuralColumn count={4} label="多任务 Head" />
                      </div>

                      {/* 漂浮节点 */}
                      <motion.div
                        animate={{ opacity: [0.0, 1.0, 0.0], y: [10, -6, 10], x: [0, 8, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-4 left-5 text-[10px] font-mono text-gray-500"
                      >
                        features: user × item × context
                      </motion.div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                          <Info className="w-4 h-4 text-blue-300" />
                        </div>
                        <div className="text-[11px] text-gray-400 leading-relaxed">
                          输出不是单一指标：同一候选会同时得到多维预测分数。随后通过门控（风险/质量约束）与融合得到可排序的最终分值。
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <MiniStat label="输入规模" value={`${N_IN.toLocaleString()} candidates`} />
                        <MiniStat label="输出规模" value={`Top ${TOPK}`} />
                        <MiniStat label="过滤（high risk）" value={`${metrics.filteredN}`} tone="red" />
                        <MiniStat label="下调（mid risk）" value={`${metrics.downrankN}`} tone="yellow" />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-black text-gray-200">Top {TOPK} 平均分（示意）</div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">multi-objective</div>
                      </div>

                      <div className="mt-4 space-y-4">
                        <MetricBar label="点击概率 (pCTR)" val={metrics.avgTop.ctr} tone="blue" />
                        <MetricBar label="观看深度 (pWatch)" val={metrics.avgTop.watch} tone="purple" />
                        <MetricBar label="正向互动 (pEng)" val={metrics.avgTop.eng} tone="cyan" />
                        <MetricBar label="满意度/负反馈抑制 (pSatisfy)" val={metrics.avgTop.sat} tone="emerald" />
                      </div>

                      <div className="mt-4 text-[10px] text-gray-500 leading-relaxed">
                        注：这里的数值仅用于演示“多维预测 → 门控 → 融合排序”的结构，不等同于线上真实口径。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle: Focus candidate (scroll with page) */}
            <div className="col-span-12 lg:col-span-4 lg:border-r border-white/10 relative">
              <div className="relative z-10 p-8">
                <div className="text-center mb-7">
                  <div className="text-[10px] font-mono text-blue-300/80 tracking-widest uppercase">live inference</div>
                  <div className="text-3xl font-black text-white mt-2">单条候选的多维预测</div>
                  <div className="text-sm text-gray-500 mt-2">
                    同一条内容在不同目标上得分不同，门控会影响它进入排序的方式。
                  </div>
                </div>

                {focus && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">focused candidate</div>
                        <div className="mt-1 text-xl font-black text-white">{focus.title}</div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Pill>{`recall ${focus.recallConfidence.toFixed(2)}`}</Pill>
                          <Pill>{`fresh ${focus.freshness.toFixed(2)}`}</Pill>
                          <Pill>{`creator ${focus.creatorQuality.toFixed(2)}`}</Pill>
                          <Pill tone={focus.risk === 'low'
                            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                            : focus.risk === 'mid'
                            ? 'border-yellow-400/25 bg-yellow-500/10 text-yellow-200'
                            : 'border-red-400/25 bg-red-500/10 text-red-200'
                          }>
                            {focus.risk}
                          </Pill>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">final</div>
                        <div className="mt-1 text-3xl font-black text-white">{focus.final}</div>

                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border border-white/10 bg-black/30 text-gray-200">
                          {focus.gate === 'pass' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              pass
                            </>
                          ) : focus.gate === 'downrank' ? (
                            <>
                              <ArrowDownUp className="w-4 h-4 text-yellow-300" />
                              downrank
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-300" />
                              filtered
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-5">
                      <ObjectiveRow name="点击概率 (pCTR)" value={focus.sCTR} tone="blue" />
                      <ObjectiveRow name="观看深度 (pWatch)" value={focus.sWatch} tone="purple" />
                      <ObjectiveRow name="正向互动 (pEng)" value={focus.sEng} tone="cyan" />
                      <ObjectiveRow name="满意度/抑制负反馈 (pSatisfy)" value={focus.sSatisfy} tone="emerald" />
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Gauge className="w-4 h-4 text-blue-300" />
                        <span>
                          终分是“多维预测 + 约束门控”的结果：同分数下，风险更高的内容会被下调或直接过滤。
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-10" />
              </div>
            </div>

            {/* Right: Final ranking (sticky) */}
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky z-10" style={{ top: stickyTop, height: stickyH }}>
                <div className="h-full bg-[#030712]">
                  <div className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-gray-200">最终排序（Top {TOPK}）</div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">final score</div>
                    </div>
                  </div>

                  <div className="px-8 pb-8 overflow-y-auto h-[calc(100%-88px)] pr-6">
                    <div className="space-y-3">
                      {topK.map((c, rank) => {
                        const isTop1 = rank === 0;
                        const isMidRisk = c.risk === 'mid';

                        return (
                          <motion.div
                            key={c.id}
                            layout
                            className={`rounded-2xl border p-4 transition-all ${
                              isTop1
                                ? 'border-blue-500/45 bg-blue-500/12 shadow-[0_0_25px_rgba(59,130,246,0.16)]'
                                : 'border-white/10 bg-white/5 hover:bg-white/7'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-200 font-black">
                                  #{rank + 1}
                                </div>
                                <div className="font-bold text-white">{c.title}</div>
                                {isTop1 && (
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200/90 flex items-center gap-1">
                                    <Target className="w-3 h-3" /> top
                                  </span>
                                )}
                                {isMidRisk && (
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-200/90 flex items-center gap-1">
                                    <ArrowDownUp className="w-3 h-3" /> mid risk
                                  </span>
                                )}
                              </div>

                              <div className="text-[12px] font-mono text-gray-200">{c.final}</div>
                            </div>

                            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400/75 to-cyan-400/70"
                                style={{ width: `${clamp(c.final, 0, 100)}%` }}
                              />
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase">
                              <span>pCTR {round1(c.pCTR)}</span>
                              <span>pWatch {round1(c.pWatch)} / pEng {round1(c.pEng)}</span>
                            </div>

                            <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase">
                              <span>fresh {round1(c.freshness)}</span>
                              <span>recall {round1(c.recallConfidence)}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 h-10" />
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
};

const Pill: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${tone ?? 'border-white/10 bg-white/5 text-gray-200'}`}>
    {children}
  </span>
);

const NeuralColumn: React.FC<{ count: number; label: string }> = ({ count, label }) => (
  <div className="flex flex-col items-center gap-5">
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.55, 1, 0.55],
          }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.14 }}
          className="w-3.5 h-3.5 rounded-full bg-gray-800 border border-blue-500/20"
        />
      ))}
    </div>
    <span className="text-[10px] text-gray-500 font-bold uppercase rotate-90 whitespace-nowrap tracking-tighter origin-center mt-1">
      {label}
    </span>
  </div>
);

const FlowLine: React.FC<{ dir: 'lr' | 'rl' }> = ({ dir }) => (
  <div className="flex-1 flex items-center justify-center px-3">
    <div className="w-full h-px bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-20 relative">
      <motion.div
        animate={{ left: dir === 'lr' ? ['0%', '100%'] : ['100%', '0%'] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'linear' }}
        className="absolute w-12 h-0.5 bg-white/80 blur-sm shadow-[0_0_10px_rgba(255,255,255,0.45)]"
      />
    </div>
  </div>
);

const MetricBar: React.FC<{ label: string; val: number; tone: 'blue' | 'purple' | 'cyan' | 'emerald' }> = ({
  label,
  val,
  tone,
}) => (
  <div className="space-y-2">
    <div className="flex items-end justify-between">
      <span className="text-gray-400 text-xs font-black uppercase tracking-widest">{label}</span>
      <span className="text-[13px] font-mono text-gray-200">{Math.round(val)}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        animate={{ width: `${clamp(val, 0, 100)}%` }}
        className={`h-full ${
          tone === 'blue'
            ? 'bg-blue-400/70'
            : tone === 'purple'
            ? 'bg-purple-400/70'
            : tone === 'cyan'
            ? 'bg-cyan-400/70'
            : 'bg-emerald-400/70'
        }`}
      />
    </div>
  </div>
);

const ObjectiveRow: React.FC<{ name: string; value: number; tone: 'blue' | 'purple' | 'cyan' | 'emerald' }> = ({
  name,
  value,
  tone,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="text-[12px] font-black text-gray-200">{name}</div>
      <div className="text-[12px] font-mono text-gray-200">{value}%</div>
    </div>
    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamp(value, 0, 100)}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className={`h-full ${
          tone === 'blue'
            ? 'bg-blue-500/70'
            : tone === 'purple'
            ? 'bg-purple-500/70'
            : tone === 'cyan'
            ? 'bg-cyan-500/70'
            : 'bg-emerald-500/70'
        }`}
      />
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; tone?: 'red' | 'yellow' }> = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
    <div className={`mt-1 text-[14px] font-black ${tone === 'red' ? 'text-red-200' : tone === 'yellow' ? 'text-yellow-200' : 'text-white'}`}>
      {value}
    </div>
  </div>
);

export default DeepRanking;
