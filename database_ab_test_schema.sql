-- ============================================================================
-- A/B 테스트 시스템 스키마 (Production-Ready)
-- 개선사항: 실험 충돌 방지, 가드레일, 이력 관리
-- ============================================================================

-- UUID 확장 (이미 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 실험 상태 ENUM 타입
-- ============================================================================
CREATE TYPE experiment_status AS ENUM (
  'draft',      -- 초안 작성 중
  'scheduled',  -- 예약됨
  'running',    -- 실행 중
  'paused',     -- 일시 정지
  'completed',  -- 완료
  'archived'    -- 보관
);

-- ============================================================================
-- 1. A/B 테스트 실험 정의 테이블
-- ============================================================================
CREATE TABLE ab_test_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  hypothesis TEXT,
  
  -- ICE 프레임워크 스코어링 (우선순위 결정)
  impact INTEGER CHECK (impact >= 1 AND impact <= 10),
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  ease INTEGER CHECK (ease >= 1 AND ease <= 10),
  ice_score NUMERIC GENERATED ALWAYS AS ((impact * confidence * ease)::NUMERIC / 10) STORED,
  
  -- 실험 지표
  current_conversion_rate NUMERIC,
  expected_improvement_rate NUMERIC,
  monthly_traffic INTEGER,
  minimum_sample_size INTEGER DEFAULT 1000,
  
  -- Variant 설정 (JSONB로 유연하게 관리)
  control_variant JSONB NOT NULL,
  test_variant JSONB NOT NULL,
  
  -- 실험 라이프사이클 관리
  status experiment_status DEFAULT 'draft',
  is_active BOOLEAN DEFAULT false,
  
  -- 안전장치 설정
  max_exposure_percentage INTEGER DEFAULT 100 CHECK (max_exposure_percentage > 0 AND max_exposure_percentage <= 100),
  automatic_rollback BOOLEAN DEFAULT false,
  
  -- 실험 충돌 방지
  conflicting_experiments UUID[] DEFAULT '{}',
  
  -- 타임스탬프
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 2. A/B 테스트 사용자 할당 테이블 (다중 식별자 전략)
-- ============================================================================
CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  
  -- 다중 식별자 전략
  user_id UUID,           -- 로그인 사용자 (auth.users.id)
  session_id TEXT NOT NULL,  -- 비로그인 세션 (필수)
  device_id TEXT,         -- 크로스 세션 추적 (선택)
  
  variant TEXT NOT NULL CHECK (variant IN ('control', 'variant')),
  
  -- 세그멘테이션 지원
  user_segments JSONB DEFAULT '{}',  -- {is_new_user: true, device_type: 'mobile', ...}
  
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- 중복 방지 (한 세션은 한 실험에 하나의 variant만)
  UNIQUE(experiment_id, session_id)
);

-- ============================================================================
-- 3. A/B 테스트 이벤트 추적 테이블 (확장된 메타데이터)
-- ============================================================================
CREATE TABLE ab_test_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  
  -- 사용자 식별
  user_id UUID,
  session_id TEXT NOT NULL,
  device_id TEXT,
  
  variant TEXT NOT NULL CHECK (variant IN ('control', 'variant')),
  event_type TEXT NOT NULL,  -- 'experiment_exposure', 'product_list_view', 'product_detail_click'
  event_data JSONB DEFAULT '{}',
  
  -- 추가 컨텍스트 정보
  page_context JSONB DEFAULT '{}',   -- {page: 'list', filters: {}, scroll_depth: 80}
  device_info JSONB DEFAULT '{}',    -- {device_type: 'mobile', browser: 'chrome', os: 'android'}
  session_data JSONB DEFAULT '{}',   -- {session_start: '...', referrer: '...', previous_page: '...'}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. 실험 가드레일 테이블 (핵심 지표 보호)
-- ============================================================================
CREATE TABLE ab_test_guardrails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  
  metric_name TEXT NOT NULL,  -- 'bounce_rate', 'cart_abandonment', 'error_rate'
  threshold NUMERIC NOT NULL, -- 허용 임계값 (예: 0.05 = 5%)
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=')),
  
  current_value NUMERIC,
  is_violated BOOLEAN DEFAULT false,
  
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(experiment_id, metric_name)
);

-- ============================================================================
-- 5. 실험 결과 아카이브 테이블 (학습 및 이력 관리)
-- ============================================================================
CREATE TABLE ab_test_results_archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  
  -- 최종 통계
  final_stats JSONB NOT NULL,
  
  -- 결과 판정
  winner TEXT CHECK (winner IN ('control', 'variant', 'inconclusive')),
  lift_percentage NUMERIC,  -- 개선율 (%)
  
  -- 의사결정
  decision TEXT CHECK (decision IN ('rolled_out', 'reverted', 'iterate', 'abandoned')),
  learnings TEXT,  -- 학습 내용
  
  -- 통계적 검증
  statistical_significance BOOLEAN,
  p_value NUMERIC,
  confidence_level NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 6. 인덱스 생성 (성능 최적화)
-- ============================================================================

-- Experiments
CREATE INDEX idx_ab_experiments_status ON ab_test_experiments(status);
CREATE INDEX idx_ab_experiments_active ON ab_test_experiments(is_active) WHERE is_active = true;
CREATE INDEX idx_ab_experiments_ice_score ON ab_test_experiments(ice_score DESC);

-- Assignments
CREATE INDEX idx_ab_assignments_exp_session ON ab_test_assignments(experiment_id, session_id);
CREATE INDEX idx_ab_assignments_user_id ON ab_test_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ab_assignments_variant ON ab_test_assignments(experiment_id, variant);

-- Events
CREATE INDEX idx_ab_events_exp_var_type ON ab_test_events(experiment_id, variant, event_type);
CREATE INDEX idx_ab_events_session ON ab_test_events(session_id);
CREATE INDEX idx_ab_events_created ON ab_test_events(created_at DESC);

-- Guardrails
CREATE INDEX idx_ab_guardrails_experiment ON ab_test_guardrails(experiment_id);
CREATE INDEX idx_ab_guardrails_violated ON ab_test_guardrails(is_violated) WHERE is_violated = true;

-- Results Archive
CREATE INDEX idx_ab_results_experiment ON ab_test_results_archive(experiment_id);
CREATE INDEX idx_ab_results_created ON ab_test_results_archive(created_at DESC);

-- ============================================================================
-- 7. 실시간 모니터링을 위한 Materialized View
-- ============================================================================
CREATE MATERIALIZED VIEW ab_test_realtime_metrics AS
SELECT 
  e.experiment_id,
  e.variant,
  date_trunc('hour', e.created_at) as hour,
  COUNT(DISTINCT e.session_id) as unique_users,
  COUNT(*) FILTER (WHERE e.event_type = 'experiment_exposure') as exposures,
  COUNT(*) FILTER (WHERE e.event_type = 'product_list_view') as list_views,
  COUNT(*) FILTER (WHERE e.event_type = 'product_detail_click') as detail_clicks,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'product_list_view') > 0
      THEN (COUNT(*) FILTER (WHERE e.event_type = 'product_detail_click')::NUMERIC / 
            COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'product_list_view')::NUMERIC) * 100
      ELSE 0
    END, 2
  ) as conversion_rate
FROM ab_test_events e
GROUP BY e.experiment_id, e.variant, date_trunc('hour', e.created_at);

CREATE INDEX idx_realtime_metrics_exp_hour ON ab_test_realtime_metrics(experiment_id, hour DESC);

-- 수동 갱신 명령어 (Supabase에서는 주기적으로 실행)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY ab_test_realtime_metrics;

-- ============================================================================
-- 8. 트리거 함수들
-- ============================================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_ab_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Experiments updated_at 트리거
CREATE TRIGGER update_ab_experiments_updated_at
  BEFORE UPDATE ON ab_test_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_updated_at();

-- 실험 충돌 체크 함수
CREATE OR REPLACE FUNCTION check_experiment_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- 활성화하려는 경우에만 충돌 체크
  IF NEW.is_active = true AND OLD.is_active = false THEN
    IF EXISTS (
      SELECT 1 
      FROM ab_test_experiments 
      WHERE id = ANY(NEW.conflicting_experiments) 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot activate experiment: conflicting experiment is active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 실험 충돌 체크 트리거
CREATE TRIGGER check_conflicts_before_activation
  BEFORE UPDATE ON ab_test_experiments
  FOR EACH ROW
  EXECUTE FUNCTION check_experiment_conflicts();

-- 가드레일 위반 시 자동 정지 함수
CREATE OR REPLACE FUNCTION auto_pause_on_guardrail_violation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_violated = true AND OLD.is_violated = false THEN
    UPDATE ab_test_experiments
    SET is_active = false,
        status = 'paused'
    WHERE id = NEW.experiment_id
      AND automatic_rollback = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 가드레일 자동 정지 트리거
CREATE TRIGGER auto_pause_on_violation
  AFTER UPDATE ON ab_test_guardrails
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_on_guardrail_violation();

-- ============================================================================
-- 9. Row Level Security (RLS) 정책
-- ============================================================================

ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results_archive ENABLE ROW LEVEL SECURITY;

-- Experiments: 활성 실험은 모두가 볼 수 있음
CREATE POLICY "Public can view active experiments" ON ab_test_experiments
  FOR SELECT USING (is_active = true AND status = 'running');

-- Assignments: 누구나 삽입/조회 가능
CREATE POLICY "Public can insert assignments" ON ab_test_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view assignments" ON ab_test_assignments
  FOR SELECT USING (true);

-- Events: 누구나 삽입 가능
CREATE POLICY "Public can insert events" ON ab_test_events
  FOR INSERT WITH CHECK (true);

-- Guardrails: 조회만 가능
CREATE POLICY "Public can view guardrails" ON ab_test_guardrails
  FOR SELECT USING (true);

-- Results Archive: 조회만 가능
CREATE POLICY "Public can view results" ON ab_test_results_archive
  FOR SELECT USING (true);

-- ============================================================================
-- 완료!
-- 
-- 다음 단계:
-- 1. Supabase SQL Editor에서 이 파일 실행
-- 2. database_ab_test_functions.sql 실행
-- 3. database_ab_test_seed.sql 실행
-- ============================================================================

