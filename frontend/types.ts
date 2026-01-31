
export interface DistanceMetric {
  average_distance_mm: number;
  score: number;
}

export interface ScoreGroup {
  group_id: number;
  /** 该缝线在图中的位置描述 */
  position?: string;
  /** 是否为异常数据（不参与最终平均） */
  is_abnormal?: boolean;
  /** 异常原因说明 */
  abnormal_reason?: string;
  avr_far_points: DistanceMetric;
  avr_near_points: DistanceMetric;
  total_score: number;
}

export interface ScaleInfo {
  pixels_per_mm: number;
}

/** AI 模型返回的原始缝线数据（像素距离等） */
export interface RawAiSuture {
  id?: number;
  position?: string;
  far_point_distance_px?: number;
  near_point_distance_px?: number;
  is_abnormal?: boolean;
  abnormal_reason?: string;
}

export interface RawAiResult {
  sutures: RawAiSuture[];
}

export interface AssessmentReport {
  version: string;
  image_id: string;
  timestamp: string;
  scale: ScaleInfo;
  scores: ScoreGroup[];
  final_average_score: number;
  /** 参与最终平均的有效条数（非异常） */
  valid_count?: number;
  /** 异常条数 */
  abnormal_count?: number;
  /** 总条数 */
  total_count?: number;
  /** 模型原始返回，用于前端日志块展示 */
  raw_ai_result?: RawAiResult;
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
