/**
 * A/B 테스트 서비스
 * Supabase 기반 실험 관리, 오프라인 큐잉, 자동 재시도
 */

import { supabase } from '../lib/supabase';
import {
  ABTestExperiment,
  ABTestVariant,
  ABTestEventContext,
  ABTestStatistics,
  ExperimentAnalysis,
  GuardrailCheckResult,
  QueuedEvent
} from '../types/abtest.types';
import {
  getUserIdentification,
  getDeviceInfo,
  getUserSegments,
  getFullEventContext
} from '../utils/user-identifier';

// ============================================================================
// 상수
// ============================================================================
const VARIANT_STORAGE_KEY = 'ab_test_variants';
const EVENT_QUEUE_KEY = 'ab_test_event_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 3;

// ============================================================================
// localStorage 기반 Variant 저장
// ============================================================================
function getStoredVariant(experimentName: string): ABTestVariant | null {
  try {
    const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
    if (!stored) return null;
    
    const variants = JSON.parse(stored);
    return variants[experimentName] || null;
  } catch (error) {
    console.error('Failed to get stored variant:', error);
    return null;
  }
}

function storeVariant(experimentName: string, variant: ABTestVariant): void {
  try {
    const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
    const variants = stored ? JSON.parse(stored) : {};
    variants[experimentName] = variant;
    localStorage.setItem(VARIANT_STORAGE_KEY, JSON.stringify(variants));
  } catch (error) {
    console.error('Failed to store variant:', error);
  }
}

// ============================================================================
// 오프라인 이벤트 큐 관리
// ============================================================================
function queueEvent(event: QueuedEvent): void {
  try {
    const stored = localStorage.getItem(EVENT_QUEUE_KEY);
    const queue: QueuedEvent[] = stored ? JSON.parse(stored) : [];
    
    // 큐 크기 제한
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift(); // 가장 오래된 이벤트 제거
    }
    
    queue.push(event);
    localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue event:', error);
  }
}

function getEventQueue(): QueuedEvent[] {
  try {
    const stored = localStorage.getItem(EVENT_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get event queue:', error);
    return [];
  }
}

function clearEventQueue(): void {
  try {
    localStorage.removeItem(EVENT_QUEUE_KEY);
  } catch (error) {
    console.error('Failed to clear event queue:', error);
  }
}

function removeEventFromQueue(timestamp: number): void {
  try {
    const queue = getEventQueue();
    const filtered = queue.filter(e => e.timestamp !== timestamp);
    localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove event from queue:', error);
  }
}

// ============================================================================
// A/B 테스트 서비스
// ============================================================================
export const abtestService = {
  /**
   * 활성 실험 목록 조회
   */
  async getActiveExperiments(): Promise<ABTestExperiment[]> {
    try {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'running');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[AB Test] Failed to fetch active experiments:', error);
      return [];
    }
  },

  /**
   * 특정 실험 조회
   */
  async getExperiment(experimentName: string): Promise<ABTestExperiment | null> {
    try {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('name', experimentName)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[AB Test] Failed to fetch experiment:', error);
      return null;
    }
  },

  /**
   * 사용자 Variant 할당 (localStorage 우선, 없으면 DB 조회 또는 새로 할당)
   */
  async getUserVariant(experimentName: string): Promise<{
    variant: ABTestVariant | null;
    experimentId: string | null;
    isEligible: boolean;
  }> {
    try {
      // 1. localStorage 확인
      const storedVariant = getStoredVariant(experimentName);
      if (storedVariant) {
        const experiment = await this.getExperiment(experimentName);
        return {
          variant: storedVariant,
          experimentId: experiment?.id || null,
          isEligible: true
        };
      }
      
      // 2. 활성 실험 확인
      const experiment = await this.getExperiment(experimentName);
      
      if (!experiment || !experiment.is_active || experiment.status !== 'running') {
        return {
          variant: null,
          experimentId: null,
          isEligible: false
        };
      }
      
      // 3. Exposure 제한 확인
      if (experiment.max_exposure_percentage < 100) {
        const random = Math.random() * 100;
        if (random > experiment.max_exposure_percentage) {
          return {
            variant: null,
            experimentId: experiment.id,
            isEligible: false
          };
        }
      }
      
      const { sessionId, deviceId, userId } = getUserIdentification();
      
      // 4. 기존 할당 확인
      const { data: existingAssignment } = await supabase
        .from('ab_test_assignments')
        .select('variant')
        .eq('experiment_id', experiment.id)
        .eq('session_id', sessionId)
        .single();
      
      if (existingAssignment) {
        const variant = existingAssignment.variant as ABTestVariant;
        storeVariant(experimentName, variant);
        return {
          variant,
          experimentId: experiment.id,
          isEligible: true
        };
      }
      
      // 5. 새로 할당 (50/50)
      const variant: ABTestVariant = Math.random() < 0.5 ? 'control' : 'variant';
      
      // 6. DB에 저장
      const userSegments = getUserSegments();
      const { error: assignmentError } = await supabase
        .from('ab_test_assignments')
        .insert({
          experiment_id: experiment.id,
          session_id: sessionId,
          device_id: deviceId,
          user_id: userId,
          variant,
          user_segments: userSegments
        });
      
      if (assignmentError) {
        console.error('[AB Test] Failed to save assignment:', assignmentError);
      }
      
      // 7. localStorage에 저장
      storeVariant(experimentName, variant);
      
      return {
        variant,
        experimentId: experiment.id,
        isEligible: true
      };
    } catch (error) {
      console.error('[AB Test] Failed to get user variant:', error);
      return {
        variant: null,
        experimentId: null,
        isEligible: false
      };
    }
  },

  /**
   * 이벤트 추적 (오프라인 큐잉 지원)
   */
  async trackEvent(
    experimentId: string,
    variant: ABTestVariant,
    eventType: string,
    eventData?: any,
    context?: ABTestEventContext
  ): Promise<boolean> {
    const eventPayload = {
      experimentId,
      variant,
      eventType,
      eventData,
      context: context || getFullEventContext()
    };
    
    // 오프라인 체크
    if (!navigator.onLine) {
      queueEvent({
        eventType,
        eventData,
        context: eventPayload.context,
        timestamp: Date.now(),
        retryCount: 0
      });
      return false;
    }
    
    try {
      const { sessionId, deviceId, userId } = getUserIdentification();
      
      const { error } = await supabase
        .from('ab_test_events')
        .insert({
          experiment_id: experimentId,
          session_id: sessionId,
          device_id: deviceId,
          user_id: userId,
          variant,
          event_type: eventType,
          event_data: eventData || {},
          page_context: eventPayload.context.page_context || {},
          device_info: eventPayload.context.device_info || getDeviceInfo(),
          session_data: eventPayload.context.session_data || {}
        });
      
      if (error) throw error;
      
      // 성공 시 큐에 있는 이벤트 처리
      await this.flushEventQueue(experimentId, variant);
      
      return true;
    } catch (error) {
      console.error('[AB Test] Failed to track event:', error);
      
      // 실패 시 큐에 저장
      queueEvent({
        eventType,
        eventData,
        context: eventPayload.context,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      return false;
    }
  },

  /**
   * 큐에 쌓인 이벤트 처리
   */
  async flushEventQueue(experimentId: string, variant: ABTestVariant): Promise<void> {
    if (!navigator.onLine) return;
    
    const queue = getEventQueue();
    if (queue.length === 0) return;
    
    const { sessionId, deviceId, userId } = getUserIdentification();
    
    for (const queuedEvent of queue) {
      if (queuedEvent.retryCount >= MAX_RETRY_COUNT) {
        removeEventFromQueue(queuedEvent.timestamp);
        continue;
      }
      
      try {
        const { error } = await supabase
          .from('ab_test_events')
          .insert({
            experiment_id: experimentId,
            session_id: sessionId,
            device_id: deviceId,
            user_id: userId,
            variant,
            event_type: queuedEvent.eventType,
            event_data: queuedEvent.eventData || {},
            page_context: queuedEvent.context?.page_context || {},
            device_info: queuedEvent.context?.device_info || getDeviceInfo(),
            session_data: queuedEvent.context?.session_data || {}
          });
        
        if (error) throw error;
        
        // 성공 시 큐에서 제거
        removeEventFromQueue(queuedEvent.timestamp);
      } catch (error) {
        console.error('[AB Test] Failed to flush queued event:', error);
        
        // 재시도 횟수 증가
        queuedEvent.retryCount++;
      }
    }
  },

  /**
   * 실험 통계 조회
   */
  async getStatistics(experimentId: string): Promise<ABTestStatistics | null> {
    try {
      const { data, error } = await supabase.rpc('get_ab_test_statistics', {
        experiment_id_param: experimentId
      });
      
      if (error) throw error;
      return data as ABTestStatistics;
    } catch (error) {
      console.error('[AB Test] Failed to get statistics:', error);
      return null;
    }
  },

  /**
   * 실험 결과 분석
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentAnalysis | null> {
    try {
      const { data, error } = await supabase.rpc('analyze_experiment_results', {
        experiment_id_param: experimentId
      });
      
      if (error) throw error;
      return data as ExperimentAnalysis;
    } catch (error) {
      console.error('[AB Test] Failed to analyze experiment:', error);
      return null;
    }
  },

  /**
   * 필요 샘플 크기 계산
   */
  async calculateRequiredSampleSize(
    baselineRate: number,
    mde: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_sample_size', {
        baseline_rate: baselineRate,
        mde: mde
      });
      
      if (error) throw error;
      return data as number;
    } catch (error) {
      console.error('[AB Test] Failed to calculate sample size:', error);
      return 1000; // 기본값
    }
  },

  /**
   * 가드레일 체크
   */
  async checkGuardrails(experimentId: string): Promise<GuardrailCheckResult | null> {
    try {
      const { data, error } = await supabase.rpc('check_guardrails', {
        experiment_id_param: experimentId
      });
      
      if (error) throw error;
      return data as GuardrailCheckResult;
    } catch (error) {
      console.error('[AB Test] Failed to check guardrails:', error);
      return null;
    }
  },

  /**
   * 실시간 지표 갱신
   */
  async refreshMetrics(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_ab_test_metrics');
      if (error) throw error;
    } catch (error) {
      console.error('[AB Test] Failed to refresh metrics:', error);
    }
  }
};

// ============================================================================
// 온라인/오프라인 이벤트 리스너
// ============================================================================
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[AB Test] Back online. Flushing event queue...');
    // 큐 비우기는 다음 trackEvent 호출 시 자동으로 처리됨
  });
  
  window.addEventListener('offline', () => {
    console.log('[AB Test] Offline. Events will be queued.');
  });
}

