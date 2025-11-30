/**
 * A/B 테스트 관리자 대시보드
 * 실험 목록, 통계, 제어 기능
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useABTestStatistics } from '../hooks/useABTest';
import { abtestService } from '../services/abtest.service';
import { ABTestExperiment, ExperimentStatus } from '../types/abtest.types';
import { generateExperimentSummary, calculateExperimentProgress } from '../utils/experiment-analyzer';
import clsx from 'clsx';

// ============================================================================
// 메인 대시보드 컴포넌트
// ============================================================================
export default function ABTestDashboard() {
  const [experiments, setExperiments] = useState<ABTestExperiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 실험 목록 로드
  useEffect(() => {
    async function loadExperiments() {
      setIsLoading(true);
      const data = await abtestService.getActiveExperiments();
      setExperiments(data);
      if (data.length > 0) {
        setSelectedExperimentId(data[0].id);
      }
      setIsLoading(false);
    }
    loadExperiments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">A/B 테스트 대시보드</h1>
        
        {/* 실험 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 사이드바: 실험 리스트 */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">실험 목록</h2>
              <div className="space-y-2">
                {experiments.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExperimentId(exp.id)}
                    className={clsx(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      selectedExperimentId === exp.id
                        ? "bg-[#E07B39] text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <div className="font-medium truncate">{exp.description || exp.name}</div>
                    <div className="text-xs mt-1 opacity-75">
                      ICE: {exp.ice_score?.toFixed(1) || 'N/A'}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* 메인 콘텐츠: 선택된 실험 상세 */}
          <div className="md:col-span-3">
            {selectedExperimentId ? (
              <ExperimentDetail experimentId={selectedExperimentId} />
            ) : (
              <Card className="p-6">
                <p className="text-gray-500 text-center">실험을 선택하세요</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 실험 상세 컴포넌트
// ============================================================================
function ExperimentDetail({ experimentId }: { experimentId: string }) {
  const { statistics, analysis, guardrails, isLoading, error, refresh } = useABTestStatistics({
    experimentId,
    refreshInterval: 30000  // 30초마다 갱신
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">통계 로딩 중...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">오류: {error.message}</div>
      </Card>
    );
  }

  if (!statistics || !analysis) {
    return (
      <Card className="p-6">
        <div className="text-gray-500">데이터가 충분하지 않습니다</div>
      </Card>
    );
  }

  const controlRate = statistics.control_group.conversion_rate;
  const variantRate = statistics.variant_group.conversion_rate;
  const lift = statistics.statistical_test.lift_percentage;

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">실험 결과</h2>
            <p className="text-gray-600 mt-1">승자: {analysis.winner === 'variant' ? 'Variant' : analysis.winner === 'control' ? 'Control' : '결정 불가'}</p>
          </div>
          <Button onClick={refresh} variant="outline">
            새로고침
          </Button>
        </div>

        {/* 통계적 유의성 배지 */}
        <div className="flex gap-2 mb-4">
          <span className={clsx(
            "px-3 py-1 rounded-full text-sm font-medium",
            statistics.statistical_test.is_significant
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          )}>
            {statistics.statistical_test.is_significant ? '✓ 통계적으로 유의함' : '⚠ 유의하지 않음'}
          </span>
          
          <span className={clsx(
            "px-3 py-1 rounded-full text-sm font-medium",
            analysis.confidence === 'high' ? "bg-green-100 text-green-800" :
            analysis.confidence === 'medium' ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )}>
            신뢰도: {analysis.confidence}
          </span>
        </div>

        {/* 권장사항 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 권장사항</h3>
          <p className="text-blue-800">{analysis.recommendation}</p>
        </div>

        {/* SRM 경고 */}
        {statistics.srm_check.is_violated && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-900 mb-2">⚠ SRM 경고</h3>
            <p className="text-red-800">{statistics.srm_check.message}</p>
          </div>
        )}

        {/* 가드레일 경고 */}
        {guardrails && !guardrails.all_passed && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-orange-900 mb-2">🚨 가드레일 위반</h3>
            {guardrails.violated_guardrails.map((g: any, i: number) => (
              <p key={i} className="text-orange-800">
                {g.metric_name}: {g.current_value} {g.operator} {g.threshold}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* 그룹별 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Control 그룹 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Control 그룹</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">전환율</div>
              <div className="text-3xl font-bold text-gray-900">
                {controlRate.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                신뢰구간: [{statistics.control_group.confidence_interval.lower.toFixed(2)}%, {statistics.control_group.confidence_interval.upper.toFixed(2)}%]
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">조회수</span>
                <span className="font-medium">{statistics.control_group.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">클릭수</span>
                <span className="font-medium">{statistics.control_group.clicks.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Variant 그룹 */}
        <Card className="p-6 border-2 border-[#E07B39]">
          <h3 className="text-lg font-semibold mb-4">Variant 그룹</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">전환율</div>
              <div className="text-3xl font-bold text-[#E07B39]">
                {variantRate.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                신뢰구간: [{statistics.variant_group.confidence_interval.lower.toFixed(2)}%, {statistics.variant_group.confidence_interval.upper.toFixed(2)}%]
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">조회수</span>
                <span className="font-medium">{statistics.variant_group.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">클릭수</span>
                <span className="font-medium">{statistics.variant_group.clicks.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Lift 시각화 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">성능 향상률 (Lift)</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "absolute h-full transition-all",
                  lift > 0 ? "bg-green-500" : lift < 0 ? "bg-red-500" : "bg-gray-400"
                )}
                style={{
                  width: `${Math.abs(lift) * 5}%`,
                  maxWidth: '100%'
                }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold" style={{ color: lift > 0 ? '#10b981' : lift < 0 ? '#ef4444' : '#6b7280' }}>
            {lift > 0 ? '+' : ''}{lift.toFixed(2)}%
          </div>
        </div>
      </Card>

      {/* 통계 요약 (텍스트) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">상세 통계</h3>
        <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
          {generateExperimentSummary(statistics)}
        </pre>
      </Card>
    </div>
  );
}

