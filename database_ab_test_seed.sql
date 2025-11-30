-- ============================================================================
-- A/B 테스트 초기 실험 데이터
-- 가격 폰트 사이즈 실험
-- ============================================================================

-- 1. 가격 폰트 사이즈 실험 생성
INSERT INTO ab_test_experiments (
  name,
  description,
  hypothesis,
  
  -- ICE 스코어링
  impact,
  confidence,
  ease,
  
  -- 실험 지표
  current_conversion_rate,
  expected_improvement_rate,
  monthly_traffic,
  minimum_sample_size,
  
  -- Variant 설정
  control_variant,
  test_variant,
  
  -- 상태
  status,
  is_active,
  
  -- 안전장치
  max_exposure_percentage,
  automatic_rollback,
  
  -- 타임스탬프
  started_at
) VALUES (
  'price_font_size_experiment',
  '가격 폰트 사이즈 실험 - 리스트 페이지',
  '가격 폰트 크기를 기존보다 2~3px 키우면 사용자의 시선이 가격에 빠르게 도달하고, 그 결과 상세 페이지 진입률(PDP Click Rate)이 증가할 것이다.',
  
  -- ICE: Impact=6, Confidence=7, Ease=9
  6,
  7,
  9,
  
  -- 현재 전환율 8%, 예상 개선율 6%, 월간 트래픽 2000
  8.0,
  6.0,
  2000,
  1000, -- 최소 샘플 크기
  
  -- Control: 기존 14px
  '{"fontSize": "14px", "fontWeight": "normal"}'::JSONB,
  
  -- Variant: 16px + font-semibold
  '{"fontSize": "16px", "fontWeight": "600"}'::JSONB,
  
  -- 실험 시작
  'running',
  true,
  
  -- 전체 사용자에게 노출 (100%)
  100,
  false, -- 자동 롤백 비활성화 (수동 관리)
  
  -- 현재 시각으로 시작
  TIMEZONE('utc'::text, NOW())
) ON CONFLICT (name) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at;

-- 2. 가드레일 설정 (선택적)
-- 이탈률이 20%를 초과하면 경고
INSERT INTO ab_test_guardrails (
  experiment_id,
  metric_name,
  threshold,
  comparison_operator
) 
SELECT 
  id,
  'bounce_rate',
  20.0,
  '>'
FROM ab_test_experiments 
WHERE name = 'price_font_size_experiment'
ON CONFLICT (experiment_id, metric_name) DO NOTHING;

-- 장바구니 이탈률이 80%를 초과하면 경고
INSERT INTO ab_test_guardrails (
  experiment_id,
  metric_name,
  threshold,
  comparison_operator
) 
SELECT 
  id,
  'cart_abandonment_rate',
  80.0,
  '>'
FROM ab_test_experiments 
WHERE name = 'price_font_size_experiment'
ON CONFLICT (experiment_id, metric_name) DO NOTHING;

-- ============================================================================
-- 완료!
-- 
-- 확인 쿼리:
-- SELECT * FROM ab_test_experiments WHERE name = 'price_font_size_experiment';
-- SELECT * FROM ab_test_guardrails;
-- ============================================================================

