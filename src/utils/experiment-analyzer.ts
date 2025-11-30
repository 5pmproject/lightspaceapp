/**
 * 실험 결과 분석기 Utility
 * 통계적 유의성, Lift 계산, 권장사항 생성
 */

import {
  ABTestStatistics,
  ExperimentWinner,
  AnalysisConfidence,
  ExperimentAnalysis
} from '../types/abtest.types';

// ============================================================================
// 통계적 유의성 판정
// ============================================================================
export function isStatisticallySignificant(
  chiSquare: number,
  alpha: number = 0.05
): boolean {
  // df = 1일 때 카이제곱 임계값
  const criticalValues: Record<number, number> = {
    0.001: 10.828,
    0.01: 6.635,
    0.05: 3.841,
    0.10: 2.706
  };
  
  return chiSquare > (criticalValues[alpha] || 3.841);
}

// ============================================================================
// Lift 계산
// ============================================================================
export function calculateLift(
  controlRate: number,
  variantRate: number
): number {
  if (controlRate === 0) return 0;
  return ((variantRate - controlRate) / controlRate) * 100;
}

// ============================================================================
// 상대적 차이 계산
// ============================================================================
export function calculateRelativeDifference(
  controlRate: number,
  variantRate: number
): number {
  return variantRate - controlRate;
}

// ============================================================================
// 실험 승자 판정
// ============================================================================
export function determineWinner(
  stats: ABTestStatistics
): ExperimentWinner {
  const { statistical_test, srm_check } = stats;
  
  // SRM 위반 시
  if (srm_check.is_violated) {
    return 'inconclusive';
  }
  
  // 통계적으로 유의하지 않음
  if (!statistical_test.is_significant) {
    return 'inconclusive';
  }
  
  // Lift 기반 판정
  const lift = statistical_test.lift_percentage;
  
  if (lift > 0) {
    return 'variant';
  } else if (lift < 0) {
    return 'control';
  } else {
    return 'inconclusive';
  }
}

// ============================================================================
// 신뢰도 계산
// ============================================================================
export function calculateConfidence(
  stats: ABTestStatistics
): AnalysisConfidence {
  const { statistical_test, srm_check, total_sample_size } = stats;
  const { control_group, variant_group } = stats;
  
  // SRM 위반
  if (srm_check.is_violated) {
    return 'invalid';
  }
  
  // 샘플 크기 부족
  if (total_sample_size < 100) {
    return 'low';
  }
  
  // 통계적으로 유의하고 샘플 크기 충분
  if (statistical_test.is_significant && total_sample_size >= 1000) {
    return 'high';
  }
  
  // 통계적으로 유의하지만 샘플 크기 보통
  if (statistical_test.is_significant) {
    return 'medium';
  }
  
  // 통계적으로 유의하지 않음
  return 'low';
}

// ============================================================================
// 권장사항 생성
// ============================================================================
export function generateRecommendation(
  stats: ABTestStatistics,
  winner: ExperimentWinner,
  confidence: AnalysisConfidence
): string {
  const { srm_check, statistical_test, total_sample_size } = stats;
  const lift = statistical_test.lift_percentage;
  
  // SRM 위반
  if (srm_check.is_violated) {
    return 'SRM (Sample Ratio Mismatch)이 감지되었습니다. 실험 할당 로직에 문제가 있을 수 있으니 재실행을 권장합니다.';
  }
  
  // 샘플 크기 부족
  if (total_sample_size < 100) {
    return `샘플 크기가 너무 작습니다 (${total_sample_size}). 최소 100명 이상의 사용자가 필요합니다.`;
  }
  
  // 통계적으로 유의하지 않음
  if (!statistical_test.is_significant) {
    if (total_sample_size < 1000) {
      return `통계적 유의성이 없습니다. 샘플 크기를 늘려서 (현재: ${total_sample_size}) 실험을 더 진행해보세요.`;
    }
    return '두 그룹 간 유의미한 차이가 없습니다. 다른 요소를 테스트해보거나 실험을 종료하세요.';
  }
  
  // Variant 승리
  if (winner === 'variant' && lift > 0) {
    if (confidence === 'high') {
      return `Variant가 ${lift.toFixed(2)}% 개선을 보였습니다 (신뢰도: 높음). 전체 사용자에게 롤아웃을 권장합니다.`;
    } else {
      return `Variant가 ${lift.toFixed(2)}% 개선을 보였으나 신뢰도가 보통입니다. 조금 더 데이터를 수집한 후 결정하세요.`;
    }
  }
  
  // Control 승리
  if (winner === 'control' && lift < 0) {
    return `Variant가 ${Math.abs(lift).toFixed(2)}% 성능 저하를 보였습니다. Control (기존 버전)을 유지하세요.`;
  }
  
  // 결과 불명확
  return '결과가 불명확합니다. 실험을 더 진행하거나 다른 접근 방식을 시도하세요.';
}

// ============================================================================
// 종합 분석 함수
// ============================================================================
export function analyzeExperimentResults(
  stats: ABTestStatistics
): ExperimentAnalysis {
  const winner = determineWinner(stats);
  const confidence = calculateConfidence(stats);
  const recommendation = generateRecommendation(stats, winner, confidence);
  const lift = stats.statistical_test.lift_percentage;
  
  return {
    winner,
    lift_percentage: lift,
    recommendation,
    confidence,
    statistics: stats
  };
}

// ============================================================================
// 샘플 크기 도달까지 예상 일수 계산
// ============================================================================
export function calculateDaysToReachSampleSize(
  currentSampleSize: number,
  targetSampleSize: number,
  dailyTraffic: number
): number {
  if (currentSampleSize >= targetSampleSize) {
    return 0;
  }
  
  const remaining = targetSampleSize - currentSampleSize;
  return Math.ceil(remaining / dailyTraffic);
}

// ============================================================================
// 신뢰구간 교차 확인
// ============================================================================
export function doConfidenceIntervalsOverlap(
  controlCI: { lower: number; upper: number },
  variantCI: { lower: number; upper: number }
): boolean {
  return !(controlCI.upper < variantCI.lower || variantCI.upper < controlCI.lower);
}

// ============================================================================
// 실험 결과 요약 생성
// ============================================================================
export function generateExperimentSummary(stats: ABTestStatistics): string {
  const { control_group, variant_group, statistical_test, total_sample_size } = stats;
  const analysis = analyzeExperimentResults(stats);
  
  const lines = [
    `📊 실험 결과 요약`,
    ``,
    `👥 총 참여자: ${total_sample_size.toLocaleString()}명`,
    ``,
    `📈 Control 그룹:`,
    `  - 전환율: ${control_group.conversion_rate.toFixed(2)}%`,
    `  - 신뢰구간: [${control_group.confidence_interval.lower.toFixed(2)}%, ${control_group.confidence_interval.upper.toFixed(2)}%]`,
    `  - 조회수: ${control_group.views.toLocaleString()}`,
    `  - 클릭수: ${control_group.clicks.toLocaleString()}`,
    ``,
    `📈 Variant 그룹:`,
    `  - 전환율: ${variant_group.conversion_rate.toFixed(2)}%`,
    `  - 신뢰구간: [${variant_group.confidence_interval.lower.toFixed(2)}%, ${variant_group.confidence_interval.upper.toFixed(2)}%]`,
    `  - 조회수: ${variant_group.views.toLocaleString()}`,
    `  - 클릭수: ${variant_group.clicks.toLocaleString()}`,
    ``,
    `🔬 통계 검정:`,
    `  - 카이제곱 값: ${statistical_test.chi_square.toFixed(4)}`,
    `  - P-value: ${statistical_test.p_value}`,
    `  - 유의성: ${statistical_test.is_significant ? '✅ 유의함' : '❌ 유의하지 않음'}`,
    `  - Lift: ${statistical_test.lift_percentage.toFixed(2)}%`,
    ``,
    `🏆 승자: ${analysis.winner === 'variant' ? 'Variant' : analysis.winner === 'control' ? 'Control' : '결정 불가'}`,
    `📊 신뢰도: ${analysis.confidence}`,
    ``,
    `💡 권장사항:`,
    `${analysis.recommendation}`
  ];
  
  return lines.join('\n');
}

// ============================================================================
// 실험 진행률 계산
// ============================================================================
export function calculateExperimentProgress(
  currentSampleSize: number,
  minimumSampleSize: number
): number {
  if (minimumSampleSize === 0) return 100;
  return Math.min(100, (currentSampleSize / minimumSampleSize) * 100);
}

