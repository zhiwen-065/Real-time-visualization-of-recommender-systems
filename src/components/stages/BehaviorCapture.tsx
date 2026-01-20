import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, User } from "lucide-react";

type Signal = "watch" | "swipe" | "pause" | "like" | "comment";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 把 4 个维度映射成右侧坐标轴的四边形：
 *  - y+ 活跃 (activity)
 *  - y- 互动 (engagement)
 *  - x+ 兴趣 (interest)
 *  - x- 多样 (diversity)
 */
function buildPolygonPoints(opts: {
  cx: number;
  cy: number;
  r: number;
  activity: number; // 0..1
  engagement: number; // 0..1
  interest: number; // 0..1
  diversity: number; // 0..1
}) {
  const { cx, cy, r, activity, engagement, interest, diversity } = opts;

  // 上 / 右 / 下 / 左
  const up = { x: cx, y: cy - r * activity };
  const right = { x: cx + r * interest, y: cy };
  const down = { x: cx, y: cy + r * engagement };
  const left = { x: cx - r * diversity, y: cy };

  return `${up.x},${up.y} ${right.x},${right.y} ${down.x},${down.y} ${left.x},${left.y}`;
}

const SIGNALS: Signal[] = ["watch", "swipe", "pause", "like", "comment"];

/**
 * 你想要的：手机行为 → 粒子 → AI Core → 用户特征坐标轴四边形
 */
const BehaviorCapture: React.FC = () => {
  const [activeSignal, setActiveSignal] = useState<Signal | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  // 右侧四维度：activity / engagement / interest / diversity
  const [vec, setVec] = useState({
    activity: 0.18,
    engagement: 0.18,
    interest: 0.18,
    diversity: 0.18,
  });

  // 每 2.5s 随机触发一个信号（你也可以换成点击按钮触发）
  useEffect(() => {
    const interval = setInterval(() => {
      const s = SIGNALS[Math.floor(Math.random() * SIGNALS.length)];
      setActiveSignal(s);
      setPulseKey((k) => k + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 根据信号决定“用户特征四边形”怎么变大/偏移
  useEffect(() => {
    const base = 0.18;

    const next = (() => {
      switch (activeSignal) {
        case "watch":
          // 看完：活跃↑ 兴趣↑
          return { activity: 0.75, engagement: 0.25, interest: 0.72, diversity: 0.30 };
        case "swipe":
          // 划走：多样↑（系统尝试打散） 活跃略↑
          return { activity: 0.50, engagement: 0.22, interest: 0.35, diversity: 0.80 };
        case "pause":
          // 停留：兴趣↑ 活跃↑
          return { activity: 0.70, engagement: 0.20, interest: 0.65, diversity: 0.28 };
        case "like":
          // 点赞：互动↑（y-方向更大） 兴趣↑
          return { activity: 0.55, engagement: 0.78, interest: 0.60, diversity: 0.25 };
        case "comment":
          // 评论：互动↑↑ 活跃↑ 兴趣↑
          return { activity: 0.70, engagement: 0.90, interest: 0.62, diversity: 0.22 };
        default:
          return { activity: base, engagement: base, interest: base, diversity: base };
      }
    })();

    setVec({
      activity: clamp01(next.activity),
      engagement: clamp01(next.engagement),
      interest: clamp01(next.interest),
      diversity: clamp01(next.diversity),
    });

    // 触发后，稍微回落到一个“更真实的”中间态（不是回到完全原点）
    if (activeSignal) {
      const t = setTimeout(() => {
        setVec((v) => ({
          activity: Math.max(0.22, v.activity * 0.70),
          engagement: Math.max(0.22, v.engagement * 0.70),
          interest: Math.max(0.22, v.interest * 0.70),
          diversity: Math.max(0.22, v.diversity * 0.70),
        }));
      }, 1300);
      return () => clearTimeout(t);
    }
  }, [activeSignal]);

  // SVG 坐标轴设置（右侧）
  const chart = useMemo(() => {
    const W = 380;
    const H = 300;
    const cx = W / 2;
    const cy = H / 2;
    const R = 110;

    const idlePts = buildPolygonPoints({
      cx,
      cy,
      r: R,
      activity: 0.18,
      engagement: 0.18,
      interest: 0.18,
      diversity: 0.18,
    });

    const livePts = buildPolygonPoints({
      cx,
      cy,
      r: R,
      activity: vec.activity,
      engagement: vec.engagement,
      interest: vec.interest,
      diversity: vec.diversity,
    });

    return { W, H, cx, cy, R, idlePts, livePts };
  }, [vec]);

  return (
    <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 px-10">
      {/* ===== 左：手机 ===== */}
      <div className="relative">
        <motion.div
          initial={{ rotateY: -18, rotateX: 10 }}
          animate={{ rotateY: 0, rotateX: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative w-72 h-[580px] bg-[#0a0c10] rounded-[3.5rem] border-[10px] border-[#1f2937] shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden"
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1f2937] rounded-b-3xl z-30" />

          {/* “短视频”画面（用渐变 + 模糊代替真实图，避免外链不稳定） */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#111827] to-black opacity-90" />
            <motion.div
              animate={{ opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.25),transparent_55%)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
          </div>

          {/* 用户 Overlay */}
          <div className="absolute bottom-16 left-6 z-20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-white/20">
                <User size={14} />
              </div>
              <span className="text-white font-black text-sm tracking-tight">zhiwen_lecture</span>
            </div>
            <p className="text-white/90 text-sm leading-snug max-w-[200px]">
              正在记录这一秒的微互动…
              <br />
              <span className="text-blue-400 font-mono">
                #{activeSignal ?? "capturing"}
              </span>
            </p>
          </div>

          {/* 交互按钮（点亮表示触发） */}
          <div className="absolute right-6 bottom-32 flex flex-col items-center gap-8 z-20">
            <InteractionIcon active={activeSignal === "like"} color="text-red-500">
              <Heart className="fill-current" />
            </InteractionIcon>
            <InteractionIcon active={activeSignal === "comment"} color="text-white">
              <MessageCircle />
            </InteractionIcon>
            <InteractionIcon active={activeSignal === "swipe" || activeSignal === "pause"} color="text-white">
              <Share2 />
            </InteractionIcon>
          </div>
        </motion.div>

        {/* 手机底部光晕 */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-8 bg-blue-500/20 blur-3xl rounded-full" />
      </div>

      {/* ===== 中：AI Core ===== */}
      <div className="relative flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ scale: activeSignal ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.8 }}
          className="relative w-28 h-28 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_60px_rgba(59,130,246,0.18)] flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: [0, 90, 180, 270, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-xl border border-blue-500/30"
          />
          <div className="text-xs font-mono text-blue-300 tracking-widest">AI CORE</div>

          {/* 核心发光 */}
          <motion.div
            animate={activeSignal ? { opacity: [0.2, 0.55, 0.2] } : { opacity: 0.15 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,rgba(59,130,246,0.35),transparent_60%)]"
          />
        </motion.div>

        <div className="text-[11px] text-gray-400 font-mono tracking-widest uppercase">
          signals → embedding
        </div>
      </div>

      {/* ===== 右：用户特征坐标轴（菱形→四边形） ===== */}
      <div className="relative">
        <div className="text-blue-500 font-black tracking-widest text-xs uppercase mb-3">
          User Representation (用户特征)
        </div>

        <div className="relative w-[420px] h-[340px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
          {/* 轴标签 */}
          <div className="absolute top-4 left-0 w-full text-center text-[11px] text-gray-300/80 font-mono">
            活跃 (Y+)
          </div>
          <div className="absolute bottom-4 left-0 w-full text-center text-[11px] text-gray-300/80 font-mono">
            互动 (Y-)
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-4 text-[11px] text-gray-300/80 font-mono">
            兴趣 (X+)
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 left-4 text-[11px] text-gray-300/80 font-mono">
            多样 (X-)
          </div>

          {/* 坐标轴 + 四边形 */}
          <svg
            width={chart.W}
            height={chart.H}
            viewBox={`0 0 ${chart.W} ${chart.H}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 轴线 */}
            <line x1={chart.cx} y1={30} x2={chart.cx} y2={chart.H - 30} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1={30} y1={chart.cy} x2={chart.W - 30} y2={chart.cy} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* 中心小菱形（无行为） */}
            <motion.polygon
              points={chart.idlePts}
              fill="rgba(59,130,246,0.12)"
              stroke="rgba(59,130,246,0.45)"
              strokeWidth="1.5"
              filter="url(#glow)"
              animate={{ opacity: activeSignal ? 0.15 : 0.9 }}
              transition={{ duration: 0.4 }}
            />

            {/* 行为触发后的四边形（变大/偏移） */}
            <motion.polygon
              points={chart.livePts}
              fill="rgba(59,130,246,0.22)"
              stroke="rgba(59,130,246,0.85)"
              strokeWidth="2"
              filter="url(#glow)"
              animate={{ opacity: activeSignal ? 1 : 0.0 }}
              transition={{ duration: 0.35 }}
            />

            {/* 放射线（触发时） */}
            <AnimatePresence>
              {activeSignal && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.65 }}
                  exit={{ opacity: 0 }}
                >
                  {[...Array(12)].map((_, i) => {
                    const angle = (Math.PI * 2 * i) / 12;
                    const x2 = chart.cx + Math.cos(angle) * (chart.R + 35);
                    const y2 = chart.cy + Math.sin(angle) * (chart.R + 35);
                    return (
                      <motion.line
                        key={i}
                        x1={chart.cx}
                        y1={chart.cy}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(59,130,246,0.25)"
                        strokeWidth="1"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, delay: i * 0.02 }}
                      />
                    );
                  })}
                </motion.g>
              )}
            </AnimatePresence>
          </svg>

          {/* 右下角小注释 */}
          <div className="absolute bottom-4 right-5 text-[10px] text-gray-400 font-mono">
            embedding update: ms-level
          </div>
        </div>
      </div>

      {/* ===== 粒子层：手机 → AI Core → 坐标轴 ===== */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {activeSignal && (
            <Particles
              key={pulseKey} // 每次触发重新播一遍
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** 粒子动画：用屏幕百分比定位，适配不同分辨率（你也可微调 start/core/end 的位置） */
const Particles: React.FC = () => {
  // 起点：手机中部偏右；中点：AI Core；终点：右侧坐标轴中心
  const start = { x: "32%", y: "48%" };
  const core = { x: "52%", y: "48%" };
  const end = { x: "77%", y: "50%" };

  const dots = Array.from({ length: 16 });

  return (
    <>
      {dots.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-blue-400"
          style={{
            left: start.x,
            top: start.y,
            filter: "drop-shadow(0 0 10px rgba(59,130,246,0.75))",
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.6, 1, 1, 0.7],
            left: [start.x, core.x, end.x],
            top: [start.y, core.y, end.y],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.15,
            delay: i * 0.03,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
};

const InteractionIcon: React.FC<{ active: boolean; children: React.ReactNode; color: string }> = ({
  active,
  children,
  color,
}) => (
  <motion.div
    animate={active ? { scale: 1.5, filter: "drop-shadow(0 0 12px currentColor)" } : { scale: 1 }}
    transition={{ duration: 0.25 }}
    className={`${color} transition-all duration-300`}
  >
    {children}
  </motion.div>
);

export default BehaviorCapture;
