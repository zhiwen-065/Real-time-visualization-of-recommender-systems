
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Clock, User } from 'lucide-react';

const BehaviorCapture: React.FC = () => {
  const [activeSignal, setActiveSignal] = useState<string | null>(null);

  useEffect(() => {
    const signals = ['watch', 'swipe', 'pause', 'like', 'comment'];
    const interval = setInterval(() => {
      setActiveSignal(signals[Math.floor(Math.random() * signals.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-32 px-12">
      {/* Smartphone Mockup */}
      <div className="relative group">
        <motion.div 
          initial={{ rotateY: -20, rotateX: 10 }}
          animate={{ rotateY: 0, rotateX: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative w-72 h-[580px] bg-[#0a0c10] rounded-[3.5rem] border-[10px] border-[#1f2937] shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden"
        >
          {/* Top Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1f2937] rounded-b-3xl z-30" />
          
          {/* App Interface */}
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 z-10" />
            <motion.img 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 10, repeat: Infinity }}
              src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400&h=800" 
              alt="Video Feed" 
              className="w-full h-full object-cover opacity-70"
            />
            
            {/* User Overlay */}
            <div className="absolute bottom-16 left-6 z-20 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-white/20">
                  <User size={14} />
                </div>
                <span className="text-white font-black text-sm tracking-tight">zhiwen_lecture</span>
              </div>
              <p className="text-white/90 text-sm leading-snug max-w-[200px]">
                正在记录这一秒的微互动... <br/>
                <span className="text-blue-400 font-mono">#RecommendationEngine</span>
              </p>
            </div>

            {/* Interaction Buttons */}
            <div className="absolute right-6 bottom-32 flex flex-col items-center gap-8 z-20">
               <InteractionIcon active={activeSignal === 'like'} color="text-red-500"><Heart className="fill-current" /></InteractionIcon>
               <InteractionIcon active={activeSignal === 'comment'} color="text-white"><MessageCircle /></InteractionIcon>
               <InteractionIcon active={false} color="text-white"><Share2 /></InteractionIcon>
            </div>
          </div>
        </motion.div>
        
        {/* Glowing Reflection Under Phone */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-8 bg-blue-500/20 blur-3xl rounded-full" />
      </div>

      {/* Features Extraction Visualization */}
      <div className="flex-1 max-w-xl space-y-10">
        <div className="space-y-4">
           <h4 className="text-blue-500 font-black tracking-widest text-xs uppercase">Feature Extraction (特征提取)</h4>
           <div className="h-0.5 w-12 bg-blue-600" />
        </div>

        <div className="space-y-4">
          <CaptureMetric label="视频完播度" val="0.94" active={activeSignal === 'watch'} />
          <CaptureMetric label="划动加速度" val="0.12s" active={activeSignal === 'swipe'} />
          <CaptureMetric label="互动概率" val="TRUE" active={activeSignal === 'like'} />
        </div>

        {/* Floating Data stream into vector */}
        <div className="relative h-32 glass rounded-2xl border border-white/5 flex items-center px-6 overflow-hidden">
           <div className="absolute top-3 left-6 text-[9px] font-mono text-gray-500 uppercase tracking-widest">Generating Real-time Embeddings</div>
           
           <div className="flex gap-3 overflow-hidden">
             <AnimatePresence>
               {[...Array(12)].map((_, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="flex flex-col gap-1"
                 >
                   {[...Array(3)].map((_, j) => (
                     <div key={j} className="w-1.5 h-1.5 rounded-full bg-blue-500/40 animate-pulse" style={{ animationDelay: `${(i+j)*0.2}s` }} />
                   ))}
                 </motion.div>
               ))}
             </AnimatePresence>
           </div>
           
           <div className="ml-auto bg-blue-600/20 p-3 rounded-lg border border-blue-500/30 flex items-center gap-3">
              <div className="text-xs font-mono text-blue-400">Dim: 1024</div>
              <div className="w-px h-4 bg-blue-500/20" />
              <div className="text-xs font-black text-white">VECTORIZED</div>
           </div>
        </div>
      </div>
    </div>
  );
};

const InteractionIcon: React.FC<{ active: boolean; children: React.ReactNode; color: string }> = ({ active, children, color }) => (
  <motion.div 
    animate={active ? { scale: 1.5, filter: 'drop-shadow(0 0 10px currentColor)' } : { scale: 1 }}
    className={`${color} transition-all duration-300`}
  >
    {children}
  </motion.div>
);

const CaptureMetric: React.FC<{ label: string; val: string; active: boolean }> = ({ label, val, active }) => (
  <motion.div 
    animate={{ 
      x: active ? 20 : 0, 
      backgroundColor: active ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.02)',
      borderColor: active ? 'rgba(37, 99, 235, 0.5)' : 'rgba(255, 255, 255, 0.05)'
    }}
    className="flex justify-between items-center p-5 rounded-2xl border transition-all duration-300"
  >
    <div className="flex items-center gap-4">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-500 animate-ping' : 'bg-gray-700'}`} />
      <span className={`font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </div>
    <span className="font-mono text-blue-400 font-bold tracking-tighter text-xl">{val}</span>
  </motion.div>
);

export default BehaviorCapture;
