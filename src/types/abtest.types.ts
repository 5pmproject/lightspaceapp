/**
 * A/B 테스트 시스템 타입 정의
 * Production-Ready with 세그멘테이션, 가드레일, 통계 검증
 */

// ============================================================================
// 실험 상태
// ============================================================================
export enum ExperimentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

// ============================================================================
// 실험 정의
// ============================================================================
export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  
  // ICE 프레임워크
  impact: number;
  confidence: number;
  ease: number;
  ice_score?: number;
  
  // 실험 지표
  current_conversion_rate: number;
  expected_improvement_rate: number;
  monthly_traffic: number;
  minimum_sample_size: number;
  
  // Variant 설정
  control_variant: Record<string, any>;
  test_variant: Record<string, any>;
  
  // 상태
  status: ExperimentStatus;
  is_active: boolean;
  
  // 안전장치
  max_exposure_percentage: number;
  automatic_rollback: boolean;
  
  // 충돌 관리
  conflicting_experiments?: string[];
  
  // 타임스탬프
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 사용자 식별
// ============================================================================
export interface UserIdentification {
  userId?: string;      // 로그인 사용자 (선택)
  sessionId: string;    // 세션 ID (필수)
  deviceId?: string;    // 디바이스 ID (선택)
}

// ============================================================================
// 사용자 세그먼트
// ============================================================================
export interface UserSegments {
  is_new_user?: boolean;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
  referrer_source?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week?: string;
  [key: string]: any;  // 추가 세그먼트 허용
}

// ============================================================================
// Variant 할당
// ============================================================================
export type ABTestVariant = 'control' | 'variant';

export interface ABTestAssignment {
  id: string;
  experiment_id: string;
  user_id?: string;
  session_id: string;
  device_id?: string;
  variant: ABTestVariant;
  user_segments: UserSegments;
  assigned_at: string;
}

// ============================================================================
// 이벤트 추적
// ============================================================================
export interface ABTestEventContext {
  page_context?: {
    page: string;
    url?: string;
    filters?: Record<string, any>;
    scroll_depth?: number;
    viewport_width?: number;
    viewport_height?: number;
  };
  device_info?: {
    device_type: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    browser_version?: string;
    os?: string;
    os_version?: string;
    screen_resolution?: string;
  };
  session_data?: {
    session_start?: string;
    referrer?: string;
    previous_page?: string;
    session_duration?: number;
    pages_visited?: number;
  };
}

export interface ABTestEvent {
  id: string;
  experiment_id: string;
  user_id?: string;
  session_id: string;
  device_id?: string;
  variant: ABTestVariant;
  event_type: string;
  event_data?: Record<string, any>;
  page_context?: ABTestEventContext['page_context'];
  device_info?: ABTestEventContext['device_info'];
  session_data?: ABTestEventContext['session_data'];
  created_at: string;
}

// ============================================================================
// 통계 결과
// ============================================================================
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  margin: number;
}

export interface GroupStatistics {
  views: number;
  clicks: number;
  conversion_rate: number;
  confidence_interval: ConfidenceInterval;
}

export interface StatisticalTest {
  chi_square: number;
  p_value: number;
  is_significant: boolean;
  confidence_level: number;
  lift_percentage: number;
}

export interface SRMCheck {
  is_violated: boolean;
  chi_square?: number;
  control_count?: number;
  variant_count?: number;
  expected_ratio?: number;
  actual_control_ratio?: number;
  message: string;
}

export interface ABTestStatistics {
  experiment_id: string;
  control_group: GroupStatistics;
  variant_group: GroupStatistics;
  statistical_test: StatisticalTest;
  srm_check: SRMCheck;
  total_sample_size: number;
}

// ============================================================================
// 실험 결과 분석
// ============================================================================
export type ExperimentWinner = 'control' | 'variant' | 'inconclusive';
export type AnalysisConfidence = 'high' | 'medium' | 'low' | 'invalid';

export interface ExperimentAnalysis {
  winner: ExperimentWinner;
  lift_percentage: number;
  recommendation: string;
  confidence: AnalysisConfidence;
  statistics: ABTestStatistics;
}

// ============================================================================
// 가드레일
// ============================================================================
export interface ABTestGuardrail {
  id: string;
  experiment_id: string;
  metric_name: string;
  threshold: number;
  comparison_operator: '>' | '<' | '>=' | '<=' | '=';
  current_value?: number;
  is_violated: boolean;
  last_checked_at?: string;
  created_at: string;
}

export interface GuardrailCheckResult {
  all_passed: boolean;
  violated_guardrails: Array<{
    metric_name: string;
    threshold: number;
    current_value: number;
    operator: string;
  }>;
}

// ============================================================================
// 실험 결과 아카이브
// ============================================================================
export type ExperimentDecision = 'rolled_out' | 'reverted' | 'iterate' | 'abandoned';

export interface ABTestResultArchive {
  id: string;
  experiment_id: string;
  final_stats: ABTestStatistics;
  winner: ExperimentWinner;
  lift_percentage: number;
  decision: ExperimentDecision;
  learnings?: string;
  statistical_significance: boolean;
  p_value: number;
  confidence_level: number;
  created_at: string;
}

// ============================================================================
// 실시간 지표
// ============================================================================
export interface ABTestRealtimeMetrics {
  experiment_id: string;
  variant: ABTestVariant;
  hour: string;
  unique_users: number;
  exposures: number;
  list_views: number;
  detail_clicks: number;
  conversion_rate: number;
}

// ============================================================================
// Hook 반환 타입
// ============================================================================
export interface UseABTestReturn {
  variant: ABTestVariant | null;
  isLoading: boolean;
  isEligible: boolean;
  error: Error | null;
  trackEvent: (eventType: string, eventData?: any, context?: ABTestEventContext) => Promise<void>;
  debugInfo: {
    experimentName: string;
    variant: ABTestVariant | null;
    experimentId: string | null;
  } | null;
}

// ============================================================================
// 오프라인 이벤트 큐
// ============================================================================
export interface QueuedEvent {
  eventType: string;
  eventData?: any;
  context?: ABTestEventContext;
  timestamp: number;
  retryCount: number;
}

// ============================================================================
// 샘플 크기 계산
// ============================================================================
export interface SampleSizeCalculation {
  baseline_rate: number;
  mde: number;
  power: number;
  alpha: number;
  required_sample_size: number;
  days_to_reach: number;
}

