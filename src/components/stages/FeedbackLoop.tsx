
import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Database, Smartphone, Zap } from 'lucide-react';

const FeedbackLoop: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full max-w-4xl h-[600px]">
        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-600/10 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-full h-full absolute inset-0 rounded-full border-t-2 border-blue-500 border-dashed"
          />
          <RefreshCcw className="w-16 h-16 text-blue-500" />
        </div>

        {/* Orbiting Elements */}
        <OrbitingNode 
          icon={<Smartphone />} 
          label="用户感知" 
          sub="Zhiwen"
          delay={0}
          pos="top"
        />
        <OrbitingNode 
          icon={<Database />} 
          label="特征存储" 
          sub="HBase/Redis"
          delay={1.5}
          pos="right"
        />
        <OrbitingNode 
          icon={<Zap />} 
          label="模型更新" 
          sub="Online Training"
          delay={3}
          pos="bottom"
        />
        <OrbitingNode 
          icon={<RefreshCcw />} 
          label="参数同步" 
          sub="Parameter Server"
          delay={4.5}
          pos="left"
        />

        {/* Circular Data Flow - SVGs */}
        <svg viewBox="0 0 800 600" className="w-full h-full absolute inset-0 pointer-events-none">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            id="orbitPath"
            d="M 400, 300 m -200, 0 a 200,200 0 1,0 400,0 a 200,200 0 1,0 -400,0"
            fill="none"
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="2"
          />
          
          {/* Animated Flow Particles */}
          {[...Array(6)].map((_, i) => (
             <motion.circle
              key={i}
              r="4"
              fill="#3b82f6"
              filter="url(#glow)"
              animate={{ 
                offsetDistance: ["0%", "100%"] 
              }}
              transition={{ duration: 8, repeat: Infinity, delay: i * 1.5, ease: "linear" }}
              style={{ offsetPath: "path('M 400, 300 m -200, 0 a 200,200 0 1,0 400,0 a 200,200 0 1,0 -400,0')" }}
             />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center pointer-events-none">
          <div className="absolute top-[65%] text-center space-y-4 max-w-md">
            <h3 className="text-3xl font-black italic tracking-tighter">实时进化，永无止境</h3>
            <p className="text-gray-500 font-medium">每一次滑动手势都在这一秒内改变了下一秒看到的推荐</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrbitingNode: React.FC<{ icon: React.ReactNode; label: string; sub: string; delay: number; pos: 'top' | 'right' | 'bottom' | 'left' }> = ({ icon, label, sub, pos }) => {
  const positions = {
    top: 'top-0 left-1/2 -translate-x-1/2',
    right: 'right-0 top-1/2 -translate-y-1/2',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2',
    left: 'left-0 top-1/2 -translate-y-1/2',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute ${positions[pos]} flex flex-col items-center gap-3`}
    >
      <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
        {icon}
      </div>
      <div className="text-center">
        <div className="font-bold text-sm text-white">{label}</div>
        <div className="text-[10px] text-gray-500 font-mono uppercase">{sub}</div>
      </div>
    </motion.div>
  );
};

export default FeedbackLoop;
