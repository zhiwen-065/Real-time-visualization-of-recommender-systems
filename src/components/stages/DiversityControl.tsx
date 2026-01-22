import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Info, Heart, X } from 'lucide-react';

type Phase = 'optimize' | 'expand' | 'constrain';

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function uniqCount(arr: number[]) {
  return new Set(arr).size;
}

function diversityScore(typeIdxs: number[], interestSize: number) {
  const u = uniqCount(typeIdxs);
  // 兴趣资产越多，多样性更“可持续”
  return clamp(10 + (u - 1) * 12 + interestSize * 2, 10, 85);
}

function relevanceScore(
  typeIdxs: number[],
  interestSet: Set<number>,
  primary: number
) {
  const wPrimary = 1.0;
  const wInterest = 0.75;
  const wOther = 0.28;

  let sum = 0;
  for (const t of typeIdxs) {
    if (t === primary) sum += wPrimary;
    else if (interestSet.has(t)) sum += wInterest;
    else sum += wOther;
  }
  return clamp(Math.round((sum / typeIdxs.length) * 100), 70, 99);
}

const DiversityControl: React.FC = () => {
  const [seed, setSeed] = useState(0);
  const [exploreRatio, setExploreRatio] = useState(0.2);

  const primary = 0;
  const [interestSet, setInterestSet] = useState<Set<number>>(new Set());

  const phase: Phase = useMemo(() => {
    if (exploreRatio < 0.14) return 'optimize';
    if (exploreRatio < 0.24) return 'expand';
    return 'constrain';
  }, [exploreRatio]);

  const types = [
    { name: '登山徒步', emoji: '⛰️', grad: 'from-emerald-500/35 to-emerald-900/10' },
    { name: '户外装备', emoji: '🎒', grad: 'from-teal-500/30 to-teal-900/10' },
    { name: '露营生活', emoji: '⛺', grad: 'from-lime-500/30 to-lime-900/10' },
    { name: '路线攻略', emoji: '🗺️', grad: 'from-cyan-500/25 to-cyan-900/10' },
    { name: '自然人文', emoji: '🌍', grad: 'from-indigo-500/25 to-indigo-900/10' },
    { name: '轻户外', emoji: '🌿', grad: 'from-green-500/25 to-green-900/10' },
  ];

  const n = 12;
  const exploreSlots = clamp(Math.round(n * exploreRatio), 1, 5);

  const explorePositions = useMemo(() => {
    const base = [1, 3, 5, 8, 10, 11];
    return base.map(p => (p + seed) % n).slice(0, exploreSlots);
  }, [exploreSlots, seed]);

  const exploreSet = new Set(explorePositions);

  const neighborPool = useMemo(() => {
    const near = [3, 4, 5];
    const interests = Array.from(interestSet);
    const base = interests.length ? [...interests, ...near] : near;
    return exploreRatio < 0.24 ? base : [...base, 4, 5];
  }, [interestSet, exploreRatio]);

  const feed = useMemo(() => {
    const corePool =
      interestSet.size === 0
        ? [0, 0, 0, 1, 2]
        : [0, 0, ...Array.from(interestSet), 1, 2];

    const pick = (i: number) => {
      if (phase === 'optimize') {
        const gate = ((i * 17 + seed * 29) % 100) / 100;
        return gate < exploreRatio ? [1, 2][(i + seed) % 2] : 0;
      }

      if (phase === 'expand') {
        return exploreSet.has(i)
          ? neighborPool[(i + seed) % neighborPool.length]
          : corePool[(i + seed) % corePool.length];
      }

      const base = exploreSet.has(i)
        ? neighborPool[(i + seed) % neighborPool.length]
        : corePool[(i + seed) % corePool.length];

      if (i > 0 && base === corePool[(i - 1 + seed) % corePool.length]) {
        return neighborPool[(i + seed + 1) % neighborPool.length];
      }
      return base;
    };

    const items = Array.from({ length: n }).map((_, i) => {
      const t = pick(i);
      return {
        id: `${seed}-${i}`,
        typeIndex: t,
        isExplore: exploreSet.has(i) && phase !== 'optimize',
      };
    });

    return phase === 'constrain'
      ? items
          .map(i => ({ ...i, score: Math.random() }))
          .sort((a, b) => b.score - a.score)
      : items;
  }, [phase, seed, exploreSet, exploreRatio, interestSet, neighborPool]);

  const metrics = useMemo(() => {
    const typesInFeed = feed.map(f => f.typeIndex);
    return {
      relevance: relevanceScore(typesInFeed, interestSet, primary),
      diversity: diversityScore(typesInFeed, interestSet.size),
    };
  }, [feed, interestSet]);

  const systemNotes: Record<Phase, string[]> = {
    optimize: [
      '主要按预测收益排序，追求短期相关性最大化',
      '容易出现连续相似内容，发现性不足',
    ],
    expand: [
      '预留探索预算，注入语义邻近但不重复的内容',
      '依赖用户反馈判断是否扩充兴趣画像',
    ],
    constrain: [
      '在最终结果上施加形态约束，抑制过度重复',
      '在相关性与多样性之间保持整体平衡',
    ],
  };

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="glass p-6 rounded-3xl border border-white/10 space-y-4">
          <h2 className="text-2xl font-black text-white">
            {phase === 'optimize'
              ? '相关性优先'
              : phase === 'expand'
              ? '兴趣探索'
              : '结果约束'}
          </h2>

          {/* 三段颜色 slider */}
          <input
            type="range"
            min={0.05}
            max={0.35}
            step={0.01}
            value={exploreRatio}
            onChange={e => {
              setExploreRatio(parseFloat(e.target.value));
              setSeed(s => s + 1);
            }}
            className="w-full h-2 rounded-full bg-gradient-to-r from-blue-500/40 via-emerald-500/40 to-purple-500/40 accent-emerald-400"
          />
        </div>

        {/* Feed */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {feed.map((item, i) => {
            const t = types[item.typeIndex];
            return (
              <div
                key={item.id}
                className="relative h-[150px] rounded-2xl overflow-hidden border border-white/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${t.grad}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="text-xs font-bold">{t.name}</div>
                </div>

                {item.isExplore && phase === 'expand' && (
                  <button
                    onClick={() => {
                      setInterestSet(prev => new Set(prev).add(item.typeIndex));
                      setSeed(s => s + 1);
                    }}
                    className="absolute top-2 right-2 text-xs bg-emerald-500/20 px-2 py-1 rounded-full"
                  >
                    <Heart className="w-3 h-3 inline" /> Like
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Metrics */}
        <div className="glass p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between">
            <div>相关性指标</div>
            <div>{metrics.relevance}%</div>
          </div>
          <div className="flex justify-between">
            <div>多样性指标</div>
            <div>{metrics.diversity}%</div>
          </div>

          {interestSet.size > 0 && (
            <div className="text-xs text-emerald-300">
              已纳入兴趣画像：{[...interestSet].map(i => types[i].name).join('、')}
              <button
                onClick={() => setInterestSet(new Set())}
                className="ml-2 underline"
              >
                reset
              </button>
            </div>
          )}
        </div>

        {/* System Explanation */}
        <div className="glass p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="text-sm font-bold">这一步在系统里通常做什么</div>
          {systemNotes[phase].map((t, i) => (
            <div key={i} className="text-xs text-gray-400">
              • {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiversityControl;
