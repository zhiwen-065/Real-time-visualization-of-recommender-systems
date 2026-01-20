
import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity, Target } from 'lucide-react';

const DeepRanking: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-12">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        
        {/* Deep Learning Architecture Visual */}
        <div className="relative aspect-video glass rounded-[2.5rem] border border-white/10 p-12 flex flex-col justify-center overflow-hidden shadow-2xl">
           <div className="absolute top-8 left-10 flex items-center gap-3">
              <Layers size={20} className="text-blue-500" />
              <span className="text-xs font-black tracking-widest text-gray-400 uppercase">深度排序模型架构 (Ranking Model)</span>
           </div>

           <div className="flex justify-between items-center relative h-64 px-8">
              <NeuralColumn count={5} label="用户/上下文" active />
              <div className="flex-1 flex items-center justify-center px-4">
                 <div className="w-full h-px bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-20 relative">
                   <motion.div 
                     animate={{ left: ['0%', '100%'] }}
                     transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                     className="absolute w-12 h-0.5 bg-white blur-sm shadow-[0_0_10px_white]"
                   />
                 </div>
              </div>
              <NeuralColumn count={8} label="交叉特征提取" active />
              <div className="flex-1 flex items-center justify-center px-4">
                 <div className="w-full h-px bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 opacity-20 relative">
                   <motion.div 
                     animate={{ left: ['100%', '0%'] }}
                     transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                     className="absolute w-12 h-0.5 bg-white blur-sm shadow-[0_0_10px_white]"
                   />
                 </div>
              </div>
              <NeuralColumn count={3} label="多目标分值" active />
           </div>

           {/* Floating Data Nodes */}
           <motion.div 
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8], x: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute right-12 bottom-12 text-[10px] font-mono text-blue-500/40"
           >
             INFERENCE_LATENCY: 12ms
           </motion.div>
        </div>

        {/* Multi-Objective Ranking Results */}
        <div className="space-y-12">
          <div className="space-y-4">
            <h3 className="text-6xl font-black tracking-tighter">毫秒级的<br/>多目标模拟对抗</h3>
            <p className="text-gray-400 text-lg">对每个视频计算“点击率”、“完播率”、“点赞率”等多维度得分，最终通过加权计算综合排序值。</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <RankingBar label="点击概率预测 (pCTR)" value={0.88} color="bg-blue-600" />
             <RankingBar label="观看时长预测 (pWatchTime)" value={0.72} color="bg-purple-600" />
             <RankingBar label="正向互动预测 (pEngagement)" value={0.61} color="bg-cyan-600" />
          </div>

          <div className="flex items-center gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 border-l-4 border-l-blue-500">
             <div className="p-4 bg-blue-600/20 rounded-2xl">
                <Target className="text-blue-500 w-10 h-10" />
             </div>
             <div>
                <div className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Final Elimination</div>
                <div className="text-3xl font-black">从 2,000 中选出 Top 50</div>
                <div className="text-gray-500 text-sm font-medium mt-1">进入下一轮多样性重排逻辑</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const NeuralColumn: React.FC<{ count: number; label: string; active?: boolean }> = ({ count, label, active }) => (
  <div className="flex flex-col items-center gap-6">
    <div className="flex flex-col gap-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          animate={active ? { 
            scale: [1, 1.2, 1],
            backgroundColor: ["#1e293b", "#2563eb", "#1e293b"],
            boxShadow: ["none", "0 0 15px rgba(37, 99, 235, 0.5)", "none"]
          } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          className="w-3.5 h-3.5 rounded-full bg-gray-800 border border-blue-500/20"
        />
      ))}
    </div>
    <span className="text-[10px] text-gray-500 font-bold uppercase rotate-90 whitespace-nowrap tracking-tighter origin-center mt-2">{label}</span>
  </div>
);

const RankingBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-2">
     <div className="flex justify-between text-sm">
        <span className="text-gray-300 font-bold tracking-tight">{label}</span>
        <span className="font-mono text-white font-bold">{(value * 100).toFixed(0)}%</span>
     </div>
     <div className="h-2.5 bg-gray-800/50 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_15px_currentColor]`}
        />
     </div>
  </div>
);

export default DeepRanking;
