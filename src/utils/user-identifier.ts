/**
 * 사용자 식별 및 세그멘테이션 Utility
 * localStorage/sessionStorage 기반 식별자 관리
 */

import { v4 as uuidv4 } from 'uuid';
import { UserIdentification, UserSegments } from '../types/abtest.types';

// ============================================================================
// Storage Keys
// ============================================================================
const SESSION_ID_KEY = 'ab_test_session_id';
const DEVICE_ID_KEY = 'ab_test_device_id';
const USER_ID_KEY = 'ab_test_user_id';

// ============================================================================
// 세션 ID 관리 (세션마다 새로 생성)
// ============================================================================
export function getSessionId(): string {
  // sessionStorage: 탭/창을 닫으면 삭제됨
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

// ============================================================================
// 디바이스 ID 관리 (영구 보존)
// ============================================================================
export function getDeviceId(): string {
  // localStorage: 영구 보존 (사용자가 삭제할 때까지)
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

// ============================================================================
// 사용자 ID 관리 (로그인 사용자)
// ============================================================================
export function getUserId(): string | undefined {
  // 실제 구현에서는 Supabase Auth에서 가져옴
  // 현재는 localStorage에서 가져오기
  const userId = localStorage.getItem(USER_ID_KEY);
  return userId || undefined;
}

export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

// ============================================================================
// 통합 사용자 식별
// ============================================================================
export function getUserIdentification(): UserIdentification {
  return {
    userId: getUserId(),
    sessionId: getSessionId(),
    deviceId: getDeviceId()
  };
}

// ============================================================================
// 디바이스 정보 수집
// ============================================================================
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  // 디바이스 타입 감지
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|android|iphone/i.test(ua)) {
    deviceType = 'mobile';
  }
  
  // 브라우저 감지
  let browser = 'unknown';
  let browserVersion = 'unknown';
  
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    browser = 'chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    browser = 'safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browser = 'firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browser = 'edge';
    browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || 'unknown';
  }
  
  // OS 감지
  let os = 'unknown';
  let osVersion = 'unknown';
  
  if (ua.indexOf('Win') > -1) {
    os = 'windows';
  } else if (ua.indexOf('Mac') > -1) {
    os = 'macos';
  } else if (ua.indexOf('Linux') > -1) {
    os = 'linux';
  } else if (/android/i.test(ua)) {
    os = 'android';
    osVersion = ua.match(/Android (\d+)/)?.[1] || 'unknown';
  } else if (/iphone|ipad/i.test(ua)) {
    os = 'ios';
    osVersion = ua.match(/OS (\d+)/)?.[1] || 'unknown';
  }
  
  // 화면 해상도
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  
  return {
    device_type: deviceType,
    browser,
    browser_version: browserVersion,
    os,
    os_version: osVersion,
    screen_resolution: screenResolution
  };
}

// ============================================================================
// 사용자 세그먼트 수집
// ============================================================================
export function getUserSegments(): UserSegments {
  const deviceInfo = getDeviceInfo();
  
  // 시간대 계산
  const hour = new Date().getHours();
  let timeOfDay: UserSegments['time_of_day'];
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }
  
  // 요일
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  
  // 신규 사용자 여부 (deviceId가 최근에 생성되었는지 확인)
  const isNewUser = !localStorage.getItem('user_visit_count');
  
  // 방문 횟수 증가
  const visitCount = parseInt(localStorage.getItem('user_visit_count') || '0') + 1;
  localStorage.setItem('user_visit_count', visitCount.toString());
  
  // Referrer 소스
  const referrer = document.referrer;
  let referrerSource = 'direct';
  if (referrer) {
    if (referrer.includes('google')) {
      referrerSource = 'google';
    } else if (referrer.includes('facebook')) {
      referrerSource = 'facebook';
    } else if (referrer.includes('twitter') || referrer.includes('x.com')) {
      referrerSource = 'twitter';
    } else {
      referrerSource = 'other';
    }
  }
  
  return {
    is_new_user: isNewUser,
    device_type: deviceInfo.device_type,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    referrer_source: referrerSource,
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    visit_count: visitCount
  };
}

// ============================================================================
// 세션 데이터 수집
// ============================================================================
export function getSessionData() {
  const sessionStart = sessionStorage.getItem('session_start_time');
  if (!sessionStart) {
    sessionStorage.setItem('session_start_time', new Date().toISOString());
  }
  
  const pagesVisited = parseInt(sessionStorage.getItem('pages_visited') || '0') + 1;
  sessionStorage.setItem('pages_visited', pagesVisited.toString());
  
  const previousPage = sessionStorage.getItem('previous_page');
  sessionStorage.setItem('previous_page', window.location.pathname);
  
  return {
    session_start: sessionStorage.getItem('session_start_time') || new Date().toISOString(),
    referrer: document.referrer || 'direct',
    previous_page: previousPage || 'none',
    session_duration: sessionStart ? Date.now() - new Date(sessionStart).getTime() : 0,
    pages_visited: pagesVisited
  };
}

// ============================================================================
// 페이지 컨텍스트 수집
// ============================================================================
export function getPageContext() {
  return {
    page: window.location.pathname,
    url: window.location.href,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    scroll_depth: Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    ) || 0
  };
}

// ============================================================================
// 전체 컨텍스트 수집 (이벤트 추적 시 사용)
// ============================================================================
export function getFullEventContext() {
  return {
    page_context: getPageContext(),
    device_info: getDeviceInfo(),
    session_data: getSessionData()
  };
}

// ============================================================================
// 디버깅 유틸리티
// ============================================================================
export function debugUserIdentification() {
  console.group('[A/B Test] User Identification');
  console.log('Session ID:', getSessionId());
  console.log('Device ID:', getDeviceId());
  console.log('User ID:', getUserId());
  console.log('Device Info:', getDeviceInfo());
  console.log('User Segments:', getUserSegments());
  console.groupEnd();
}

