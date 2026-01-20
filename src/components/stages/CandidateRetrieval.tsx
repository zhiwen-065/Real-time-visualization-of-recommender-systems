
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Sparkles, TrendingUp, Filter } from 'lucide-react';

const CandidateRetrieval: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-12">
      {/* Immersive Data Universe */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 2000 - 1000, 
              y: Math.random() * 1000 - 500,
              scale: 0.1,
              opacity: 0
            }}
            animate={{ 
              x: Math.random() * 2000 - 1000, 
              y: Math.random() * 1000 - 500,
              scale: [0.1, 0.5, 0.1],
              opacity: [0, 0.8, 0]
            }}
            transition={{ 
              duration: 15 + Math.random() * 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10 
            }}
            className="absolute"
          >
             <div className="w-20 h-28 bg-blue-500/10 rounded-lg border border-white/5 backdrop-blur-sm" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left: Recall Channels */}
        <div className="lg:col-span-7 space-y-12">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-500/20">
               <Search size={12} />
               Multi-Channel Recall
             </div>
             <h3 className="text-6xl font-black text-white tracking-tighter">从亿级视频中<br/>瞬间“捞”出潜在候选</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecallCard 
              icon={<Users className="w-6 h-6 text-blue-500" />} 
              title="协同过滤 (CF)" 
              desc="“看过此视频的人也看了...”基于群体智慧的快速检索。"
              delay={0.1}
            />
            <RecallCard 
              icon={<Sparkles className="w-6 h-6 text-purple-500" />} 
              title="向量召回 (ANN)" 
              desc="将用户与视频映射至同一向量空间，通过余弦相似度极速匹配。"
              delay={0.2}
            />
            <RecallCard 
              icon={<TrendingUp className="w-6 h-6 text-cyan-500" />} 
              title="热点发现" 
              desc="监控全网实时爆发话题，对高热度内容进行保底召回。"
              delay={0.3}
            />
            <RecallCard 
              icon={<Filter className="w-6 h-6 text-indigo-500" />} 
              title="多路并发处理" 
              desc="高性能检索引擎同时从多路库中并行读取数据。"
              delay={0.4}
            />
          </div>
        </div>

        {/* Right: Funnel Visualization */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full aspect-square flex items-center justify-center">
            {/* The Funnel SVG */}
            <svg viewBox="0 0 200 300" className="w-full h-full max-w-sm">
              <defs>
                <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0" />
                  <stop offset="50%" stopColor="#2563eb" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <motion.path 
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5 }}
                d="M10,20 Q100,20 190,20 L130,280 L70,280 Z" 
                fill="url(#funnelGradient)" 
                stroke="#3b82f6" 
                strokeWidth="1"
              />
              
              {/* Particles Flowing */}
              {[...Array(24)].map((_, i) => (
                <motion.circle
                  key={i}
                  r="2"
                  fill="#fff"
                  initial={{ cx: 40 + Math.random() * 120, cy: 30 }}
                  animate={{ 
                    cy: [30, 270], 
                    cx: [null, 80 + Math.random() * 40],
                    opacity: [0, 1, 0] 
                  }}
                  transition={{ 
                    duration: 2 + Math.random(), 
                    repeat: Infinity, 
                    delay: i * 0.2,
                    ease: "easeIn" 
                  }}
                />
              ))}
            </svg>

            {/* Funnel Labels */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 flex flex-col items-center">
              <div className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mb-1">Total Library</div>
              <div className="text-2xl font-black">100,000,000+</div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 flex flex-col items-center">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Potential Candidates</div>
              <div className="text-5xl font-black text-blue-500">~2,000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecallCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; delay: number }> = ({ icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-6 glass rounded-2xl border border-white/5 hover:border-blue-500/40 transition-all group hover:bg-white/5"
  >
    <div className="bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

export default CandidateRetrieval;
