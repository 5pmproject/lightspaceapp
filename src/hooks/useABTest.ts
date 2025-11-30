/**
 * useABTest React Hook
 * 실험 활성화, Variant 할당, 이벤트 추적, 오프라인 지원
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ABTestVariant, UseABTestReturn, ABTestEventContext } from '../types/abtest.types';
import { abtestService } from '../services/abtest.service';

// ============================================================================
// Hook Options
// ============================================================================
interface UseABTestOptions {
  debug?: boolean;  // 디버깅 모드
  autoTrackExposure?: boolean;  // 자동 노출 추적 (기본: true)
}

// ============================================================================
// useABTest Hook
// ============================================================================
export function useABTest(
  experimentName: string, 
  options: UseABTestOptions = {}
): UseABTestReturn {
  const { debug = false, autoTrackExposure = true } = options;
  
  const [variant, setVariant] = useState<ABTestVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const experimentIdRef = useRef<string | null>(null);
  const exposureTrackedRef = useRef(false);
  const initializingRef = useRef(false);

  // ============================================================================
  // 실험 초기화
  // ============================================================================
  useEffect(() => {
    // 중복 초기화 방지
    if (initializingRef.current) return;
    initializingRef.current = true;

    async function initializeExperiment() {
      try {
        if (debug) {
          console.log('[A/B Test] Initializing experiment:', experimentName);
        }

        // Variant 할당
        const { variant: assignedVariant, experimentId, isEligible: eligible } = 
          await abtestService.getUserVariant(experimentName);
        
        experimentIdRef.current = experimentId;
        setIsEligible(eligible);
        
        if (!eligible || !assignedVariant) {
          if (debug) {
            console.log('[A/B Test] User not eligible for experiment');
          }
          setIsLoading(false);
          initializingRef.current = false;
          return;
        }
        
        setVariant(assignedVariant);
        setIsLoading(false);
        
        // 자동 노출 추적
        if (autoTrackExposure && experimentId && !exposureTrackedRef.current) {
          await abtestService.trackEvent(
            experimentId,
            assignedVariant,
            'experiment_exposure'
          );
          exposureTrackedRef.current = true;
          
          if (debug) {
            console.log('[A/B Test] Exposure tracked');
          }
        }
        
        if (debug) {
          console.log('[A/B Test] Initialized:', {
            experiment: experimentName,
            variant: assignedVariant,
            experimentId,
            isEligible: eligible
          });
        }
      } catch (err) {
        console.error('[A/B Test] Initialization failed:', err);
        setError(err as Error);
        setIsLoading(false);
      } finally {
        initializingRef.current = false;
      }
    }
    
    initializeExperiment();
  }, [experimentName, debug, autoTrackExposure]);

  // ============================================================================
  // 이벤트 추적 함수
  // ============================================================================
  const trackEvent = useCallback(async (
    eventType: string,
    eventData?: any,
    context?: ABTestEventContext
  ) => {
    if (!experimentIdRef.current || !variant) {
      if (debug) {
        console.warn('[A/B Test] Cannot track event: experiment not initialized');
      }
      return;
    }
    
    try {
      const success = await abtestService.trackEvent(
        experimentIdRef.current,
        variant,
        eventType,
        eventData,
        context
      );
      
      if (debug) {
        console.log('[A/B Test] Event tracked:', {
          eventType,
          eventData,
          variant,
          success,
          queued: !success
        });
      }
    } catch (err) {
      console.error('[A/B Test] Failed to track event:', err);
    }
  }, [variant, debug]);

  // ============================================================================
  // 반환값
  // ============================================================================
  return {
    variant,
    isLoading,
    isEligible,
    error,
    trackEvent,
    debugInfo: debug ? {
      experimentName,
      variant,
      experimentId: experimentIdRef.current
    } : null
  };
}

// ============================================================================
// useABTestStatistics Hook (관리자용)
// ============================================================================
interface UseABTestStatisticsOptions {
  experimentId: string;
  refreshInterval?: number;  // ms, 0이면 자동 갱신 안 함
}

export function useABTestStatistics(options: UseABTestStatisticsOptions) {
  const { experimentId, refreshInterval = 0 } = options;
  
  const [statistics, setStatistics] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [guardrails, setGuardrails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [stats, analyzed, guardrailCheck] = await Promise.all([
        abtestService.getStatistics(experimentId),
        abtestService.analyzeExperiment(experimentId),
        abtestService.checkGuardrails(experimentId)
      ]);
      
      setStatistics(stats);
      setAnalysis(analyzed);
      setGuardrails(guardrailCheck);
      setError(null);
    } catch (err) {
      console.error('[A/B Test] Failed to fetch statistics:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [experimentId]);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    statistics,
    analysis,
    guardrails,
    isLoading,
    error,
    refresh: fetchData
  };
}

// ============================================================================
// useExperimentVariant Hook (간단한 버전)
// ============================================================================
export function useExperimentVariant(experimentName: string): ABTestVariant | null {
  const { variant } = useABTest(experimentName, { autoTrackExposure: true });
  return variant;
}

