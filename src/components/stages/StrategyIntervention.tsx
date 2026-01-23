import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, TrendingUp } from 'lucide-react';

type Candidate = {
  id: number;
  title: string;
  base: number; // 0~100
};

type ScoredCandidate = Candidate & {
  biz: number; // -1~1
  eco: number; // -1~1
  final: number; // 0~100
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

const StrategyIntervention: React.FC = () => {
  // 1) 左侧候选（你可替换 title / base 为你想要的）
  const candidates: Candidate[] = useMemo(
    () => [
      { id: 1, title: '候选 1', base: 62.4 },
      { id: 2, title: '候选 2', base: 71.8 },
      { id: 3, title: '候选 3', base: 55.2 },
      { id: 4, title: '候选 4', base: 66.7 },
      { id: 5, title: '候选 5', base: 49.9 },
      { id: 6, title: '候选 6', base: 60.3 },
    ],
    []
  );

  // 2) 当前“正在过策略层”的候选
  const [activeIdx, setActiveIdx] = useState(0);

  // ✅ 3) 自动演示节拍：从 2.2s 改为更容易看清的 4.2s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((i) => (i + 1) % candidates.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [candidates.length]);

  // 4) 一个时间变量，让商业/生态打分看起来在“动态计算”
  const [t, setT] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setT((x) => x + 1), 250);
    return () => clearInterval(tick);
  }, []);

  const weights = { biz: 10, eco: 8 }; // 商业、生态影响权重（你可调）

  // 5) 生成每个候选的商业/生态分（-1~1），并得到最终分
  const scored: ScoredCandidate[] = useMemo(() => {
    return candidates.map((c) => {
      const phase = c.id * 0.9;
      const biz = Math.sin(t / 4 + phase) * 0.8; // [-0.8, 0.8]
      const eco = Math.cos(t / 5 + phase) * 0.8; // [-0.8, 0.8]
      const final = clamp(c.base + weights.biz * biz + weights.eco * eco, 0, 100);
      return { ...c, biz, eco, final };
    });
  }, [candidates, t, weights.biz, weights.eco]);

  const active = candidates[activeIdx];
  const activeScore = scored.find((x) => x.id === active.id)!;

  // 6) 最终排序（右侧）
  const sorted = useMemo(() => {
    return [...scored].sort((a, b) => b.final - a.final);
  }, [scored]);

  // 7) 指针角度：把 [-1..1] 映射到 [-60..60] 度
  const bizAngle = activeScore.biz * 60;
  const ecoAngle = activeScore.eco * 60;

  return (
    // ✅ 页面整体只做“容器”滚动（保险），但主要滚动发生在左右列
    <div className="w-full h-[100dvh] overflow-hidden flex items-start justify-center px-6 md:px-10 py-6">
      <div className="w-full max-w-[1500px]">
        <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_70px_rgba(236,72,153,0.12)]">
          {/* Header */}
          <div className="px-8 py-5 flex items-center justify-between border-b border-white/10 bg-black/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white">策略干预：商业与生态的博弈</div>
                <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase">
                  candidates → strategy layer → final ranking
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-mono text-green-400 tracking-widest uppercase">Live</span>
            </div>
          </div>

          {/* Main */}
          {/* ✅ 关键：给主区域一个固定高度，让左右列能“内部滚动” */}
          <div className="relative grid grid-cols-12 bg-[#030712] h-[calc(100dvh-140px)] min-h-[520px]">
            {/* Left: Candidates (可滚动) */}
            <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-h-0">
              {/* 左列头部固定 */}
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-gray-200">候选内容</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">base score</div>
                </div>
              </div>

              {/* ✅ 左列内容滚动区域 */}
              <div className="px-8 pb-8 overflow-y-auto min-h-0 pr-6">
                <div className="space-y-3">
                  {candidates.map((c, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isActive
                            ? 'border-pink-500/50 bg-pink-500/10 shadow-[0_0_25px_rgba(236,72,153,0.18)]'
                            : 'border-white/10 bg-white/5 hover:bg-white/7'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-white">{c.title}</div>
                          <div className="text-[12px] font-mono text-gray-200">{round1(c.base)}</div>
                        </div>

                        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-blue-500/80"
                            style={{ width: `${clamp(c.base, 0, 100)}%` }}
                          />
                        </div>

                        <div className="mt-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                          input to strategy layer
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Middle: Strategy Layer (不滚动) */}
            <div className="col-span-12 lg:col-span-4 p-8 border-b lg:border-b-0 lg:border-r border-white/10 relative flex items-center justify-center min-h-0">
              {/* Flow Lines + Particles */}
              <svg viewBox="0 0 900 520" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <filter id="glowPink">
                    <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <path d="M 70 260 C 200 260, 250 260, 320 260" fill="none" stroke="rgba(236,72,153,0.18)" strokeWidth="3" />
                <path d="M 580 260 C 650 260, 700 260, 830 260" fill="none" stroke="rgba(236,72,153,0.18)" strokeWidth="3" />

                <AnimatePresence mode="wait">
                  <motion.circle
                    key={`dotL-${active.id}`}
                    r="6"
                    fill="#f472b6"
                    filter="url(#glowPink)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, offsetDistance: ['0%', '100%'] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: 'easeInOut' }}
                    style={{ offsetPath: "path('M 70 260 C 200 260, 250 260, 320 260')" }}
                  />
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.circle
                    key={`dotR-${active.id}`}
                    r="6"
                    fill="#f472b6"
                    filter="url(#glowPink)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, offsetDistance: ['0%', '100%'] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: 'easeInOut', delay: 1.05 }}
                    style={{ offsetPath: "path('M 580 260 C 650 260, 700 260, 830 260')" }}
                  />
                </AnimatePresence>
              </svg>

              <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                  <div className="text-[10px] font-mono text-pink-300/80 tracking-widest uppercase">strategy layer</div>
                  <div className="text-3xl font-black text-white mt-2">策略层</div>
                  <div className="text-sm text-gray-500 mt-2">
                    对模型输出做<strong className="text-gray-300">约束 / 博弈 / 再排序</strong>
                  </div>
                </div>

                <div className="space-y-6">
                  <Dial title="商业" color="pink" value={activeScore.biz} angle={bizAngle} hint={`Δ = ${round1(weights.biz * activeScore.biz)}`} />
                  <Dial title="生态" color="emerald" value={activeScore.eco} angle={ecoAngle} hint={`Δ = ${round1(weights.eco * activeScore.eco)}`} />
                </div>

                {/* Current candidate result */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">current candidate</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-bold text-white">{active.title}</div>
                    <div className="text-[12px] font-mono text-gray-200">
                      {round1(active.base)} → {round1(activeScore.final)}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-400/80 to-purple-500/80"
                      style={{ width: `${clamp(activeScore.final, 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Final ranking (可滚动) */}
            <div className="col-span-12 lg:col-span-4 border-white/10 flex flex-col min-h-0">
              {/* 右列头部固定 */}
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-gray-200">最终排序</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">final score</div>
                </div>
              </div>

              {/* ✅ 右列内容滚动区域 */}
              <div className="px-8 pb-8 overflow-y-auto min-h-0 pr-6">
                <div className="space-y-3">
                  {sorted.map((c, rank) => {
                    const isActive = c.id === active.id;
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        className={`rounded-2xl border p-4 transition-all ${
                          isActive ? 'border-pink-500/50 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/7'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 font-black">
                              #{rank + 1}
                            </div>
                            <div className="font-bold text-white">{c.title}</div>
                            {rank === 0 && (
                              <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-300/90 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> top
                              </span>
                            )}
                          </div>

                          <div className="text-[12px] font-mono text-gray-200">{round1(c.final)}</div>
                        </div>

                        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400/70 to-cyan-400/70"
                            style={{ width: `${clamp(c.final, 0, 100)}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase">
                          <span>base {round1(c.base)}</span>
                          <span>
                            +biz {round1(weights.biz * c.biz)} / +eco {round1(weights.eco * c.eco)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer padding */}
          <div className="h-6 bg-[#030712]" />
        </div>
      </div>
    </div>
  );
};

const Dial: React.FC<{
  title: string;
  color: 'pink' | 'emerald';
  value: number; // -1..1
  angle: number; // degrees
  hint: string;
}> = ({ title, color, value, angle, hint }) => {
  const theme =
    color === 'pink'
      ? {
          ring: 'border-pink-500/30 bg-pink-500/10',
          dot: '#f472b6',
          text: 'text-pink-300',
          shadow: 'shadow-[0_0_30px_rgba(236,72,153,0.18)]',
        }
      : {
          ring: 'border-emerald-500/30 bg-emerald-500/10',
          dot: '#34d399',
          text: 'text-emerald-300',
          shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.18)]',
        };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div className={`font-black ${theme.text}`}>{title}</div>
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{hint}</div>
      </div>

      <div className="mt-4 flex items-center gap-5">
        {/* Circle dial */}
        <div className={`relative w-24 h-24 rounded-full border ${theme.ring} ${theme.shadow}`}>
          <div className="absolute inset-0 rounded-full border border-white/5" />

          {/* simple ticks */}
          <div className="absolute left-1/2 top-1/2 w-[2px] h-[38px] -translate-x-1/2 -translate-y-full bg-white/10" />
          <div className="absolute left-1/2 top-1/2 w-[2px] h-[38px] -translate-x-1/2 bg-white/10" />

          {/* Hand */}
          <motion.div
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{ width: 2, height: 38 }}
          >
            <div className="w-[2px] h-[34px] bg-white/60" />
            <div
              className="w-2 h-2 rounded-full -ml-[3px] -mt-[2px]"
              style={{ background: theme.dot, boxShadow: `0 0 14px ${theme.dot}` }}
            />
          </motion.div>

          <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
        </div>

        {/* Value bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase">
            <span>-1</span>
            <span className="text-gray-300">{round1(value)}</span>
            <span>+1</span>
          </div>

          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden relative">
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/15" />
            <div
              className="absolute top-0 h-full"
              style={{
                left: value >= 0 ? '50%' : `${50 + value * 50}%`,
                width: `${Math.abs(value) * 50}%`,
                background:
                  color === 'pink'
                    ? 'linear-gradient(90deg, rgba(244,114,182,0.0), rgba(244,114,182,0.8))'
                    : 'linear-gradient(90deg, rgba(52,211,153,0.0), rgba(52,211,153,0.8))',
              }}
            />
          </div>

          <div className="mt-2 text-[11px] text-gray-500">候选过来后，策略给出正/负方向的加成</div>
        </div>
      </div>
    </div>
  );
};

export default StrategyIntervention;
