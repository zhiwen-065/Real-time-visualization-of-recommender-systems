import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Sparkles,
  TrendingUp,
  Filter,
  Gauge,
  ShieldCheck,
  Clock,
  Database,
  Zap,
  Info,
  RotateCcw,
} from 'lucide-react';

type ChannelKey = 'cf' | 'ann' | 'hot' | 'follow' | 'fresh';

type Candidate = {
  id: string;
  title: string;
  creator: string;
  topic: string; // 用于多样性/去重展示
  ageH: number; // 0~72
  source: ChannelKey;
  score: number; // 0~100（示意）
  reasons: string[];
  flags: {
    coldStart: boolean; // 新作者/新内容
    safeRisk: 'low' | 'mid' | 'high';
    dupGroup?: string; // 近重复簇
  };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

const pick = <T,>(arr: T[], idx: number) => arr[(idx + arr.length) % arr.length];

const CandidateRetrieval: React.FC = () => {
  // ========== 控制参数（演示：像 Stage4/5 一样“可解释 + 可控”） ==========
  const [seed, setSeed] = useState(0);

  // 探索预算：越大，越愿意引入新/热/关注流；越小，越偏向稳定高相关
  const [exploreBudget, setExploreBudget] = useState(0.22); // 0.05~0.45
  // 并发通道数：影响“吞吐与尾延迟”，也影响召回覆盖面（示意）
  const [parallelism, setParallelism] = useState(6); // 3~10
  // 新鲜度要求：越大越偏向近期内容（示意）
  const [freshBias, setFreshBias] = useState(0.35); // 0~1
  // 安全/合规阈值：越严格，过滤越多（示意）
  const [safetyLevel, setSafetyLevel] = useState(0.55); // 0~1

  // 用户画像（示意）
  const user = useMemo(
    () => ({
      primaryTopic: '登山徒步',
      recentActions: ['watch:路线攻略', 'like:轻户外', 'skip:城市漫游'],
      locale: '北京',
      timeOfDay: 'night',
    }),
    []
  );

  // 动态时钟：让“实时系统感”更强
  const [t, setT] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setT((x) => x + 1), 250);
    return () => clearInterval(tick);
  }, []);

  // ========== 召回规模（示意） ==========
  // 从“总库”到“粗过滤后候选”再到“最终召回并集”到“去重/过滤后”一层层收敛
  const totalLibrary = 100_000_000;
  const rawRecallBase = 2400;
  const rawRecall = useMemo(() => {
    // 并发越高/探索越大 -> raw recall 更大；安全越严 -> raw recall 更小
    const p = (parallelism - 3) / (10 - 3); // 0..1
    const raw = rawRecallBase * (0.75 + p * 0.55 + exploreBudget * 0.7) * (1 - safetyLevel * 0.18);
    return Math.round(clamp(raw, 1200, 5200));
  }, [parallelism, exploreBudget, safetyLevel]);

  // ========== 通道定义 ==========
  const channels = useMemo(
    () =>
      [
        {
          key: 'cf' as const,
          name: '协同过滤 (CF)',
          short: 'CF',
          icon: <Users className="w-5 h-5 text-blue-400" />,
          desc: '基于相似用户/相似内容的共现统计，快速补齐“可解释的相似性”。',
          strengths: ['稳定、覆盖面广', '对热门内容友好'],
          risks: ['易放大流行偏好', '对冷启动弱'],
          color: 'blue',
        },
        {
          key: 'ann' as const,
          name: '向量召回 (ANN)',
          short: 'ANN',
          icon: <Sparkles className="w-5 h-5 text-purple-400" />,
          desc: '通过 embedding 近邻检索，从语义空间捕捉“隐式兴趣”。',
          strengths: ['相关性强', '跨主题泛化'],
          risks: ['近似误差/漂移', '需要去重与校准'],
          color: 'purple',
        },
        {
          key: 'hot' as const,
          name: '热点发现',
          short: 'HOT',
          icon: <TrendingUp className="w-5 h-5 text-cyan-300" />,
          desc: '基于实时趋势与爆发信号，对高热内容进行保底召回。',
          strengths: ['时效性强', '帮助破圈'],
          risks: ['噪声大', '需要更强过滤'],
          color: 'cyan',
        },
        {
          key: 'follow' as const,
          name: '关注/订阅召回',
          short: 'FOLLOW',
          icon: <Filter className="w-5 h-5 text-emerald-300" />,
          desc: '从关注关系与订阅源中直接拉取候选，保证“关系链确定性”。',
          strengths: ['高确定性', '更可控'],
          risks: ['同温层风险', '覆盖有限'],
          color: 'emerald',
        },
        {
          key: 'fresh' as const,
          name: '新内容补充',
          short: 'FRESH',
          icon: <Zap className="w-5 h-5 text-yellow-300" />,
          desc: '为冷启动与新供给预留曝光入口，避免只推荐“旧世界”。',
          strengths: ['扶持新作者', '提高供给多样性'],
          risks: ['质量波动', '需要更强校验'],
          color: 'yellow',
        },
      ] as const,
    []
  );

  // ========== 通道权重（示意） ==========
  // “探索预算”影响 HOT/FRESH/FOLLOW 占比；“新鲜度偏好”影响 ageH/新内容；“安全等级”影响过滤强度
  const channelWeights = useMemo(() => {
    // 归一化后再分配
    const wCF = clamp(0.42 - exploreBudget * 0.25, 0.18, 0.5);
    const wANN = clamp(0.38 + exploreBudget * 0.05, 0.25, 0.5);
    const wHOT = clamp(0.08 + exploreBudget * 0.22, 0.06, 0.32);
    const wFOLLOW = clamp(0.06 + exploreBudget * 0.12, 0.05, 0.22);
    const wFRESH = clamp(0.06 + exploreBudget * 0.18, 0.05, 0.28);

    const sum = wCF + wANN + wHOT + wFOLLOW + wFRESH;
    return {
      cf: wCF / sum,
      ann: wANN / sum,
      hot: wHOT / sum,
      follow: wFOLLOW / sum,
      fresh: wFRESH / sum,
    };
  }, [exploreBudget]);

  // 通道召回条数（示意）
  const perChannel = useMemo(() => {
    const alloc = (w: number) => Math.max(120, Math.round(rawRecall * w));
    return {
      cf: alloc(channelWeights.cf),
      ann: alloc(channelWeights.ann),
      hot: alloc(channelWeights.hot),
      follow: alloc(channelWeights.follow),
      fresh: alloc(channelWeights.fresh),
    };
  }, [rawRecall, channelWeights]);

  // ========== 候选生成（示意数据） ==========
  const topics = useMemo(
    () => [
      '登山徒步',
      '户外装备',
      '露营生活',
      '路线攻略',
      '自然人文',
      '轻户外',
      '摄影纪实',
      '科学科普',
      '城市漫游',
    ],
    []
  );
  const creators = useMemo(
    () => ['Z-Outdoor', 'PeakLab', 'WildCamp', 'RouteNote', 'GeoStory', 'LiteHike', 'LensWalk', 'SciDaily', 'CityRoam'],
    []
  );

  // 近重复簇：模拟“同素材多次分发/搬运/切片”
  const dupGroups = useMemo(() => ['G1', 'G2', 'G3', 'G4'], []);

  const genCandidate = (idx: number, source: ChannelKey): Candidate => {
    const topicBase = (() => {
      // 让不同通道倾向不同主题（更贴近“通道语义”）
      if (source === 'cf') return pick([0, 3, 1, 5, 2, 4], idx);
      if (source === 'ann') return pick([0, 4, 3, 6, 7, 1, 2], idx);
      if (source === 'hot') return pick([7, 8, 6, 4, 3, 0], idx);
      if (source === 'follow') return pick([0, 1, 3, 2], idx);
      return pick([6, 7, 8, 5, 2], idx); // fresh
    })();

    // 新鲜度：freshBias 越大，age 更小（更新）
    const age = clamp(
      Math.round(72 * (1 - freshBias) * 0.65 + (idx * 7 + seed * 3) % 48),
      0,
      72
    );

    // 冷启动：fresh 通道更高概率
    const coldStart =
      source === 'fresh'
        ? ((idx + seed) % 3 === 0)
        : source === 'hot'
          ? ((idx + seed) % 9 === 0)
          : ((idx + seed) % 18 === 0);

    // 安全风险：hot / fresh 更高概率出现“需要过滤”的候选（示意）
    const safeRisk: Candidate['flags']['safeRisk'] =
      source === 'hot' || source === 'fresh'
        ? ((idx + seed) % 7 === 0 ? 'high' : (idx + seed) % 3 === 0 ? 'mid' : 'low')
        : (idx + seed) % 11 === 0
          ? 'mid'
          : 'low';

    // 近重复：ann/hot 更容易产生相似素材聚集（示意）
    const dupGroup =
      source === 'ann' || source === 'hot'
        ? ((idx + seed) % 4 === 0 ? dupGroups[(idx + seed) % dupGroups.length] : undefined)
        : (idx + seed) % 13 === 0
          ? dupGroups[(idx + seed) % dupGroups.length]
          : undefined;

    // 分数：只是“召回侧相关性/质量”粗分（不是精排分）
    // 让 CF/ANN 更稳定，HOT/FRESH 更波动
    const base =
      source === 'cf'
        ? 68
        : source === 'ann'
          ? 72
          : source === 'follow'
            ? 70
            : source === 'hot'
              ? 60
              : 58;

    const topicBoost = topics[topicBase] === user.primaryTopic ? 10 : topics[topicBase] === '路线攻略' ? 7 : 0;
    const agePenalty = Math.min(18, Math.round(age * 0.22)); // 越旧越扣（示意）
    const noise = Math.sin((idx + seed) * 1.7 + t / 4) * (source === 'hot' ? 9 : source === 'fresh' ? 10 : 5);

    const score = clamp(Math.round(base + topicBoost - agePenalty + noise), 1, 99);

    const reasons: string[] = [];
    if (source === 'cf') reasons.push('相似人群共现', '相似视频共看');
    if (source === 'ann') reasons.push('语义近邻匹配', '兴趣向量相近');
    if (source === 'hot') reasons.push('实时趋势上升', '热度信号增强');
    if (source === 'follow') reasons.push('关注关系触发', '订阅源更新');
    if (source === 'fresh') reasons.push('新供给补充', '冷启动曝光窗口');

    if (topics[topicBase] === user.primaryTopic) reasons.push('主兴趣强相关');
    if (age <= 6) reasons.push('新鲜度较高');
    if (coldStart) reasons.push('新作者/新内容');
    if (dupGroup) reasons.push('可能存在近重复');

    return {
      id: `${source}-${idx}-${seed}`,
      title: `${topics[topicBase]} · 候选片段 ${idx + 1}`,
      creator: creators[(idx + seed) % creators.length],
      topic: topics[topicBase],
      ageH: age,
      source,
      score,
      reasons: reasons.slice(0, 4),
      flags: { coldStart, safeRisk, dupGroup },
    };
  };

  const rawCandidates = useMemo(() => {
    const build = (source: ChannelKey, count: number) => Array.from({ length: count }).map((_, i) => genCandidate(i, source));
    return [
      ...build('cf', perChannel.cf),
      ...build('ann', perChannel.ann),
      ...build('hot', perChannel.hot),
      ...build('follow', perChannel.follow),
      ...build('fresh', perChannel.fresh),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perChannel, seed, t, freshBias]);

  // ========== 过滤 + 去重（贴近“召回后处理”） ==========
  const post = useMemo(() => {
    // 1) 安全过滤：阈值越严格，过滤越多
    const allowRisk = (r: Candidate['flags']['safeRisk']) => {
      if (safetyLevel >= 0.75) return r === 'low';
      if (safetyLevel >= 0.45) return r !== 'high';
      return true;
    };

    const filtered = rawCandidates.filter((c) => allowRisk(c.flags.safeRisk));

    // 2) 近重复去重：同 dupGroup 只留 score 最高的前 N（示意）
    const keepPerDupGroup = safetyLevel >= 0.65 ? 1 : safetyLevel >= 0.45 ? 2 : 3;
    const byGroup = new Map<string, Candidate[]>();
    const noGroup: Candidate[] = [];

    for (const c of filtered) {
      if (!c.flags.dupGroup) noGroup.push(c);
      else {
        const arr = byGroup.get(c.flags.dupGroup) ?? [];
        arr.push(c);
        byGroup.set(c.flags.dupGroup, arr);
      }
    }

    const dedup: Candidate[] = [];
    byGroup.forEach((arr) => {
      arr.sort((a, b) => b.score - a.score);
      dedup.push(...arr.slice(0, keepPerDupGroup));
    });
    dedup.push(...noGroup);

    // 3) 粗排：召回侧 score + 轻微“新鲜度/探索”校正
    const exploreBoost = exploreBudget * 10;
    const ranked = [...dedup]
      .map((c) => {
        const freshBoost = (1 - c.ageH / 72) * (freshBias * 10);
        const channelAdj =
          c.source === 'hot' ? exploreBoost * 0.65 : c.source === 'fresh' ? exploreBoost * 0.8 : c.source === 'follow' ? exploreBoost * 0.25 : 0;
        const final = clamp(Math.round(c.score + freshBoost + channelAdj), 1, 99);
        return { ...c, score: final };
      })
      .sort((a, b) => b.score - a.score);

    // 4) 截断：最终召回并集（进入后续“精排打分”）
    const takeN = clamp(Math.round(1800 * (0.65 + exploreBudget * 0.55)), 900, 2600);
    const final = ranked.slice(0, takeN);

    // 统计
    const countBy = (key: ChannelKey) => final.filter((x) => x.source === key).length;
    const uniqTopics = new Set(final.map((x) => x.topic)).size;

    return {
      filteredN: filtered.length,
      dedupN: dedup.length,
      finalN: final.length,
      uniqTopics,
      byChannel: {
        cf: countBy('cf'),
        ann: countBy('ann'),
        hot: countBy('hot'),
        follow: countBy('follow'),
        fresh: countBy('fresh'),
      },
      list: final,
    };
  }, [rawCandidates, safetyLevel, exploreBudget, freshBias]);

  // ========== 交互：选中候选，解释“来自哪个通道 + 为什么进来” ==========
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => post.list.find((x) => x.id === activeId) ?? post.list[0], [post.list, activeId]);

  // 自动轮播一个 active（让页面更“活”）
  useEffect(() => {
    if (!post.list.length) return;
    const id = setInterval(() => {
      const idx = Math.floor(((Date.now() / 1200) % 1) * Math.min(40, post.list.length));
      setActiveId(post.list[idx].id);
    }, 1800);
    return () => clearInterval(id);
  }, [post.list]);

  // ========== 延迟 / 吞吐（示意） ==========
  const latency = useMemo(() => {
    // 并发越高 -> p50 下降，但 p99 可能上升（尾延迟/资源争抢）——这里只做示意
    const p = (parallelism - 3) / 7;
    const p50 = clamp(28 - p * 10 + (safetyLevel - 0.5) * 3 + Math.sin(t / 6) * 1.2, 16, 40);
    const p99 = clamp(95 - p * 8 + (safetyLevel - 0.5) * 10 + Math.cos(t / 5) * 4.5, 55, 150);
    const qps = clamp(1200 + parallelism * 280 - safetyLevel * 240, 800, 4200);
    return { p50: round1(p50), p99: round1(p99), qps: Math.round(qps) };
  }, [parallelism, safetyLevel, t]);

  // ========== UI 小组件 ==========
  const Pill = ({ tone, children }: { tone?: 'blue' | 'purple' | 'cyan' | 'emerald' | 'yellow' | 'gray'; children: React.ReactNode }) => {
    const cls =
      tone === 'blue'
        ? 'border-blue-400/20 bg-blue-500/10 text-blue-200'
        : tone === 'purple'
          ? 'border-purple-400/20 bg-purple-500/10 text-purple-200'
          : tone === 'cyan'
            ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
            : tone === 'emerald'
              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
              : tone === 'yellow'
                ? 'border-yellow-300/20 bg-yellow-400/10 text-yellow-100'
                : 'border-white/10 bg-white/5 text-gray-200';
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${cls}`}>{children}</span>;
  };

  const SectionTitle = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-sm font-black text-gray-200">{title}</div>
          {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );

  // ========== 三段颜色 slider ==========
  const stops = useMemo(() => {
    // 0.05~0.45
    const t1 = ((0.18 - 0.05) / (0.45 - 0.05)) * 100;
    const t2 = ((0.30 - 0.05) / (0.45 - 0.05)) * 100;
    return { t1, t2 };
  }, []);
  const sliderBg = useMemo(() => {
    const { t1, t2 } = stops;
    return `linear-gradient(90deg,
      rgba(59,130,246,0.85) 0%,
      rgba(59,130,246,0.85) ${t1}%,
      rgba(16,185,129,0.85) ${t1}%,
      rgba(16,185,129,0.85) ${t2}%,
      rgba(168,85,247,0.85) ${t2}%,
      rgba(168,85,247,0.85) 100%
    )`;
  }, [stops]);

  const explain = useMemo(() => {
    // 解释语句尽量严谨，不出现“讲座”字样
    const phase = exploreBudget < 0.18 ? '稳定召回' : exploreBudget < 0.30 ? '探索增强' : '覆盖扩展';
    const bullets =
      phase === '稳定召回'
        ? [
            '• 召回更偏向 CF/ANN：保证相关性与稳定性，降低噪声。',
            '• HOT/FRESH 占比更小：避免短期趋势对结果形态产生过强扰动。',
          ]
        : phase === '探索增强'
          ? [
              '• 在不显著牺牲相关性的前提下，增加热点与新供给占比。',
              '• 去重与安全过滤会更关键：防止“相似素材堆叠”与风险候选进入后续链路。',
            ]
          : [
              '• 更强调覆盖与发现：更多通道并行、更大的候选并集。',
              '• 需要更强后处理：去重、过滤、截断与后续精排共同稳定输出。',
            ];

    return { phase, bullets };
  }, [exploreBudget]);

  // ========== 背景粒子（更克制，避免影响阅读） ==========
  const bgNodes = useMemo(() => Array.from({ length: 46 }).map((_, i) => i), []);
  const rngRef = useRef<number>(Math.random());

  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{`
        .range3 {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          background: transparent;
          outline: none;
        }
        .range3::-webkit-slider-runnable-track {
          height: 12px;
          background: transparent;
          border-radius: 9999px;
        }
        .range3::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: rgba(16,185,129,1);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 20px rgba(16,185,129,0.35);
          margin-top: -3px;
          cursor: pointer;
        }
        .range3::-moz-range-track {
          height: 12px;
          background: transparent;
          border-radius: 9999px;
        }
        .range3::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: rgba(16,185,129,1);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 20px rgba(16,185,129,0.35);
          cursor: pointer;
        }
      `}</style>

      {/* Subtle Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {bgNodes.map((i) => (
          <motion.div
            key={i}
            initial={{
              x: (Math.sin(i * 13.7 + rngRef.current) * 0.5 + 0.5) * 1400 - 700,
              y: (Math.cos(i * 9.2 + rngRef.current) * 0.5 + 0.5) * 900 - 450,
              opacity: 0,
              scale: 0.6,
            }}
            animate={{
              x: (Math.sin((i + t / 40) * 13.7 + rngRef.current) * 0.5 + 0.5) * 1400 - 700,
              y: (Math.cos((i + t / 45) * 9.2 + rngRef.current) * 0.5 + 0.5) * 900 - 450,
              opacity: [0, 0.7, 0],
              scale: [0.5, 1.0, 0.6],
            }}
            transition={{ duration: 18 + (i % 9), repeat: Infinity, ease: 'linear', delay: (i % 10) * 0.3 }}
            className="absolute"
          >
            <div className="w-20 h-28 bg-blue-500/10 rounded-xl border border-white/5 backdrop-blur-sm" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full h-full px-6 md:px-10 py-8">
        <div className="w-full max-w-[1600px] mx-auto">
          <div className="glass rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-7 md:px-10 py-6 border-b border-white/10 bg-white/[0.02] space-y-5">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div className="space-y-2">
                  <div className="text-[11px] font-black tracking-[0.22em] text-gray-500 uppercase">
                    Stage 02 · Candidate Retrieval
                  </div>

                  <div className="flex items-center gap-3">
                    <Pill tone="blue">
                      <span className="inline-flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" />
                        Multi-Channel Recall
                      </span>
                    </Pill>

                    <Pill tone="gray">并集召回 · 去重 · 过滤 · 截断</Pill>
                  </div>

                  <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                    从大规模库中快速构建“可用于排序”的候选集合
                  </div>

                  <div className="text-sm text-gray-400 leading-relaxed max-w-[1000px]">
                    召回阶段的目标不是给出最终顺序，而是在<strong className="text-gray-200">严格时延预算</strong>下，
                    用多路信号构建足够覆盖的候选并集，并通过<strong className="text-gray-200">过滤与去重</strong>把噪声与风险控制在可接受范围内。
                  </div>
                </div>

                {/* Live Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" />
                      Total Library
                    </div>
                    <div className="mt-1 text-xl font-black text-white">{fmtK(totalLibrary)}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      Raw Recall
                    </div>
                    <div className="mt-1 text-xl font-black text-white">{fmtK(rawRecall)}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Latency p50/p99
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {latency.p50} / {latency.p99} <span className="text-[12px] text-gray-400 font-mono">ms</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5" />
                      Throughput
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {fmtK(latency.qps)} <span className="text-[12px] text-gray-400 font-mono">qps</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="glass rounded-2xl border border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">探索预算（演示参数）</div>
                    <div className="text-[11px] font-mono text-gray-400">{(exploreBudget * 100).toFixed(0)}%</div>
                  </div>

                  <div className="mt-3">
                    <div className="relative w-full">
                      <div className="h-[12px] rounded-full" style={{ backgroundImage: sliderBg }} />
                      <input
                        type="range"
                        min={0.05}
                        max={0.45}
                        step={0.01}
                        value={exploreBudget}
                        onChange={(e) => {
                          setExploreBudget(parseFloat(e.target.value));
                          setSeed((s) => s + 1);
                        }}
                        className="range3 absolute inset-0"
                        aria-label="explore budget"
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                      <span>稳定召回</span>
                      <span>探索增强</span>
                      <span>覆盖扩展</span>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">
                      当前模式：<span className="text-gray-200 font-bold">{explain.phase}</span>
                      <div className="mt-1 space-y-1">
                        {explain.bullets.map((b, i) => (
                          <div key={i}>{b}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl border border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">并发通道数（演示参数）</div>
                    <div className="text-[11px] font-mono text-gray-400">{parallelism}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min={3}
                      max={10}
                      step={1}
                      value={parallelism}
                      onChange={(e) => {
                        setParallelism(parseInt(e.target.value, 10));
                        setSeed((s) => s + 1);
                      }}
                      className="w-full"
                    />
                    <button
                      onClick={() => setParallelism(6)}
                      className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 text-[11px] text-gray-300 hover:bg-white/10 transition"
                      title="reset"
                    >
                      reset
                    </button>
                  </div>

                  <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
                    并发提升通常能降低平均时延，但也可能增加尾延迟。此处用 p50/p99 做直观对比（示意）。
                  </div>
                </div>

                <div className="glass rounded-2xl border border-white/10 px-5 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black tracking-widest uppercase text-gray-500">新鲜度偏好 / 安全阈值</div>
                    <button
                      onClick={() => {
                        setFreshBias(0.35);
                        setSafetyLevel(0.55);
                        setSeed((s) => s + 1);
                      }}
                      className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 text-[11px] text-gray-300 hover:bg-white/10 transition inline-flex items-center gap-2"
                      title="reset"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      reset
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>新鲜度偏好</span>
                      <span className="font-mono text-gray-300">{(freshBias * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={freshBias}
                      onChange={(e) => {
                        setFreshBias(parseFloat(e.target.value));
                        setSeed((s) => s + 1);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>安全/合规阈值</span>
                      <span className="font-mono text-gray-300">{(safetyLevel * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={safetyLevel}
                      onChange={(e) => {
                        setSafetyLevel(parseFloat(e.target.value));
                        setSeed((s) => s + 1);
                      }}
                      className="w-full"
                    />
                    <div className="text-[10px] text-gray-500 leading-relaxed">
                      阈值越高：高风险候选更难进入后续链路，同时去重更严格（示意）。
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-7 md:p-10 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
                {/* Left: Channels + Funnel */}
                <div className="space-y-6">
                  <div className="glass rounded-3xl border border-white/10 p-6">
                    <SectionTitle
                      icon={<Search className="w-5 h-5 text-blue-300" />}
                      title="多路召回通道（示意）"
                      sub="不同通道对“相关性 / 覆盖 / 时效 / 冷启动”的侧重点不同，最终以加权并集汇合。"
                    />

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {channels.map((ch, i) => {
                        const w = channelWeights[ch.key];
                        const n = perChannel[ch.key];
                        return (
                          <motion.div
                            key={ch.key}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.06 + i * 0.04 }}
                            className="p-5 glass rounded-2xl border border-white/10 hover:border-white/20 transition-all bg-white/[0.02]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                  {ch.icon}
                                </div>
                                <div>
                                  <div className="text-[13px] font-black text-white">{ch.name}</div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">{ch.desc}</div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">share</div>
                                <div className="text-[14px] font-black text-gray-200">{(w * 100).toFixed(0)}%</div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono uppercase">
                                <span>recall</span>
                                <span>{fmtK(n)}</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  animate={{ width: `${clamp(w * 100, 4, 100)}%` }}
                                  className="h-full bg-blue-400/60"
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-gray-500">
                              <div className="space-y-1">
                                <div className="text-gray-400 font-black uppercase tracking-widest">strength</div>
                                {ch.strengths.map((s, idx) => (
                                  <div key={idx}>• {s}</div>
                                ))}
                              </div>
                              <div className="space-y-1">
                                <div className="text-gray-400 font-black uppercase tracking-widest">risk</div>
                                {ch.risks.map((r, idx) => (
                                  <div key={idx}>• {r}</div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Funnel + Post-processing summary */}
                  <div className="glass rounded-3xl border border-white/10 p-6">
                    <SectionTitle
                      icon={<Filter className="w-5 h-5 text-gray-200" />}
                      title="召回后处理：过滤 / 去重 / 截断（示意）"
                      sub="把“可用候选”控制在后续排序链路可承载的规模，并稳定结果形态。"
                    />

                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Funnel visual */}
                      <div className="lg:col-span-5 flex items-center justify-center">
                        <div className="relative w-full max-w-sm">
                          <svg viewBox="0 0 200 320" className="w-full h-full">
                            <defs>
                              <linearGradient id="funnelG2" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0" />
                                <stop offset="45%" stopColor="#2563eb" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.85" />
                              </linearGradient>
                            </defs>

                            <motion.path
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 1.4 }}
                              d="M10,20 Q100,20 190,20 L138,292 L62,292 Z"
                              fill="url(#funnelG2)"
                              stroke="rgba(59,130,246,0.9)"
                              strokeWidth="1"
                            />

                            {/* particles */}
                            {[...Array(14)].map((_, i) => (
                              <motion.circle
                                key={i}
                                r="2.2"
                                fill="#fff"
                                initial={{ cx: 40 + ((i * 17) % 120), cy: 32, opacity: 0 }}
                                animate={{
                                  cy: [32, 285],
                                  cx: [40 + ((i * 17) % 120), 82 + ((i * 11 + seed) % 40)],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{ duration: 2.2 + (i % 4) * 0.25, repeat: Infinity, delay: i * 0.18, ease: 'easeIn' }}
                              />
                            ))}
                          </svg>

                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-7 text-center">
                            <div className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">Total Library</div>
                            <div className="text-xl font-black text-white">{fmtK(totalLibrary)}</div>
                          </div>

                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-7 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Candidates</div>
                            <div className="text-4xl font-black text-blue-400">~{fmtK(post.finalN)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-black text-gray-200">流程收敛（示意）</div>
                            <Pill tone="gray">进入后续排序链路</Pill>
                          </div>

                          <div className="mt-4 space-y-3 text-[11px] text-gray-400">
                            <StepRow label="多路召回并集（raw）" left={rawRecall} right="条" tone="blue" />
                            <StepRow label="安全过滤后" left={post.filteredN} right="条" tone="cyan" />
                            <StepRow label="近重复去重后" left={post.dedupN} right="条" tone="purple" />
                            <StepRow label="粗排截断（final）" left={post.finalN} right="条" tone="emerald" />
                            <div className="pt-2 text-[10px] text-gray-500">
                              主题覆盖（unique topics）：<span className="text-gray-200 font-bold">{post.uniqTopics}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-black text-gray-200">最终候选构成（示意）</div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">by channel</div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                            <ChannelStat label="CF" val={post.byChannel.cf} />
                            <ChannelStat label="ANN" val={post.byChannel.ann} />
                            <ChannelStat label="HOT" val={post.byChannel.hot} />
                            <ChannelStat label="FOLLOW" val={post.byChannel.follow} />
                            <ChannelStat label="FRESH" val={post.byChannel.fresh} />
                          </div>

                          <div className="mt-4 flex items-start gap-3 text-[11px] text-gray-400 leading-relaxed">
                            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/20">
                              <Info className="w-4 h-4 text-blue-300" />
                            </div>
                            <div>
                              多路通道的并集会带来覆盖，但也会带来噪声。后处理负责把“可用候选”的规模、风险与相似度控制在可承载范围内，
                              同时为后续排序留出可调空间（例如新鲜度与探索的预算）。
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Candidate Inspector */}
                <div className="space-y-6">
                  <div className="glass rounded-3xl border border-white/10 p-6">
                    <SectionTitle
                      icon={<ShieldCheck className="w-5 h-5 text-emerald-300" />}
                      title="候选样本检查（示意）"
                      sub="展示：来源通道、粗分、进入原因、风险/去重标记。"
                    />

                    <div className="mt-5 grid grid-cols-1 gap-3 max-h-[520px] overflow-y-auto pr-2">
                      {post.list.slice(0, 28).map((c, idx) => {
                        const isActive = active?.id === c.id;
                        const tone =
                          c.source === 'cf'
                            ? 'blue'
                            : c.source === 'ann'
                              ? 'purple'
                              : c.source === 'hot'
                                ? 'cyan'
                                : c.source === 'follow'
                                  ? 'emerald'
                                  : 'yellow';

                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveId(c.id)}
                            className={`text-left rounded-2xl border p-4 transition-all ${
                              isActive
                                ? 'border-blue-500/40 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.14)]'
                                : 'border-white/10 bg-white/5 hover:bg-white/7'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[12px] font-black text-white truncate">{c.title}</div>
                                <div className="mt-1 text-[10px] text-gray-500">
                                  {c.creator} · <span className="text-gray-300">{c.topic}</span> · {c.ageH}h ago
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Pill tone={tone as any}>{c.source.toUpperCase()}</Pill>
                                <div className="text-[12px] font-mono text-gray-200">{c.score}</div>
                              </div>
                            </div>

                            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <motion.div animate={{ width: `${c.score}%` }} className="h-full bg-blue-400/65" />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {c.flags.coldStart && <Pill tone="yellow">cold-start</Pill>}
                              {c.flags.dupGroup && <Pill tone="gray">dup:{c.flags.dupGroup}</Pill>}
                              {c.flags.safeRisk !== 'low' && (
                                <Pill tone={c.flags.safeRisk === 'high' ? 'purple' : 'cyan'}>
                                  risk:{c.flags.safeRisk}
                                </Pill>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Explanation */}
                  <div className="glass rounded-3xl border border-white/10 p-6">
                    <SectionTitle
                      icon={<Info className="w-5 h-5 text-blue-300" />}
                      title="为何进入候选集合（示意）"
                      sub="这部分用于解释“召回侧可解释性”：信号来源与后处理规则。"
                    />

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active?.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-[13px] font-black text-white truncate">{active.title}</div>
                            <div className="mt-1 text-[11px] text-gray-500">
                              {active.creator} · <span className="text-gray-300">{active.topic}</span> · {active.ageH}h ago
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">retrieval score</div>
                            <div className="text-2xl font-black text-white">{active.score}</div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 text-[11px] text-gray-400">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">来源通道</span>
                            <span className="text-gray-200 font-bold">{active.source.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">新鲜度</span>
                            <span className="text-gray-200 font-bold">{active.ageH}h</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">冷启动</span>
                            <span className="text-gray-200 font-bold">{active.flags.coldStart ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">风险等级</span>
                            <span className="text-gray-200 font-bold">{active.flags.safeRisk}</span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">signals / reasons</div>
                          <div className="flex flex-wrap gap-2">
                            {active.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-gray-200"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 text-[11px] text-gray-400 leading-relaxed">
                          说明：这里的分数仅代表召回侧“可用性与相关性”的粗粒度估计。最终是否被呈现，需要后续排序阶段综合多目标与策略约束。
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepRow: React.FC<{ label: string; left: number; right: string; tone: 'blue' | 'cyan' | 'purple' | 'emerald' }> = ({
  label,
  left,
  right,
  tone,
}) => {
  const bar =
    tone === 'blue'
      ? 'bg-blue-400/70'
      : tone === 'cyan'
        ? 'bg-cyan-400/70'
        : tone === 'purple'
          ? 'bg-purple-400/70'
          : 'bg-emerald-400/70';

  // 视觉归一化
  const width = clamp(Math.log10(left + 10) / Math.log10(5200 + 10), 0.08, 1) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-200">
          {fmtK(left)} {right}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div animate={{ width: `${width}%` }} className={`h-full ${bar}`} />
      </div>
    </div>
  );
};

const ChannelStat: React.FC<{ label: string; val: number }> = ({ label, val }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="text-[10px] font-black tracking-widest uppercase text-gray-500">{label}</div>
    <div className="mt-1 text-lg font-black text-white">{fmtK(val)}</div>
  </div>
);

export default CandidateRetrieval;
