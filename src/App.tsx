
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Activity, 
  Database, 
  Layers, 
  Shuffle, 
  ShieldCheck, 
  RefreshCcw 
} from 'lucide-react';
import { StageType, STAGES } from './types';
import BehaviorCapture from './components/stages/BehaviorCapture';
import CandidateRetrieval from './components/stages/CandidateRetrieval';
import DeepRanking from './components/stages/DeepRanking';
import DiversityControl from './components/stages/DiversityControl';
import StrategyIntervention from './components/stages/StrategyIntervention';
import FeedbackLoop from './components/stages/FeedbackLoop';

const App: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const nextStage = useCallback(() => {
    setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
  }, []);

  const prevStage = useCallback(() => {
    setCurrentStage((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToStage = (index: number) => {
    setCurrentStage(index);
  };

  const renderStage = () => {
    switch (currentStage) {
      case StageType.BehaviorCapture: return <BehaviorCapture />;
      case StageType.CandidateRetrieval: return <CandidateRetrieval />;
      case StageType.DeepRanking: return <DeepRanking />;
      case StageType.DiversityControl: return <DiversityControl />;
      case StageType.StrategyIntervention: return <StrategyIntervention />;
      case StageType.FeedbackLoop: return <FeedbackLoop />;
      default: return null;
    }
  };

  const getStageIcon = (id: StageType) => {
    const props = { className: "w-5 h-5" };
    switch (id) {
      case StageType.BehaviorCapture: return <Activity {...props} />;
      case StageType.CandidateRetrieval: return <Database {...props} />;
      case StageType.DeepRanking: return <Layers {...props} />;
      case StageType.DiversityControl: return <Shuffle {...props} />;
      case StageType.StrategyIntervention: return <ShieldCheck {...props} />;
      case StageType.FeedbackLoop: return <RefreshCcw {...props} />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030712] text-white font-sans">
      <AnimatePresence>
        {showTitle && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-10 text-center"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-6xl md:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500"
            >
              当你刷短视频的1秒<br/>
              推荐算法在后台疯狂忙啥？
            </motion.h1>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 300 }}
              transition={{ delay: 1, duration: 1 }}
              className="h-1 bg-blue-600 rounded-full mb-8"
            />
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-gray-500 font-mono tracking-widest text-xl"
            >
              短视频推荐系统全链路可视化解析
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Cinematic Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[160px]" 
        />
      </div>

      {/* Header Navigation */}
      <header className="absolute top-0 left-0 w-full p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center z-50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
            <Play className="fill-white ml-1" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">推荐系统实战演示</h2>
            <p className="text-xs text-blue-500 font-mono font-bold tracking-[0.3em] uppercase opacity-70">Personal Lecture - 2025 Edition</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 glass p-1 rounded-2xl">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => goToStage(idx)}
              className={`transition-all duration-500 flex items-center gap-2 px-4 py-2 rounded-xl group ${
                currentStage === idx ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <div className={`${currentStage === idx ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`}>
                {getStageIcon(s.id)}
              </div>
              <span className="text-sm font-bold hidden xl:inline">{s.title}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Stage Container */}
      <main className="w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex flex-col items-center justify-center pt-24 pb-32"
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mathematical Overlay / Lecture Notes */}
      <div className="absolute bottom-12 left-96 z-50 pointer-events-none">
        <motion.div
          key={STAGES[currentStage].formula}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl font-mono text-sm"
        >
          <div className="text-blue-500 font-bold mb-1 opacity-70">ALGORITHM LOGIC:</div>
          <div className="text-gray-100">{STAGES[currentStage].formula}</div>
        </motion.div>
      </div>

      {/* Footer Branding & Controls */}
      <footer className="absolute bottom-0 left-0 w-full p-12 flex justify-between items-end z-50 pointer-events-none">
        <div className="max-w-xl pointer-events-auto">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
               <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded tracking-widest">STAGE 0{currentStage + 1}</span>
               <div className="h-px w-24 bg-blue-600/30" />
            </div>
            <h3 className="text-5xl font-black text-white">{STAGES[currentStage].title}</h3>
            <p className="text-gray-400 text-lg leading-relaxed max-w-lg">{STAGES[currentStage].description}</p>
          </motion.div>
        </div>

        <div className="flex gap-4 pointer-events-auto">
          <button
            onClick={prevStage}
            disabled={currentStage === 0}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all border ${
              currentStage === 0 ? 'opacity-20 border-white/5 grayscale pointer-events-none' : 'glass border-white/10 hover:bg-white/10 active:scale-90 hover:border-blue-500/50'
            }`}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={nextStage}
            disabled={currentStage === STAGES.length - 1}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              currentStage === STAGES.length - 1 ? 'opacity-20 glass border-white/5 pointer-events-none' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-2xl shadow-blue-500/30'
            }`}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </footer>

      {/* Stage Progress Pills */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
        {STAGES.map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: currentStage === i ? 40 : 10,
              backgroundColor: currentStage === i ? '#2563eb' : '#374151'
            }}
            className="w-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};

export default App;
