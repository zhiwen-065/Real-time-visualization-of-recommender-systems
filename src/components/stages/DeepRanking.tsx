import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Boxes,
  GitBranch,
  Radar,
  Timer,
  ShieldAlert,
  BadgeCheck,
  ArrowRight,
  Info,
  Activity,
} from "lucide-react";

type Candidate = {
  id: number;
  title: string;
  recallConfidence: number; // 0..1
  freshness: number; // 0..1
  creatorQuality: number; // 0..1
  risk: "low" | "mid" | "high";
};

type Pred = {
  sCTR: number; // 0..100
  sWatch: number;
  sEng: number;
  sSatisfy: number;
  finalScore: number; // 0..100（融合分，用于截断）
  gate: "pass" | "downrank" | "filtered";
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

// ✅ 稳定伪随机：避免 Math.random() 带来的不确定
function prng01(seed: number) {
  // mulberry32
  let t = seed >>> 0;
  t += 0x6d2b79f5;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

const DeepRanking: React.FC = () => {
  // 只为“在线推理有轻微波动”的观感，不展示可调权重
  const [tick, setTick] = useState(0);
  const [seed, setSeed] = useState(13);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 260);
    return () => clearInterval(t);
  }, []);

  const N_IN = 2000; // 精排输入规模（示意）
  const TOPK = 50; // 精排输出短名单（示意）

  const candidates: Candidate[] = useMemo(() => {
    return Array.from({ length: N_IN }).map((_, i) => {
      const base = (seed * 100_000 + i * 17) % 999_999;

      const r1 = prng01(base + 11);
      const r2 = prng01(base + 23);
      const r3 = prng01(base + 37);
      const r4 = prng01(base + 97);

      // 让分布更像：多数一般，少数很强
      const recallConfidence = clamp(0.25 + Math.pow(r1, 0.55) * 0.72, 0.02, 0.99);
      const freshness = clamp(0.18 + Math.pow(r2, 0.65) * 0.78, 0.02, 0.99);
      const creatorQuality = clamp(0.22 + Math.pow(r3, 0.60) * 0.75, 0.02, 0.99);

      // 风险：少量 mid，极少 high
      const risk: Candidate["risk"] = r4 > 0.988 ? "high" : r4 > 0.86 ? "mid" : "low";

      return {
        id: base,
        title: `候选 ${i + 1}`,
        recallConfidence,
        freshness,
        creatorQuality,
        risk,
      };
    });
  }, [seed]);

  const preds: Pred[] = useMemo(() => {
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    return candidates.map((c, idx) => {
      const phase = idx * 0.004 + c.id * 0.0009;

      // 表示强度（示意）：把多个输入信号融合成一个“可供 head 使用”的中间量
      const rep =
        0.60 * c.recallConfidence +
        0.28 * c.creatorQuality +
        0.12 * c.freshness +
        0.04 * Math.sin(tick / 5 + phase) +
        0.03 * Math.cos(tick / 7 + phase);

      // 多任务 head（示意）：关注点不同，但共享 rep 的一部分
      const pCTR = clamp(sigmoid(2.6 * (rep - 0.62)), 0, 1);
      const pWatch = clamp(sigmoid(2.1 * (0.60 * rep + 0.40 * c.freshness - 0.58)), 0, 1);
      const pEng = clamp(sigmoid(2.2 * (0.65 * c.creatorQuality + 0.35 * rep - 0.60)), 0, 1);
      const pSatisfy = clamp(sigmoid(2.4 * (0.50 * pWatch + 0.35 * pEng + 0.15 * pCTR - 0.52)), 0, 1);

      const sCTR = Math.round(pCTR * 100);
      const sWatch = Math.round(pWatch * 100);
      const sEng = Math.round(pEng * 100);
      const sSatisfy = Math.round(pSatisfy * 100);

      // 融合分：只用于“可比/可截断”
      const fused = 0.34 * sCTR + 0.33 * sWatch + 0.18 * sEng + 0.15 * sSatisfy;

      // 门控：高风险过滤；中风险降权（示意）
      const filtered = c.risk === "high";
      const downrank = c.risk === "mid";
      const penalty = downrank ? 8 : 0;

      const finalScore = filtered ? 0 : clamp(Math.round(fused - penalty), 0, 100);
      const gate: Pred["gate"] = filtered ? "filtered" : downrank ? "downrank" : "pass";

      return { sCTR, sWatch, sEng, sSatisfy, finalScore, gate };
    });
  }, [candidates, tick]);

  const shortlist = useMemo(() => {
    return preds
      .map((p, i) => ({ i, ...p }))
      .filter((x) => x.gate !== "filtered")
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, TOPK);
  }, [preds]);

  const metrics = useMemo(() => {
    const filteredN = preds.filter((x) => x.gate === "filtered").length;
    const downrankN = preds.filter((x) => x.gate === "downrank").length;
    const passN = N_IN - filteredN;

    const arr = shortlist.map((x) => x.finalScore);
    const avg = arr.reduce((s, x) => s + x, 0) / Math.max(1, arr.length);

    const pct = (p: number) => {
      if (arr.length === 0) return 0;
      const a = [...arr].sort((x, y) => x - y);
      return a[Math.floor(a.length * p)];
    };

    const latencyMs = clamp(
      Math.round(8 + Math.log10(N_IN) * 3 + (Math.sin(tick / 9) + 1) * 2),
      7,
      18
    );

    return {
      filteredN,
      downrankN,
      passN,
      latencyMs,
      avgShort: Math.round(avg),
      p50Short: pct(0.5),
      p90Short: pct(0.9),
    };
  }, [preds, shortlist, tick]);

  const focusIdx = useMemo(() => (tick * 7) % candidates.length, [tick, candidates.length]);
  const focus = candidates[focusIdx];
  const focusPred = preds[focusIdx];

  const dist = useMemo(() => {
    const buckets = Array.from({ length: 10 }).map(() => 0);
    preds.forEach((p) => {
      if (p.gate === "filtered") return;
      const b = clamp(Math.floor(p.finalScore / 10), 0, 9);
      buckets[b] += 1;
    });
    const maxV = Math.max(...buckets, 1);
    return { buckets, maxV };
  }, [preds]);

  return (
    <div className="w-full h-[100dvh] bg-transparent flex items-start justify-center px-6 md:px-10 py-6 overflow-hidden">
      <div className="w-full max-w-[1500px] h-full">
        <div className="glass rounded-[2rem] border border-white/10 shadow-[0_0_70px_rgba(59,130,246,0.10)] bg-transparent h-full flex flex-col">
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/10 bg-black/60 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white">
                  精排打分：特征建模 → 多任务预测 → 门控截断
                </div>
                <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase">
                  representation → multi-head → gating → shortlist
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                <Timer className="w-4 h-4" />
                {metrics.latencyMs}ms
              </div>
              <button
                onClick={() => setSeed((s) => s + 1)}
                className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition text-[12px] font-black"
                title="刷新候选输入分布（用于演示）"
              >
                refresh
              </button>
            </div>
          </div>

          {/* Body */}
          {/* ✅ 关键：中间这层必须是 min-h-0，才能让子列 overflow-y-auto 生效 */}
          <div className="flex-1 grid grid-cols-12 bg-[#030712] rounded-b-[2rem] overflow-hidden min-h-0">
            {/* Left: ✅ 加滚轮 */}
            <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 min-h-0">
              <div className="h-full overflow-y-auto p-7">
                <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-black text-gray-200">计算路径（示意）</div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                      input {N_IN.toLocaleString()} → shortlist {TOPK}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <FlowStep
                      icon={<Boxes className="w-4 h-4 text-blue-300" />}
                      title="输入特征"
                      desc="用户/上下文 + 内容特征 + 召回粗信号（置信度、新鲜度等）"
                    />
                    <FlowArrow />
                    <FlowStep
                      icon={<GitBranch className="w-4 h-4 text-purple-300" />}
                      title="表示学习 / 交叉建模"
                      desc="将稀疏与连续特征映射到统一表示，并建模交互关系"
                      accent="purple"
                    />
                    <FlowArrow />
                    <FlowStep
                      icon={<Radar className="w-4 h-4 text-cyan-300" />}
                      title="多任务预测（多 Head）"
                      desc="输出点击、观看、互动、满意度等多维分值"
                      accent="cyan"
                    />
                    <FlowArrow />
                    <FlowStep
                      icon={<ShieldAlert className="w-4 h-4 text-yellow-300" />}
                      title="门控与截断"
                      desc="风险过滤/降权后，按融合分截断形成短名单"
                      accent="yellow"
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                        <Info className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="text-[11px] text-gray-400 leading-relaxed">
                        本阶段产物是<strong className="text-gray-200">可用短名单</strong>，用于下游编排；
                        不直接定义最终展示顺序，从而避免与后续策略层重复。
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <MiniStat label="过滤（high）" value={`${metrics.filteredN}`} tone="bad" />
                  <MiniStat label="降权（mid）" value={`${metrics.downrankN}`} tone="mid" />
                  <MiniStat label="通过（pass）" value={`${metrics.passN}`} tone="good" />
                  <MiniStat label="短名单占比" value={`${Math.round((TOPK / N_IN) * 1000) / 10}%`} tone="good" />
                </div>

                <div className="h-4" />
              </div>
            </div>

            {/* Middle: 已经有滚轮，但也补上 min-h-0 结构更稳 */}
            <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 min-h-0 overflow-y-auto">
              <div className="p-7 space-y-6">
                <SectionCard
                  title="焦点候选：输入 → 多任务输出 → 融合/门控"
                  subtitle="用于解释精排在单条候选上的处理过程"
                  right={
                    <span className="inline-flex items-center gap-2 text-[10px] font-mono text-green-300/90 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> live
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">candidate</div>
                        <div className="mt-1 text-xl font-black text-white">{focus.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill>{`recall ${round1(focus.recallConfidence)}`}</Pill>
                          <Pill>{`fresh ${round1(focus.freshness)}`}</Pill>
                          <Pill>{`creator ${round1(focus.creatorQuality)}`}</Pill>
                          <Pill
                            tone={
                              focus.risk === "low"
                                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                                : focus.risk === "mid"
                                ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-200"
                                : "border-red-400/25 bg-red-500/10 text-red-200"
                            }
                          >
                            {focus.risk}
                          </Pill>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">fused score</div>
                        <div className="mt-1 text-3xl font-black text-white">{focusPred.finalScore}</div>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border border-white/10 bg-black/30 text-gray-200">
                          <BadgeCheck className="w-4 h-4 text-blue-300" />
                          {focusPred.gate}
                        </div>
                      </div>
                    </div>

                    <DividerLabel text="multi-head outputs" />
                    <ScoreRow label="点击倾向 (pCTR)" value={focusPred.sCTR} tone="blue" />
                    <ScoreRow label="观看深度 (pWatch)" value={focusPred.sWatch} tone="purple" />
                    <ScoreRow label="正向互动 (pEng)" value={focusPred.sEng} tone="cyan" />
                    <ScoreRow label="满意度 (pSatisfy)" value={focusPred.sSatisfy} tone="emerald" />
                  </div>
                </SectionCard>

                <SectionCard title="分数分布：为“截断”服务" subtitle="融合分用于统一比较，形成短名单">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-black text-gray-200">融合分桶分布（示意）</div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        avg {metrics.avgShort} / p50 {Math.round(metrics.p50Short)} / p90 {Math.round(metrics.p90Short)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-10 gap-1.5 items-end h-28">
                      {dist.buckets.map((v, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0, opacity: 0.6 }}
                          animate={{ height: `${(v / dist.maxV) * 100}%`, opacity: 1 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="rounded-md bg-gradient-to-t from-blue-500/25 to-cyan-400/35 border border-white/10"
                          title={`${i * 10}~${i * 10 + 9}: ${v}`}
                        />
                      ))}
                    </div>

                    <div className="mt-3 flex justify-between text-[10px] font-mono text-gray-500">
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-[11px] text-gray-400 leading-relaxed">
                    精排阶段更关心：<strong className="text-gray-200">哪些候选值得留下</strong>。
                    最终呈现仍需要后续编排阶段处理多样性、策略约束与体验细节。
                  </div>
                </SectionCard>

                <div className="h-3" />
              </div>
            </div>

            {/* Right: 不变 */}
            <div className="col-span-12 lg:col-span-4 p-7 min-h-0 overflow-y-auto">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">本阶段输出</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">shortlist</div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-blue-500/15 to-transparent p-5">
                    <div className="text-[10px] font-mono text-blue-300/80 uppercase tracking-widest">output</div>
                    <div className="mt-1 text-2xl font-black text-white">
                      {N_IN.toLocaleString()} → {TOPK}
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                      形成短名单，交给后续阶段做编排（多样性/策略/体验等）。
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-300" />
                      <div className="text-[11px] text-gray-300 leading-relaxed">
                        短名单大小为TOPK。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <MiniStat label="推理时延" value={`${metrics.latencyMs}ms`} />
                <MiniStat label="短名单均分" value={`${metrics.avgShort}`} tone="good" />
              </div>
              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== UI pieces ===================== */

const FlowStep: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: "purple" | "cyan" | "yellow";
}> = ({ icon, title, desc, accent }) => {
  const tone =
    accent === "purple"
      ? "border-purple-400/20 bg-purple-500/10"
      : accent === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/10"
      : accent === "yellow"
      ? "border-yellow-400/20 bg-yellow-500/10"
      : "border-blue-400/20 bg-blue-500/10";

  return (
    <div className={`rounded-2xl border ${tone} p-4`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-black text-gray-200">{title}</div>
          <div className="mt-1 text-[11px] text-gray-400 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
};

const FlowArrow: React.FC = () => (
  <div className="flex items-center justify-center">
    <motion.div
      animate={{ y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="text-gray-500"
    >
      <ArrowRight className="w-4 h-4 rotate-90" />
    </motion.div>
  </div>
);

const SectionCard: React.FC<{
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, right, children }) => (
  <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[13px] font-black text-gray-200">{title}</div>
        <div className="mt-1 text-[11px] text-gray-500">{subtitle}</div>
      </div>
      {right}
    </div>
    <div className="mt-5">{children}</div>
  </div>
);

const DividerLabel: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{text}</div>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span
    className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
      tone ?? "border-white/10 bg-white/5 text-gray-200"
    }`}
  >
    {children}
  </span>
);

const ScoreRow: React.FC<{
  label: string;
  value: number;
  tone: "blue" | "purple" | "cyan" | "emerald";
}> = ({ label, value, tone }) => {
  const bar =
    tone === "blue"
      ? "bg-blue-500/70"
      : tone === "purple"
      ? "bg-purple-500/70"
      : tone === "cyan"
      ? "bg-cyan-500/70"
      : "bg-emerald-500/70";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-black text-gray-200">{label}</div>
        <div className="text-[12px] font-mono text-gray-200">{clamp(value, 0, 100)}%</div>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamp(value, 0, 100)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`h-full ${bar}`}
        />
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; tone?: "good" | "mid" | "bad" }> = ({
  label,
  value,
  tone,
}) => {
  const color =
    tone === "good"
      ? "text-emerald-200"
      : tone === "mid"
      ? "text-yellow-200"
      : tone === "bad"
      ? "text-red-200"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
      <div className={`mt-1 text-[16px] font-black ${color}`}>{value}</div>
    </div>
  );
};

export default DeepRanking;
