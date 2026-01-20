
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, AlertTriangle, Info } from 'lucide-react';

const DiversityControl: React.FC = () => {
  const [isDiverse, setIsDiverse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDiverse(prev => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const videoTypes = [
    { name: '美妆穿搭', color: 'bg-pink-500', icon: '👗' },
    { name: '硬核科技', color: 'bg-blue-500', icon: '💻' },
    { name: '美食探店', color: 'bg-orange-500', icon: '🍔' },
    { name: '户外旅行', color: 'bg-green-500', icon: '⛰️' },
    { name: '萌宠日常', color: 'bg-yellow-500', icon: '🐱' },
    { name: '知识干货', color: 'bg-indigo-500', icon: '📚' },
  ];

  // If not diverse, most items will be the first type (Repetitive)
  const items = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    typeIndex: isDiverse ? (i % videoTypes.length) : 0,
  }));

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-5xl w-full space-y-12">
        {/* State Toggle Header */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 bg-white/5 p-2 rounded-full border border-white/10">
            <button 
              className={`px-6 py-2 rounded-full transition-all font-bold text-sm ${!isDiverse ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-gray-500'}`}
              onClick={() => setIsDiverse(false)}
            >
              信息茧房 (Filter Bubble)
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button 
              className={`px-6 py-2 rounded-full transition-all font-bold text-sm ${isDiverse ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'text-gray-500'}`}
              onClick={() => setIsDiverse(true)}
            >
              多样性重排 (Diversity)
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={isDiverse ? 'div' : 'rep'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {isDiverse ? (
                <Zap className="text-green-500 w-4 h-4" />
              ) : (
                <AlertTriangle className="text-red-500 w-4 h-4" />
              )}
              <span className={isDiverse ? 'text-green-400' : 'text-red-400'}>
                {isDiverse ? '已激活 MMR 算法：提升内容发现性与创作者生态平衡' : '警告：内容同质化严重，用户可能产生审美疲劳'}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 relative">
          <AnimatePresence mode="popLayout">
            {items.map((item, idx) => {
              const type = videoTypes[item.typeIndex];
              const isRepetitive = !isDiverse && idx > 0;
              
              return (
                <motion.div
                  key={`${idx}-${item.typeIndex}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                >
                  {/* Mock Video Thumbnail */}
                  <div className={`absolute inset-0 ${type.color} opacity-40`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="text-4xl filter drop-shadow-lg">{type.icon}</span>
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter opacity-80">{type.name}</span>
                  </div>

                  {/* Overlays */}
                  {isRepetitive && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-red-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center"
                    >
                      <div className="border-2 border-red-500 px-2 py-1 rounded rotate-[-10deg]">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">同质化内容</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Balance Dashboard */}
        <div className="glass p-8 rounded-3xl border border-white/10 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Shuffle size={120} className="rotate-12" />
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-12 relative z-10">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-xs font-black uppercase tracking-widest">精准推荐 (Accuracy)</span>
                <span className="text-2xl font-black text-white">{(isDiverse ? 92 : 98)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: isDiverse ? '92%' : '98%' }}
                  className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                />
              </div>
              <p className="text-[10px] text-gray-500">基于历史兴趣的极致拟合程度</p>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-xs font-black uppercase tracking-widest">生态健康 (Diversity Score)</span>
                <span className="text-2xl font-black text-white">{(isDiverse ? 85 : 12)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: isDiverse ? '85%' : '12%' }}
                  className={`h-full ${isDiverse ? 'bg-green-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}
                />
              </div>
              <p className="text-[10px] text-gray-500">内容品类丰富度与长尾流量覆盖</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Info className="text-blue-400 w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              系统通过 <span className="text-white font-bold">MMR (Maximal Marginal Relevance)</span> 算法在推荐结果中强制“打散”同类视频，确保用户的每一刷都能看到不同的世界。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiversityControl;
