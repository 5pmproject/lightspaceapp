-- ============================================================================
-- A/B 테스트 통계 함수 (Production-Ready)
-- 개선사항: 통계적 검증, 자동 판정, SRM 체크
-- ============================================================================

-- ============================================================================
-- 1. 카이제곱 검정 (Chi-Square Test)
-- 통계적 유의성 검증
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_chi_square(
  control_clicks INT,
  control_views INT,
  variant_clicks INT,
  variant_views INT
) RETURNS NUMERIC AS $$
DECLARE
  control_non_clicks INT;
  variant_non_clicks INT;
  total_clicks INT;
  total_non_clicks INT;
  total INT;
  expected_control_clicks NUMERIC;
  expected_control_non_clicks NUMERIC;
  expected_variant_clicks NUMERIC;
  expected_variant_non_clicks NUMERIC;
  chi_square NUMERIC;
BEGIN
  -- 0으로 나누기 방지
  IF control_views = 0 OR variant_views = 0 THEN
    RETURN 0;
  END IF;
  
  control_non_clicks := control_views - control_clicks;
  variant_non_clicks := variant_views - variant_clicks;
  total_clicks := control_clicks + variant_clicks;
  total_non_clicks := control_non_clicks + variant_non_clicks;
  total := control_views + variant_views;
  
  expected_control_clicks := (control_views::NUMERIC / total) * total_clicks;
  expected_control_non_clicks := (control_views::NUMERIC / total) * total_non_clicks;
  expected_variant_clicks := (variant_views::NUMERIC / total) * total_clicks;
  expected_variant_non_clicks := (variant_views::NUMERIC / total) * total_non_clicks;
  
  -- 기대값이 5 미만이면 신뢰할 수 없음
  IF expected_control_clicks < 5 OR expected_variant_clicks < 5 THEN
    RETURN 0;
  END IF;
  
  chi_square := 
    POWER(control_clicks - expected_control_clicks, 2) / NULLIF(expected_control_clicks, 0) +
    POWER(control_non_clicks - expected_control_non_clicks, 2) / NULLIF(expected_control_non_clicks, 0) +
    POWER(variant_clicks - expected_variant_clicks, 2) / NULLIF(expected_variant_clicks, 0) +
    POWER(variant_non_clicks - expected_variant_non_clicks, 2) / NULLIF(expected_variant_non_clicks, 0);
  
  RETURN chi_square;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. 신뢰구간 계산 (Confidence Interval)
-- Wilson Score Interval 사용
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_confidence_interval(
  clicks INT,
  views INT,
  confidence_level NUMERIC DEFAULT 0.95
) RETURNS JSONB AS $$
DECLARE
  p NUMERIC;
  n INT;
  z NUMERIC;
  denominator NUMERIC;
  center NUMERIC;
  margin NUMERIC;
  lower NUMERIC;
  upper NUMERIC;
BEGIN
  IF views = 0 OR clicks < 0 OR clicks > views THEN
    RETURN jsonb_build_object(
      'lower', 0,
      'upper', 0,
      'margin', 0
    );
  END IF;
  
  p := clicks::NUMERIC / views::NUMERIC;
  n := views;
  z := 1.96; -- 95% confidence (z-score)
  
  -- Wilson Score Interval
  denominator := 1 + (z * z / n);
  center := (p + z * z / (2 * n)) / denominator;
  margin := (z / denominator) * SQRT((p * (1 - p) / n) + (z * z / (4 * n * n)));
  
  lower := GREATEST(0, center - margin);
  upper := LEAST(1, center + margin);
  
  RETURN jsonb_build_object(
    'lower', ROUND(lower * 100, 2),
    'upper', ROUND(upper * 100, 2),
    'margin', ROUND(margin * 100, 2)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. 필요 샘플 크기 계산 (Sample Size Calculator)
-- Power Analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_sample_size(
  baseline_rate NUMERIC,  -- 기준 전환율 (%)
  mde NUMERIC,            -- 최소 감지 효과 (%)
  power NUMERIC DEFAULT 0.8,
  alpha NUMERIC DEFAULT 0.05
) RETURNS INTEGER AS $$
DECLARE
  p1 NUMERIC;
  p2 NUMERIC;
  z_alpha NUMERIC;
  z_beta NUMERIC;
  sample_size NUMERIC;
BEGIN
  IF baseline_rate <= 0 OR baseline_rate >= 100 THEN
    RETURN 1000; -- 기본값
  END IF;
  
  p1 := baseline_rate / 100;
  p2 := p1 * (1 + mde / 100);
  
  -- p2가 1을 초과하지 않도록
  p2 := LEAST(p2, 0.99);
  
  z_alpha := 1.96;  -- 95% confidence
  z_beta := 0.84;   -- 80% power
  
  -- 샘플 크기 공식
  sample_size := (
    (z_alpha * SQRT(2 * p1 * (1 - p1)) + z_beta * SQRT(p1 * (1 - p1) + p2 * (1 - p2)))
    / NULLIF((p2 - p1), 0)
  ) ^ 2;
  
  RETURN GREATEST(100, CEIL(sample_size));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 4. SRM 체크 (Sample Ratio Mismatch)
-- 실험 그룹 할당이 공정한지 확인
-- ============================================================================
CREATE OR REPLACE FUNCTION check_srm(
  experiment_id_param UUID
) RETURNS JSONB AS $$
DECLARE
  control_count INT;
  variant_count INT;
  total_count INT;
  expected_ratio NUMERIC := 0.5;
  chi_square NUMERIC;
  is_srm_violated BOOLEAN;
BEGIN
  -- 각 variant별 할당 수 계산
  SELECT 
    COUNT(*) FILTER (WHERE variant = 'control'),
    COUNT(*) FILTER (WHERE variant = 'variant'),
    COUNT(*)
  INTO control_count, variant_count, total_count
  FROM ab_test_assignments
  WHERE experiment_id = experiment_id_param;
  
  IF total_count < 100 THEN
    RETURN jsonb_build_object(
      'is_violated', false,
      'message', 'Insufficient sample size for SRM check',
      'control_count', control_count,
      'variant_count', variant_count
    );
  END IF;
  
  -- 카이제곱 검정
  chi_square := POWER(control_count - total_count * expected_ratio, 2) / (total_count * expected_ratio) +
                POWER(variant_count - total_count * expected_ratio, 2) / (total_count * expected_ratio);
  
  -- p < 0.001이면 SRM 위반 (chi_square > 10.83)
  is_srm_violated := chi_square > 10.83;
  
  RETURN jsonb_build_object(
    'is_violated', is_srm_violated,
    'chi_square', ROUND(chi_square, 4),
    'control_count', control_count,
    'variant_count', variant_count,
    'expected_ratio', expected_ratio,
    'actual_control_ratio', ROUND(control_count::NUMERIC / NULLIF(total_count, 0), 4),
    'message', CASE 
      WHEN is_srm_violated THEN 'SRM detected! Assignment may be biased.'
      ELSE 'No SRM detected. Assignment is fair.'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. 고도화된 통계 함수 (메인)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_ab_test_statistics(experiment_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  control_stats RECORD;
  variant_stats RECORD;
  chi_square NUMERIC;
  p_value NUMERIC;
  is_significant BOOLEAN;
  lift_percentage NUMERIC;
  relative_difference NUMERIC;
  srm_check JSONB;
  result JSONB;
BEGIN
  -- Control 통계
  SELECT
    COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'product_list_view') as views,
    COUNT(*) FILTER (WHERE event_type = 'product_detail_click') as clicks
  INTO control_stats
  FROM ab_test_events
  WHERE experiment_id = experiment_id_param AND variant = 'control';
  
  -- Variant 통계
  SELECT
    COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'product_list_view') as views,
    COUNT(*) FILTER (WHERE event_type = 'product_detail_click') as clicks
  INTO variant_stats
  FROM ab_test_events
  WHERE experiment_id = experiment_id_param AND variant = 'variant';
  
  -- 카이제곱 검정
  IF control_stats.views > 0 AND variant_stats.views > 0 THEN
    chi_square := calculate_chi_square(
      control_stats.clicks, control_stats.views,
      variant_stats.clicks, variant_stats.views
    );
    
    -- p-value 근사값 (chi_square > 3.841 = p < 0.05)
    is_significant := chi_square > 3.841;
    p_value := CASE 
      WHEN chi_square > 10.83 THEN 0.001
      WHEN chi_square > 6.635 THEN 0.01
      WHEN chi_square > 3.841 THEN 0.05
      ELSE 0.10
    END;
    
    -- Lift 계산
    IF control_stats.views > 0 AND variant_stats.views > 0 THEN
      lift_percentage := (
        (variant_stats.clicks::NUMERIC / variant_stats.views - 
         control_stats.clicks::NUMERIC / control_stats.views) /
        NULLIF(control_stats.clicks::NUMERIC / control_stats.views, 0)
      ) * 100;
    ELSE
      lift_percentage := 0;
    END IF;
  ELSE
    chi_square := 0;
    is_significant := false;
    p_value := 1.0;
    lift_percentage := 0;
  END IF;
  
  -- SRM 체크
  srm_check := check_srm(experiment_id_param);
  
  -- 결과 조합
  result := jsonb_build_object(
    'experiment_id', experiment_id_param,
    'control_group', jsonb_build_object(
      'views', control_stats.views,
      'clicks', control_stats.clicks,
      'conversion_rate', ROUND(
        CASE WHEN control_stats.views > 0
        THEN (control_stats.clicks::NUMERIC / control_stats.views) * 100
        ELSE 0 END, 4
      ),
      'confidence_interval', calculate_confidence_interval(control_stats.clicks, control_stats.views)
    ),
    'variant_group', jsonb_build_object(
      'views', variant_stats.views,
      'clicks', variant_stats.clicks,
      'conversion_rate', ROUND(
        CASE WHEN variant_stats.views > 0
        THEN (variant_stats.clicks::NUMERIC / variant_stats.views) * 100
        ELSE 0 END, 4
      ),
      'confidence_interval', calculate_confidence_interval(variant_stats.clicks, variant_stats.views)
    ),
    'statistical_test', jsonb_build_object(
      'chi_square', ROUND(chi_square, 4),
      'p_value', p_value,
      'is_significant', is_significant,
      'confidence_level', 0.95,
      'lift_percentage', ROUND(lift_percentage, 2)
    ),
    'srm_check', srm_check,
    'total_sample_size', control_stats.views + variant_stats.views
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. 실험 결과 자동 판정 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION analyze_experiment_results(experiment_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  control_rate NUMERIC;
  variant_rate NUMERIC;
  lift NUMERIC;
  is_significant BOOLEAN;
  srm_violated BOOLEAN;
  winner TEXT;
  recommendation TEXT;
  confidence TEXT;
BEGIN
  stats := get_ab_test_statistics(experiment_id_param);
  
  control_rate := (stats->'control_group'->>'conversion_rate')::NUMERIC;
  variant_rate := (stats->'variant_group'->>'conversion_rate')::NUMERIC;
  lift := (stats->'statistical_test'->>'lift_percentage')::NUMERIC;
  is_significant := (stats->'statistical_test'->>'is_significant')::BOOLEAN;
  srm_violated := (stats->'srm_check'->>'is_violated')::BOOLEAN;
  
  -- 승자 판정
  IF srm_violated THEN
    winner := 'inconclusive';
    recommendation := 'SRM detected. Re-run experiment with fixed assignment.';
    confidence := 'invalid';
  ELSIF NOT is_significant THEN
    winner := 'inconclusive';
    recommendation := 'No significant difference detected. Consider running longer or increasing sample size.';
    confidence := 'low';
  ELSIF lift > 0 THEN
    winner := 'variant';
    recommendation := 'Variant shows significant improvement. Consider rolling out.';
    confidence := 'high';
  ELSIF lift < 0 THEN
    winner := 'control';
    recommendation := 'Variant shows significant degradation. Revert to control.';
    confidence := 'high';
  ELSE
    winner := 'inconclusive';
    recommendation := 'Rates are identical. No action needed.';
    confidence := 'medium';
  END IF;
  
  RETURN jsonb_build_object(
    'winner', winner,
    'lift_percentage', lift,
    'recommendation', recommendation,
    'confidence', confidence,
    'statistics', stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. 가드레일 체크 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION check_guardrails(experiment_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  guardrail RECORD;
  violated_guardrails JSONB := '[]'::JSONB;
  all_passed BOOLEAN := true;
BEGIN
  FOR guardrail IN 
    SELECT * FROM ab_test_guardrails 
    WHERE experiment_id = experiment_id_param
  LOOP
    -- 실제 지표 계산은 구현에 따라 다름
    -- 여기서는 current_value가 이미 업데이트되어 있다고 가정
    
    IF guardrail.current_value IS NOT NULL THEN
      -- 위반 여부 판정
      IF (guardrail.comparison_operator = '>' AND guardrail.current_value > guardrail.threshold) OR
         (guardrail.comparison_operator = '<' AND guardrail.current_value < guardrail.threshold) OR
         (guardrail.comparison_operator = '>=' AND guardrail.current_value >= guardrail.threshold) OR
         (guardrail.comparison_operator = '<=' AND guardrail.current_value <= guardrail.threshold) OR
         (guardrail.comparison_operator = '=' AND guardrail.current_value = guardrail.threshold) THEN
        
        -- 위반 기록
        UPDATE ab_test_guardrails
        SET is_violated = true,
            last_checked_at = NOW()
        WHERE id = guardrail.id;
        
        violated_guardrails := violated_guardrails || jsonb_build_object(
          'metric_name', guardrail.metric_name,
          'threshold', guardrail.threshold,
          'current_value', guardrail.current_value,
          'operator', guardrail.comparison_operator
        );
        
        all_passed := false;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'all_passed', all_passed,
    'violated_guardrails', violated_guardrails
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. 실시간 지표 새로고침 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_ab_test_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ab_test_realtime_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. 권한 부여
-- ============================================================================
GRANT EXECUTE ON FUNCTION calculate_chi_square TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_confidence_interval TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_sample_size TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_srm TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_ab_test_statistics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION analyze_experiment_results TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_guardrails TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_ab_test_metrics TO anon, authenticated;

-- ============================================================================
-- 완료!
-- ============================================================================

