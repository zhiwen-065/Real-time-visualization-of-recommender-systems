import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Boxes,
  Route,
  Radar,
  Timer,
  ShieldAlert,
  BadgeCheck,
  ArrowRight,
  Info,
} from "lucide-react";

type Candidate = {
  id: number;
  title: string;

  // 召回侧“带过来”的粗信号（示意）：精排会把它们当作输入之一
  recallConfidence: number; // 0..1
  freshness: number; // 0..1
  creatorQuality: number; // 0..1
  risk: "low" | "mid" | "high";
};

type Pred = {
  pCTR: number; // 0..1
  pWatch: number; // 0..1
  pEng: number; // 0..1
  pSatisfy: number; // 0..1

  sCTR: number; // 0..100
  sWatch: number;
  sEng: number;
  sSatisfy: number;

  finalScore: number; // 0..100（融合分，供“截断/入围”）
  gate: "pass" | "downrank" | "filtered";
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

const DeepRanking: React.FC = () => {
  // ✅ 演示用：让“在线预测”有轻微变化，不让观众误解为在调参
  const [tick, setTick] = useState(0);
  const [seed, setSeed] = useState(13);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 260);
    return () => clearInterval(t);
  }, []);

  const N_IN = 2000; // 精排输入规模（示意）
  const TOPK = 50; // 精排输出：入围短名单（示意）

  const candidates: Candidate[] = useMemo(() => {
    const mk = (i: number): Candidate => {
      const id = (seed * 100_000 + i * 17) % 999_999;

      // 粗信号：让分布更像“多数一般、少数很强”
      const recallConfidence = clamp(
        0.35 + Math.pow(Math.abs(Math.sin((i + seed) * 0.11)), 0.7) * 0.6 + Math.random() * 0.05,
        0.02,
        0.99
      );
      const freshness = clamp(
        0.25 + Math.pow(Math.abs(Math.cos((i + seed) * 0.07)), 0.85) * 0.7 + Math.random() * 0.05,
        0.02,
        0.99
      );
      const creatorQuality = clamp(
        0.30 + Math.pow(Math.abs(Math.sin((i + seed) * 0.05)), 0.9) * 0.65 + Math.random() * 0.05,
        0.02,
        0.99
      );

      // 风险：少量 mid / 极少 high
      const g = ((i * 29 + seed * 41) % 1000) / 1000;
      const risk: Candidate["risk"] = g > 0.988 ? "high" : g > 0.86 ? "mid" : "low";

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

  // ====== 精排：特征 → 多任务预测 → 融合分 → 门控（过滤/降权） ======
  const preds: Pred[] = useMemo(() => {
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const sin = (x: number) => Math.sin(x);
    const cos = (x: number) => Math.cos(x);

    return candidates.map((c, idx) => {
      const phase = idx * 0.004 + c.id * 0.0009;

      // “表示学习后的综合强度”（示意）
      const rep =
        0.60 * c.recallConfidence +
        0.30 * c.creatorQuality +
        0.10 * c.freshness +
        0.04 * sin(tick / 5 + phase) +
        0.03 * cos(tick / 7 + phase);

      // 多任务 head：关注点略不同（示意）
      const pCTR = clamp(sigmoid(2.6 * (rep - 0.62)), 0, 1);
      const pWatch = clamp(sigmoid(2.1 * (0.60 * rep + 0.40 * c.freshness - 0.58) + 0.2 * cos(tick / 6 + phase)), 0, 1);
      const pEng = clamp(sigmoid(2.2 * (0.65 * c.creatorQuality + 0.35 * rep - 0.60) + 0.2 * sin(tick / 6 + phase)), 0, 1);
      const pSatisfy = clamp(sigmoid(2.4 * (0.50 * pWatch + 0.35 * pEng + 0.15 * pCTR - 0.52)), 0, 1);

      const sCTR = Math.round(pCTR * 100);
      const sWatch = Math.round(pWatch * 100);
      const sEng = Math.round(pEng * 100);
      const sSatisfy = Math.round(pSatisfy * 100);

      // ✅ 融合分：强调“多目标融合 → 一个可截断的分数”
      // 不对外暴露可调权重（避免把重点带偏）
      const fused = 0.34 * sCTR + 0.33 * sWatch + 0.18 * sEng + 0.15 * sSatisfy;

      // ✅ 门控：高风险过滤；中风险降权（示意）
      const filtered = c.risk === "high";
      const downrank = c.risk === "mid";
      const penalty = downrank ? 8 : 0;

      const finalScore = filtered ? 0 : clamp(Math.round(fused - penalty), 0, 100);
      const gate: Pred["gate"] = filtered ? "filtered" : downrank ? "downrank" : "pass";

      return { pCTR, pWatch, pEng, pSatisfy, sCTR, sWatch, sEng, sSatisfy, finalScore, gate };
    });
  }, [candidates, tick]);

  // 入围短名单：只做“截断”展示，不做“最终排序列表”（避免和策略干预阶段重合）
  const shortlist = useMemo(() => {
    const keep = preds
      .map((p, i) => ({ i, ...p }))
      .filter((x) => x.gate !== "filtered")
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, TOPK);
    return keep;
  }, [preds]);

  const metrics = useMemo(() => {
    const filteredN = preds.filter((x) => x.gate === "filtered").length;
    const downrankN = preds.filter((x) => x.gate === "downrank").length;
    const passN = N_IN - filteredN;

    const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / Math.max(1, arr.length);
    const shortFinal = shortlist.map((x) => x.finalScore);

    const p50 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const a = [...arr].sort((x, y) => x - y);
      return a[Math.floor(a.length * 0.5)];
    };
    const p90 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const a = [...arr].sort((x, y) => x - y);
      return a[Math.floor(a.length * 0.9)];
    };

    // “推理时延”（示意）
    const latencyMs = clamp(Math.round(8 + Math.log10(N_IN) * 3 + (Math.sin(tick / 9) + 1) * 2), 7, 18);

    return {
      filteredN,
      downrankN,
      passN,
      latencyMs,
      avgShort: Math.round(avg(shortFinal)),
      p50Short: p50(shortFinal),
      p90Short: p90(shortFinal),
    };
  }, [preds, shortlist, tick]);

  // 选择一个“焦点候选”用于讲解：展示它从输入信号到多任务分数再到融合分/门控的路径。
  const focusIdx = useMemo(() => (tick * 4) % candidates.length, [tick, candidates.length]);
  const focus = candidates[focusIdx];
  const focusPred = preds[focusIdx];

  // 分布条（示意）：把融合分按桶统计，直观表达“截断入围”
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
                <div className="text-xl font-black tracking-tight text-white">精排打分：特征建模 → 多任务预测 → 截断入围</div>
                <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase">
                  feature representation → multi-head prediction → gating → shortlist
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSeed((s) => s + 1)}
                className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition text-[12px] font-black"
                title="刷新候选输入分布（用于演示）"
              >
                refresh
              </button>
            </div>
          </div>

          {/* Body: 三列，但中间是滚动“流程讲解卡”，整体风格与 stage05/04 不同 */}
          <div className="flex-1 grid grid-cols-12 bg-[#030712] rounded-b-[2rem] overflow-hidden">
            {/* Left: 流程图（不再是“看不懂的点阵”） */}
            <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 p-7">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">计算路径（示意）</div>
                  <div className="inline-flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <Timer className="w-4 h-4" />
                    {metrics.latencyMs}ms
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <FlowStep
                    icon={<Boxes className="w-4 h-4 text-blue-300" />}
                    title="输入特征"
                    desc="用户/上下文 + 候选内容特征 + 召回侧粗信号（置信度、新鲜度等）"
                  />
                  <FlowArrow />
                  <FlowStep
                    icon={<Route className="w-4 h-4 text-purple-300" />}
                    title="表示学习 / 交叉建模"
                    desc="将稀疏特征与连续特征映射到统一表示，并建模交互关系"
                    accent="purple"
                  />
                  <FlowArrow />
                  <FlowStep
                    icon={<Radar className="w-4 h-4 text-cyan-300" />}
                    title="多任务预测（多 Head）"
                    desc="同时输出点击、观看、互动、满意度等多维概率/分值"
                    accent="cyan"
                  />
                  <FlowArrow />
                  <FlowStep
                    icon={<ShieldAlert className="w-4 h-4 text-yellow-300" />}
                    title="门控与截断"
                    desc="风险过滤/降权后，按融合分做截断，形成短名单进入下一阶段"
                    accent="yellow"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                      <Info className="w-4 h-4 text-blue-300" />
                    </div>
                    <div className="text-[11px] text-gray-400 leading-relaxed">
                      这里的输出是<strong className="text-gray-200">“短名单”</strong>，不是最终展示顺序。
                      后续仍会进入多样性重排、策略约束等环节做最终编排。
                    </div>
                  </div>
                </div>
              </div>

              {/* 摘要指标 */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <MiniStat label="输入规模" value={`${N_IN.toLocaleString()}`} />
                <MiniStat label="入围短名单" value={`${TOPK}`} tone="good" />
                <MiniStat label="过滤（high）" value={`${metrics.filteredN}`} tone="bad" />
                <MiniStat label="降权（mid）" value={`${metrics.downrankN}`} tone="mid" />
              </div>
            </div>

            {/* Middle: 可滚动讲解卡（你说可以加滚轮） */}
            <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto">
              <div className="p-7 space-y-6">
                <SectionCard
                  title="焦点候选：从输入信号到模型输出"
                  subtitle="用于解释一条候选在精排阶段经历了什么"
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
                    <ScoreRow label="点击概率 (pCTR)" value={focusPred.sCTR} tone="blue" />
                    <ScoreRow label="观看深度 (pWatch)" value={focusPred.sWatch} tone="purple" />
                    <ScoreRow label="正向互动 (pEng)" value={focusPred.sEng} tone="cyan" />
                    <ScoreRow label="满意度/抑制负反馈 (pSatisfy)" value={focusPred.sSatisfy} tone="emerald" />

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-[11px] text-gray-400 leading-relaxed">
                      <span className="text-gray-200 font-black">融合分</span>用于统一比较与截断；
                      <span className="text-gray-200 font-black">门控</span>用于处理风险、质量等“硬约束/软约束”，避免仅靠预测分数做决策。
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="截断入围：为什么需要短名单" subtitle="精排的任务是把“可用集合”压到可控规模">
                  <div className="space-y-4 text-[11px] text-gray-400 leading-relaxed">
                    <div>• 精排会对每个候选做较重的特征计算与模型推理，必须控制下游成本。</div>
                    <div>• 输出短名单后，后续阶段可以专注于编排：多样性、策略约束、用户体验细节等。</div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-black text-gray-200">短名单分数分布（示意）</div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                          avg {metrics.avgShort} / p50 {Math.round(metrics.p50Short)} / p90 {Math.round(metrics.p90Short)}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-10 gap-1.5 items-end">
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

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-black text-gray-200">输出到下一阶段</div>
                        <div className="text-[11px] font-mono text-gray-200">
                          {TOPK} / {N_IN.toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          animate={{ width: `${(TOPK / N_IN) * 100}%` }}
                          className="h-full bg-blue-400/70"
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-gray-500">
                        这一步只保证“更可能有效的候选被保留”，不负责最终呈现顺序。
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="风险门控：过滤与降权" subtitle="把“预测优化”与“规则/安全”分层处理">
                  <div className="space-y-4 text-[11px] text-gray-400 leading-relaxed">
                    <div>• 过滤：不可接受的候选直接剔除，不参与后续排序。</div>
                    <div>• 降权：存在不确定性或弱风险的候选保留，但降低其入围概率。</div>

                    <div className="grid grid-cols-3 gap-3">
                      <GateChip label="pass" value={`${metrics.passN}`} tone="good" />
                      <GateChip label="downrank" value={`${metrics.downrankN}`} tone="mid" />
                      <GateChip label="filtered" value={`${metrics.filteredN}`} tone="bad" />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <ArrowRight className="w-4 h-4 text-blue-300" />
                        <span>
                          门控让系统能够在不改变模型结构的情况下，持续适配风险、合规、生态等外部约束。
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <div className="h-3" />
              </div>
            </div>

            {/* Right: 结果摘要（不做“最终排序列表”） */}
            <div className="col-span-12 lg:col-span-4 p-7">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-gray-200">本阶段输出（示意）</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">shortlist only</div>
                </div>

                <div className="mt-5 space-y-4">
                  <BigCallout
                    title={`从 ${N_IN.toLocaleString()} 缩到 ${TOPK}`}
                    subtitle="形成短名单，交给下一阶段进行编排（多样性/策略/体验等）"
                  />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">what this stage guarantees</div>
                    <div className="mt-2 text-[12px] text-gray-300 leading-relaxed">
                      更高质量、更可能有效的候选被保留下来，并且通过门控处理风险/规则。它不负责最终展示顺序。
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-black text-gray-200">短名单分值范围（示意）</div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">fused score</div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <KeyValue label="平均" value={`${metrics.avgShort}`} />
                      <KeyValue label="中位数 (p50)" value={`${Math.round(metrics.p50Short)}`} />
                      <KeyValue label="高分段 (p90)" value={`${Math.round(metrics.p90Short)}`} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-300" />
                      <div className="text-[11px] text-gray-300 leading-relaxed">
                        页面中间区域支持滚动：用于分段解释精排的工作内容与输出边界。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <MiniStat label="推理时延" value={`${metrics.latencyMs}ms`} />
                <MiniStat label="短名单占比" value={`${Math.round((TOPK / N_IN) * 1000) / 10}%`} tone="good" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== small UI pieces ===================== */

const FlowStep: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: "purple" | "cyan" | "yellow";
}> = ({ icon, title, desc, accent }) => {
  const tone =
    accent === "purple"
      ? "border-purple-400/20 bg-purple-500/8"
      : accent === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/8"
      : accent === "yellow"
      ? "border-yellow-400/20 bg-yellow-500/8"
      : "border-blue-400/20 bg-blue-500/8";

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
  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${tone ?? "border-white/10 bg-white/5 text-gray-200"}`}>
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
        <div className="text-[12px] font-mono text-gray-200">{value}%</div>
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

const BigCallout: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-blue-500/12 to-transparent p-5">
    <div className="text-[10px] font-mono text-blue-300/80 uppercase tracking-widest">output</div>
    <div className="mt-1 text-2xl font-black text-white">{title}</div>
    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">{subtitle}</div>
  </div>
);

const KeyValue: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
    <div className="text-[12px] font-mono text-gray-200">{value}</div>
  </div>
);

const GateChip: React.FC<{ label: string; value: string; tone: "good" | "mid" | "bad" }> = ({ label, value, tone }) => {
  const cls =
    tone === "good"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
      : tone === "mid"
      ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-200"
      : "border-red-400/25 bg-red-500/10 text-red-200";

  return (
    <div className={`rounded-2xl border ${cls} p-4`}>
      <div className="text-[10px] font-mono uppercase tracking-widest opacity-90">{label}</div>
      <div className="mt-1 text-[16px] font-black">{value}</div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; tone?: "good" | "mid" | "bad" }> = ({ label, value, tone }) => {
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
