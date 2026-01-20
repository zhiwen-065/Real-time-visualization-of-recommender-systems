
export enum StageType {
  BehaviorCapture = 0,
  CandidateRetrieval = 1,
  DeepRanking = 2,
  DiversityControl = 3,
  StrategyIntervention = 4,
  FeedbackLoop = 5,
}

export interface StageData {
  id: StageType;
  title: string;
  description: string;
  formula: string;
}

export const STAGES: StageData[] = [
  { 
    id: StageType.BehaviorCapture, 
    title: '用户行为捕捉', 
    description: '毫秒级捕捉“Zhiwen”的互动细节，将点击、停留、划动转化为高维特征向量。',
    formula: 'f_user = [watch_time, swipe_speed, like_flag, stay_duration]'
  },
  { 
    id: StageType.CandidateRetrieval, 
    title: '候选内容召回', 
    description: '从亿级视频库中通过协同过滤、语义向量等通道快速筛选出数千个潜在候选。',
    formula: 'Recall(u) = ANN(v_u, {v_i}) | i=1..10^8, k=2000'
  },
  { 
    id: StageType.DeepRanking, 
    title: '精排打分', 
    description: '深度神经网络（DeepFM/DIN）对召回视频进行多目标概率预测与打分淘汰。',
    formula: 'Score_i = DNN(f_user, f_video_i, f_context)'
  },
  { 
    id: StageType.DiversityControl, 
    title: '多样性控制', 
    description: '打破“信息茧房”，强制注入不同品类内容，平衡用户兴趣与生态丰富度。',
    formula: 'MMR = argmax [λ·Score_i - (1-λ)·max Sim(v_i, v_j)]'
  },
  { 
    id: StageType.StrategyIntervention, 
    title: '策略干预', 
    description: '透明化的策略层：根据节日权重、新作者保护、商业目标对算法输出进行干预。',
    formula: 'FinalScore = Score_i + w_ad·AdBoost + w_new·NewCreatorBoost'
  },
  { 
    id: StageType.FeedbackLoop, 
    title: '实时反馈闭环', 
    description: '行为实时流回系统，在线学习（Online Learning）秒级更新模型参数。',
    formula: 'v_u^{new} = v_u^{old} + η · ∇L(Interaction_t)'
  },
];
