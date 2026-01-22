import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Compass, Sparkles, Info, CheckCircle2, XCircle } from 'lucide-react';

type ItemKind = 'core' | 'neighbor' | 'random';

type VideoType = {
  key: string;
  name: string;
  color: string; // tailwind class
  icon: string;
};

type FeedItem = {
  id: string;
  kind: ItemKind;
  type: VideoType;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const DiversityControl: React.FC = () => {
  // === 1) 演示核心：你“真正喜欢”的兴趣（核心兴趣资产）
  const [portfolio, setPortfolio] = useState<string[]>(['登山/徒步']);

  // === 2) 探索比例：不推“最不喜欢”，而是推“相对没那么高但底层相似”的一段
  const [exploreRatio, setExploreRatio] = useState(0.15); // 15%
  const [cycle, setCycle] = useState(0); // 每轮刷新一次 feed

  // === 3) 演示探索是否“命中”并回流为兴趣资产
  const [lastExploreHit, setLastExploreHit] = useState<boolean | null>(null);
  const [newAsset, setNewAsset] = useState<string | null>(null);

  // === 内容池：你可以随便换成你讲座里的品类词
  const coreTypes: VideoType[] = [
    { key: 'hike', name: '登山徒步', color: 'bg-green-500', icon: '⛰️' },
    { key: 'gear', name: '户外装备', color: 'bg-emerald-500', icon: '🎒' },
    { key: 'trail', name: '路线攻略', color: 'bg-teal-500', icon: '🗺️' },
  ];

  // 相邻兴趣：和“登山”不直接等价，但底层特征相似（户外、自然、探索、长内容）
  const neighborTypes: VideoType[] = [
    { key: 'geo', name: '国家地理', color: 'bg-indigo-500', icon: '🌍' },
    { key: 'wild', name: '自然纪录片', color: 'bg-blue-500', icon: '🦌' },
    { key: 'water', name: '户外水域', color: 'bg-cyan-500', icon: '🏊' },
    { key: 'camp', name: '露营生活', color: 'bg-lime-500', icon: '🏕️' },
  ];

  // “随机低相关”：这里用来对比说明“探索≠乱推”
  const randomTypes: VideoType[] = [
    { key: 'makeup', name: '美妆穿搭', color: 'bg-pink-500', icon: '👗' },
    { key: 'food', name: '美食探店', color: 'bg-orange-500', icon: '🍔' },
    { key: 'finance', name: '财经资讯', color: 'bg-yellow-500', icon: '💰' },
  ];

  // === 每 4.5 秒自动跑一轮：生成新 feed，并模拟一次探索是否命中
  useEffect(() => {
    const timer = setInterval(() => setCycle((c) => c + 1), 4500);
    return () => clearInterval(timer);
  }, []);

  // === 核心：一轮推荐（12 条），按 exploreRatio 分配：核心 + 相邻探索 + 极少随机
  const feed: FeedItem[] = useMemo(() => {
    const total = 12;

    // 探索条数：来自 neighborTypes（相邻兴趣探索）
    const exploreCount = Math.max(1, Math.round(total * exploreRatio));

    // 随机低相关条数：保持很小，用来强调“我们不是乱推”
    const randomCount = Math.min(1, Math.floor(total * 0.05));

    // 核心条数：剩余为核心兴趣
    const coreCount = total - exploreCount - randomCount;

    const items: FeedItem[] = [];

    for (let i = 0; i < coreCount; i++) {
      const t = coreTypes[i % coreTypes.length];
      items.push({ id: `core-${cycle}-${i}`, kind: 'core', type: t });
    }

    for (let i = 0; i < exploreCount; i++) {
      const t = neighborTypes[(i + cycle) % neighborTypes.length];
      items.push({ id: `nei-${cycle}-${i}`, kind: 'neighbor', type: t });
    }

    for (let i = 0; i < randomCount; i++) {
      const t = randomTypes[(i + cycle) % randomTypes.length];
      items.push({ id: `rnd-${cycle}-${i}`, kind: 'random', type: t });
    }

    // 打散（重排）而不是全随机：核心/探索穿插
    // 简单交错：把 neighbor 插入到 core 的缝里
    const mixed: FeedItem[] = [];
    let c = 0, e = 0, r = 0;
    const cores = items.filter(x => x.kind === 'core');
    const explores = items.filter(x => x.kind === 'neighbor');
    const randoms = items.filter(x => x.kind === 'random');

    while (mixed.length < total) {
      if (c < cores.length) mixed.push(cores[c++]);
      if (e < explores.length) mixed.push(explores[e++]);
      if (r < randoms.length) mixed.push(randoms[r++]);
    }

    return mixed.slice(0, total);
  }, [cycle, exploreRatio]);

  // === 每轮模拟探索是否命中：命中则把“相邻兴趣”加入 portfolio（兴趣资产扩充）
  useEffect(() => {
    // 命中概率：探索越多，命中可能略升，但也不是线性（只是演示用）
    const hitProb = clamp01(0.35 + exploreRatio * 1.2); // 约 0.53 (15%) ~ 0.95 (50%)
    const hit = Math.random() < hitProb;

    setLastExploreHit(hit);

    if (hit) {
      // 从 neighborTypes 里挑一个“新增资产”
      const pick = neighborTypes[cycle % neighborTypes.length].name;

      // 如果已经有了，就换一个
      const fallback = neighborTypes[(cycle + 1) % neighborTypes.length].name;
      const add = portfolio.includes(pick) ? fallback : pick;

      setNewAsset(add);

      // 延迟一点让动画更明显
      const t = setTimeout(() => {
        setPortfolio((p) => (p.includes(add) ? p : [...p, add]));
      }, 700);

      return () => clearTimeout(t);
    } else {
      setNewAsset(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  // === 面板指标：精准 vs 生态（演示用）
  const accuracy = Math.round(98 - exploreRatio * 18); // 探索越高，精准略降
  const diversity = Math.round(12 + exploreRatio * 160); // 探索越高，多样性显著升

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-6xl w-full space-y-10">
        {/* Header: 从“同质化死局”切到“探索-扩充-回流” */}
        <div className="flex flex-col items-center gap-5">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono tracking-widest uppercase text-gray-500">diversity & exploration</div>
            <div className="text-4xl font-black text-white">多样性重排：探索如何扩充你的兴趣资产</div>
            <div className="text-sm text-gray-400 max-w-3xl">
              推荐不只是“更懂你”，也要避免把你锁死在同一类内容里。探索不是推你讨厌的，
              而是推<strong className="text-gray-200">“相对没那么高、但底层相似”</strong>的一段内容。
            </div>
          </div>

          {/* Explore ratio slider */}
          <div className="w-full max-w-xl glass rounded-2xl border border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-200 text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                探索比例（Explore Ratio）
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                {Math.round(exploreRatio * 100)}%
              </div>
            </div>

            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={exploreRatio}
              onChange={(e) => setExploreRatio(parseFloat(e.target.value))}
              className="w-full mt-3"
            />

            <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
              这里的探索来自 <span className="text-cyan-300 font-bold">相邻兴趣</span>（底层特征相似），
              <span className="text-gray-300">不是</span>从你最不喜欢的内容里硬塞。
            </div>
          </div>

          {/* Explore outcome */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${cycle}-${String(lastExploreHit)}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-sm"
            >
              {lastExploreHit ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">
                    探索命中：用户对相邻兴趣表现出高兴趣 → 归入兴趣资产
                    {newAsset ? <span className="text-white font-bold">（+ {newAsset}）</span> : null}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300">
                    探索未命中：本轮相邻兴趣反馈一般 → 下轮继续小比例探索
                  </span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interest Portfolio */}
        <div className="glass p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono tracking-widest uppercase text-gray-500">interest portfolio</div>
              <div className="text-lg font-black text-white mt-1">你的兴趣资产（会被不断扩充）</div>
            </div>
            <div className="text-[11px] font-mono text-gray-400">
              assets: {portfolio.length}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {portfolio.map((p) => (
              <span
                key={p}
                className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm text-gray-200"
              >
                {p}
              </span>
            ))}

            <AnimatePresence>
              {newAsset && lastExploreHit && !portfolio.includes(newAsset) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-sm text-green-200"
                >
                  + {newAsset}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feed Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 relative">
          <AnimatePresence mode="popLayout">
            {feed.map((item, idx) => {
              const badge =
                item.kind === 'core'
                  ? { text: '核心兴趣', cls: 'bg-white/10 text-gray-200 border-white/10' }
                  : item.kind === 'neighbor'
                  ? { text: '相邻探索', cls: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30' }
                  : { text: '低相关', cls: 'bg-red-500/10 text-red-200 border-red-500/30' };

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, delay: idx * 0.03 }}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                >
                  <div className={`absolute inset-0 ${item.type.color} opacity-40`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="text-4xl filter drop-shadow-lg">{item.type.icon}</span>
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter opacity-80">
                      {item.type.name}
                    </span>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>

                  {/* If random, show warning overlay to emphasize "this is NOT what we mainly do" */}
                  {item.kind === 'random' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-red-900/35 backdrop-blur-[1px] flex items-center justify-center p-2 text-center"
                    >
                      <div className="border border-red-500/60 bg-black/40 px-2 py-1 rounded rotate-[-6deg]">
                        <span className="text-[10px] font-black text-red-300 uppercase tracking-tighter">
                          探索 ≠ 乱推
                        </span>
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
                <span className="text-2xl font-black text-white">{accuracy}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${accuracy}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
              <p className="text-[10px] text-gray-500">历史兴趣拟合程度（探索越多，短期精准可能略降）</p>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-xs font-black uppercase tracking-widest">生态健康 (Diversity)</span>
                <span className="text-2xl font-black text-white">{diversity}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${diversity}%` }}
                  className="h-full bg-green-500"
                />
              </div>
              <p className="text-[10px] text-gray-500">品类丰富度、长尾覆盖、内容发现性（探索越多越好）</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="p-2 bg-blue-600/20 rounded-lg mt-0.5">
              <Info className="text-blue-400 w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              多样性并不只是“打散标签”，而是一个<strong className="text-gray-200">探索-反馈-回流</strong>的闭环：
              通过小比例引入相邻兴趣，若反馈好就扩充兴趣资产；同时持续保留探索比例，形成良性循环。
              这是推荐系统<strong className="text-gray-200">多目标平衡</strong>的一部分。
            </p>
          </div>

          {/* Small legend */}
          <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">
            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">核心兴趣</span>
            <span className="px-2 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">相邻探索</span>
            <span className="px-2 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-200">低相关（对比用）</span>
            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5 flex items-center gap-1 text-gray-300">
              <Sparkles className="w-3 h-3" /> 探索命中 → 兴趣资产 +1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiversityControl;
