
import React, { useState } from 'react';
// Added AnimatePresence to the imports from framer-motion
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ShieldCheck, TrendingUp, UserPlus, Globe } from 'lucide-react';

const StrategyIntervention: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const strategies = [
    { title: '节日/季节加权', desc: '根据当前节假日实时提升相关内容曝光量', icon: <TrendingUp className="w-6 h-6" />, val: '+25%' },
    { title: '新作者保护', desc: '确保初次投稿的优质创作者获得基础流量包', icon: <UserPlus className="w-6 h-6" />, val: 'Enabled' },
    { title: '地域相关性', desc: '优先分发同城或具有强地域属性的优质内容', icon: <Globe className="w-6 h-6" />, val: 'Local-High' },
    { title: '生态价值观治理', desc: '剔除低俗/标题党，对优质原创内容给予扶持', icon: <ShieldCheck className="w-6 h-6" />, val: 'Monitoring' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full max-w-5xl">
        {/* The Strategy Control HUD */}
        <div className="glass rounded-[2rem] border-2 border-blue-500/30 overflow-hidden relative shadow-[0_0_50px_rgba(59,130,246,0.2)]">
          <div className="bg-blue-600/20 px-8 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <Settings className="text-blue-500 animate-spin-slow" />
              <h3 className="font-black tracking-widest text-lg uppercase">策略干预层 (Human Strategy Layer)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-bold uppercase">Manual Override Active</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row h-[450px]">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 border-r border-white/10 bg-black/40 flex flex-col">
              {strategies.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`p-6 text-left flex items-start gap-4 transition-all border-b border-white/5 ${
                    activeTab === idx ? 'bg-blue-600/20 border-l-4 border-l-blue-500' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={activeTab === idx ? 'text-blue-500' : 'text-gray-500'}>{s.icon}</div>
                  <div>
                    <div className={`font-bold text-sm ${activeTab === idx ? 'text-white' : 'text-gray-400'}`}>{s.title}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase font-mono">{s.val}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Main Visualizer */}
            <div className="flex-1 p-8 relative flex items-center justify-center overflow-hidden">
               <AnimatePresence mode="wait">
                 <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-6 max-w-md z-10"
                 >
                   <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-500 shadow-xl shadow-blue-500/10">
                     {strategies[activeTab].icon}
                   </div>
                   <h4 className="text-3xl font-bold">{strategies[activeTab].title}</h4>
                   <p className="text-gray-400 text-lg leading-relaxed">{strategies[activeTab].desc}</p>
                   
                   <div className="pt-8">
                     <div className="text-xs text-gray-500 font-bold uppercase mb-4">权重调整系数</div>
                     <div className="flex items-center gap-4">
                       <span className="text-xs font-mono text-gray-500">0.0</span>
                       <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '75%' }}
                          className="h-full bg-blue-500 rounded-full" 
                        />
                         <div className="absolute right-[25%] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
                       </div>
                       <span className="text-xs font-mono text-blue-400">2.0</span>
                     </div>
                   </div>
                 </motion.div>
               </AnimatePresence>

               {/* Abstract Grid Elements */}
               <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-10">
                 {[...Array(96)].map((_, i) => (
                    <div key={i} className="border-[0.5px] border-white/20" />
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Floating Indicator */}
        <div className="absolute -bottom-6 -right-6 glass px-6 py-4 rounded-2xl border-2 border-blue-500/50 flex items-center gap-4">
          <div className="text-xs font-bold text-gray-400 uppercase">Algorithm Output Influenced by Human Strategy</div>
          <div className="text-blue-500 font-black">ACTIVE</div>
        </div>
      </div>
    </div>
  );
};

export default StrategyIntervention;
