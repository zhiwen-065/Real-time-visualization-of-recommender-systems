import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Heart, MessageSquare, Zap, Database, RefreshCcw } from 'lucide-react';

type Step = {
  key: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
};

const FeedbackLoop: React.FC = () => {
  const steps: Step[] = useMemo(
    () => [
      { key: 'ingest', title: 'Event Ingest', sub: '埋点流入', icon: <Zap className="w-4 h-4" /> },
      { key: 'feature', title: 'Feature Update', sub: '短期特征', icon: <Database className="w-4 h-4" /> },
      { key: 'embed', title: 'Embedding Update', sub: 'u-vector', icon: <RefreshCcw className="w-4 h-4" /> },
      { key: 'sync', title: 'Param Sync', sub: '参数同步', icon: <RefreshCcw className="w-4 h-4" /> },
      { key: 'cache', title: 'Cache Refresh', sub: '线上生效', icon: <Database className="w-4 h-4" /> },
    ],
    []
  );

  const [cursor, setCursor] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [leftBoost, setLeftBoost] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setCursor((p) => (p + 1) % steps.length);
    }, 900);
    return () => clearInterval(t);
  }, [steps.length]);

  useEffect(() => {
    if (cursor === steps.length - 1) {
      setPulse((p) => p + 1);
      setLeftBoost(true);
      const t = setTimeout(() => setLeftBoost(false), 900);
      return () => clearTimeout(t);
    }
  }, [cursor, steps.length]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-12">
      <h2 className="text-4xl font-black tracking-tight mb-10 text-teal-300">
        6. 实时反馈：闭环飞轮启动
      </h2>

      <div className="relative w-full max-w-6xl h-[520px] flex items-center justify-between">
        {/* LEFT */}
        <Panel title="实时反馈流" subtitle="ms 级事件进入系统" accent={leftBoost ? 'strong' : 'normal'}>
          <div className="space-y-4">
            <Signal label="看" icon={<Eye className="w-4 h-4" />} boosted={leftBoost} />
            <Signal label="赞" icon={<Heart className="w-4 h-4" />} boosted={leftBoost} />
            <Signal label="评" icon={<MessageSquare className="w-4 h-4" />} boosted={leftBoost} />
          </div>

          <AnimatePresence>
            {leftBoost && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mt-4 text-[10px] font-mono text-teal-200/80"
              >
                synced: 用户向量已更新 → 下一刷反馈分布改变
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        <FlowArrow direction="right" />

        {/* ================= MIDDLE: Online Update Pipeline ================= */}
        {/* 方案A：有框，但加高 + 内部滚动，绝不溢出 */}
        <div className="w-[460px] h-[340px] rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-500/12 to-transparent p-6 overflow-hidden">
          <div className="flex items-baseline justify-between">
            <div className="text-teal-200 font-bold">在线更新</div>
            <div className="text-xs font-mono text-gray-400">{'< 50ms (概念演示)'}</div>
          </div>

          {/* Scroll container so content never spills */}
          <div className="mt-4 h-[260px] overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {steps.map((s, idx) => {
                const active = idx === cursor;
                const doneRecently = idx < cursor;

                return (
                  <motion.div
                    key={s.key}
                    animate={{
                      opacity: active ? 1 : 0.65,
                      borderColor: active ? 'rgba(45, 212, 191, 0.7)' : 'rgba(255,255,255,0.08)',
                      backgroundColor: active
                        ? 'rgba(20, 184, 166, 0.18)'
                        : doneRecently
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.02)',
                      x: active ? 6 : 0,
                    }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          active
                            ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                            : 'border-white/10 bg-white/5 text-gray-300'
                        }`}
                      >
                        {s.icon}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-300'}`}>
                          {s.title}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">{s.sub}</div>
                      </div>
                    </div>

                    {/* process blocks */}
                    <div className="flex items-center gap-1">
                      {[...Array(8)].map((_, k) => {
                        const on = active ? k <= 5 : doneRecently ? k <= 3 : k <= 1;
                        return (
                          <motion.div
                            key={k}
                            animate={{ opacity: on ? 1 : 0.2 }}
                            transition={{ duration: 0.2 }}
                            className={`w-2 h-3 rounded-sm ${on ? 'bg-teal-300' : 'bg-white/20'}`}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* pipeline token */}
          <PipelineToken cursor={cursor} total={steps.length} />
        </div>



        <FlowArrow direction="right" />

        {/* RIGHT */}
        <div className="relative w-72 h-72 rounded-2xl border border-teal-500/35 bg-teal-500/10 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-6 rounded-full border border-teal-300/35" />

          <motion.div
            key={pulse}
            initial={{ opacity: 0.0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-6 rounded-full border-2 border-teal-300/30 shadow-[0_0_30px_rgba(45,212,191,0.25)]" />
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
          </motion.div>

          <LoopLabel text="曝光" pos="top" />
          <LoopLabel text="观看" pos="left" />
          <LoopLabel text="互动" pos="bottom" />
          <LoopLabel text="更新" pos="right" />

          <svg className="absolute inset-0" viewBox="0 0 300 300">
            <defs>
              <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(45,212,191,0.55)" />
              </marker>
            </defs>
            <path d="M150 45 A105 105 0 0 1 255 150" fill="none" stroke="rgba(45,212,191,0.35)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <path d="M255 150 A105 105 0 0 1 150 255" fill="none" stroke="rgba(45,212,191,0.35)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <path d="M150 255 A105 105 0 0 1 45 150" fill="none" stroke="rgba(45,212,191,0.35)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <path d="M45 150 A105 105 0 0 1 150 45" fill="none" stroke="rgba(45,212,191,0.35)" strokeWidth="2" markerEnd="url(#arrowHead)" />
          </svg>

          <div className="absolute bottom-4 left-4 right-4 text-center text-[10px] font-mono text-gray-400">
            Update effective → re-rank → re-push
          </div>
        </div>

        {/* Back Sync */}
        <BackSyncArc pulseKey={pulse} />
      </div>

      {/* ✅ 公式删掉：这里不再渲染任何公式 */}
    </div>
  );
};

/* ============== pieces ============== */

const Panel: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accent?: 'normal' | 'strong';
}> = ({ title, subtitle, children, accent = 'normal' }) => (
  <div
    className={`w-72 h-64 rounded-2xl border bg-teal-500/10 p-6 flex flex-col justify-between transition-all ${
      accent === 'strong'
        ? 'border-teal-300/70 shadow-[0_0_30px_rgba(45,212,191,0.20)]'
        : 'border-teal-500/35'
    }`}
  >
    <div>
      <div className="text-teal-200 font-bold">{title}</div>
      <div className="text-xs font-mono text-gray-400">{subtitle}</div>
    </div>
    {children}
  </div>
);

const Signal: React.FC<{ label: string; icon: React.ReactNode; boosted?: boolean }> = ({
  label,
  icon,
  boosted = false,
}) => (
  <motion.div
    animate={boosted ? { opacity: [0.6, 1, 0.6], x: [0, 4, 0] } : { opacity: [0.35, 1, 0.35] }}
    transition={{ duration: boosted ? 1.0 : 2.0, repeat: Infinity, ease: 'easeInOut' }}
    className="flex items-center gap-3 text-gray-200"
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
        boosted ? 'border-teal-300/70 bg-teal-500/25 text-teal-100' : 'border-teal-500/35 bg-teal-500/15 text-teal-200'
      }`}
    >
      {icon}
    </div>
    <span className="font-medium">{label}</span>
    {boosted && <span className="ml-auto text-[10px] font-mono text-teal-200/80">↑ synced</span>}
  </motion.div>
);

const FlowArrow: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
  <div className="w-14 h-px bg-teal-300/35 relative">
    <div
      className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent ${
        direction === 'right'
          ? 'right-0 border-l-[7px] border-l-teal-300/70'
          : 'left-0 border-r-[7px] border-r-teal-300/70'
      }`}
    />
  </div>
);

const LoopLabel: React.FC<{ text: string; pos: 'top' | 'right' | 'bottom' | 'left' }> = ({ text, pos }) => {
  const map = {
    top: 'top-3 left-1/2 -translate-x-1/2',
    right: 'right-3 top-1/2 -translate-y-1/2',
    bottom: 'bottom-3 left-1/2 -translate-x-1/2',
    left: 'left-3 top-1/2 -translate-y-1/2',
  };
  return <div className={`absolute ${map[pos]} text-sm text-teal-100 font-bold`}>{text}</div>;
};

const PipelineToken: React.FC<{ cursor: number; total: number }> = ({ cursor }) => {
  const top = 64;
  const stepH = 56;
  const y = top + cursor * stepH;

  return (
    <motion.div
      animate={{ y }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="absolute left-2 top-0 pointer-events-none"
    >
      <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
    </motion.div>
  );
};

const BackSyncArc: React.FC<{ pulseKey: number }> = ({ pulseKey }) => {
  return (
    <svg className="absolute left-0 right-0 bottom-[-30px] h-44 pointer-events-none" viewBox="0 0 1200 180" preserveAspectRatio="none">
      <defs>
        <filter id="tealGlow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <marker id="syncArrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="rgba(45,212,191,0.55)" />
        </marker>
      </defs>

      <path
        d="M 980 20 C 760 170, 420 170, 200 40"
        fill="none"
        stroke="rgba(45,212,191,0.25)"
        strokeWidth="3"
        markerEnd="url(#syncArrow)"
      />

      <AnimatePresence mode="wait">
        <motion.g key={pulseKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {[...Array(6)].map((_, i) => (
            <motion.circle
              key={i}
              r="4"
              fill="rgba(45,212,191,0.9)"
              filter="url(#tealGlow)"
              initial={{ offsetDistance: '0%' } as any}
              animate={{ offsetDistance: '100%' } as any}
              transition={{ duration: 1.6, delay: i * 0.08, ease: 'easeOut' }}
              style={{ offsetPath: "path('M 980 20 C 760 170, 420 170, 200 40')" }}
            />
          ))}
        </motion.g>
      </AnimatePresence>
    </svg>
  );
};

export default FeedbackLoop;
