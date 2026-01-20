import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, MessageSquare } from 'lucide-react';

const FeedbackLoop: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-12">
      {/* Title */}
      <h2 className="text-4xl font-black tracking-tight mb-12 text-teal-400">
        6. 实时反馈：闭环飞轮启动
      </h2>

      <div className="relative w-full max-w-6xl h-[420px] flex items-center justify-between">
        {/* ================= Left: Real-time Feedback ================= */}
        <Panel title="实时反馈流" subtitle="ms 级">
          <div className="space-y-4">
            <Signal icon={<Eye />} label="看" />
            <Signal icon={<Heart />} label="赞" />
            <Signal icon={<MessageSquare />} label="评" />
          </div>
        </Panel>

        {/* Arrow */}
        <Arrow />

        {/* ================= Middle: Online Update ================= */}
        <Panel title="在线更新" subtitle="< 50ms">
          <div className="flex items-center gap-4">
            <div className="w-6 h-32 bg-white/10 rounded-md overflow-hidden">
              <motion.div
                animate={{ height: ['0%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full bg-teal-400"
              />
            </div>
            <span className="text-xs font-mono text-gray-400">
              user embedding update
            </span>
          </div>
        </Panel>

        {/* Arrow */}
        <Arrow />

        {/* ================= Right: Feedback Loop ================= */}
        <div className="relative w-72 h-72 rounded-2xl border border-teal-500/40 bg-teal-500/10 flex items-center justify-center">
          {/* Circular loop */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6 rounded-full border border-teal-400/40"
          />

          {/* Loop labels */}
          <LoopLabel text="曝光" pos="top" />
          <LoopLabel text="观看" pos="left" />
          <LoopLabel text="互动" pos="bottom" />
          <LoopLabel text="更新" pos="right" />

          {/* Highlight dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
          </motion.div>
        </div>
      </div>

      {/* ================= Formula ================= */}
      <div className="mt-12 text-xl font-mono text-gray-200">
        v<sub>u</sub><sup>new</sup> = v<sub>u</sub><sup>old</sup> + η · (v<sub>video</sub> − v<sub>u</sub><sup>old</sup>)
      </div>
    </div>
  );
};

/* ================= Components ================= */

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="w-72 h-56 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-6 flex flex-col justify-between">
    <div>
      <div className="text-teal-300 font-bold">{title}</div>
      <div className="text-xs font-mono text-gray-400">{subtitle}</div>
    </div>
    {children}
  </div>
);

const Signal: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <motion.div
    animate={{ opacity: [0.3, 1, 0.3] }}
    transition={{ duration: 2, repeat: Infinity }}
    className="flex items-center gap-3 text-gray-200"
  >
    <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
      {icon}
    </div>
    <span className="font-medium">{label}</span>
  </motion.div>
);

const Arrow = () => (
  <div className="w-12 h-px bg-teal-400/40 relative">
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-teal-400 border-y-[4px] border-y-transparent" />
  </div>
);

const LoopLabel: React.FC<{ text: string; pos: 'top' | 'right' | 'bottom' | 'left' }> = ({
  text,
  pos,
}) => {
  const map = {
    top: 'top-1 left-1/2 -translate-x-1/2',
    right: 'right-1 top-1/2 -translate-y-1/2',
    bottom: 'bottom-1 left-1/2 -translate-x-1/2',
    left: 'left-1 top-1/2 -translate-y-1/2',
  };
  return (
    <div className={`absolute ${map[pos]} text-sm text-teal-200 font-bold`}>
      {text}
    </div>
  );
};

export default FeedbackLoop;
