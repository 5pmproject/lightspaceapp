/**
 * 데이터 포맷팅 유틸리티
 * 안전한 타입 체크와 에러 핸들링을 제공합니다.
 * 출처: MDN - Intl.DateTimeFormat, TypeScript Handbook - Type Guards
 */

// 포맷터 인스턴스를 한 번만 생성 (성능 최적화)
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateOnlyFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * 가격 포맷팅 (안전한 버전)
 * @param price - 포맷팅할 가격 (숫자)
 * @returns 포맷팅된 가격 문자열 (예: ₩10,000)
 * @throws {Error} price가 유효한 숫자가 아닌 경우
 * 
 * @example
 * formatPrice(10000) // "₩10,000"
 * formatPrice(119000) // "₩119,000"
 */
export function formatPrice(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error(`Invalid price: ${price}. Expected a valid number.`);
  }
  
  if (price < 0) {
    throw new Error(`Invalid price: ${price}. Price cannot be negative.`);
  }
  
  return `₩${price.toLocaleString('ko-KR')}`;
}

/**
 * 가격 포맷팅 (안전한 버전 - 폴백 포함)
 * @param price - 포맷팅할 가격 (숫자)
 * @param fallback - 에러 시 반환할 기본값
 * @returns 포맷팅된 가격 문자열 또는 폴백 값
 * 
 * @example
 * formatPriceSafe(10000) // "₩10,000"
 * formatPriceSafe(null as any, "가격 없음") // "가격 없음"
 */
export function formatPriceSafe(price: number, fallback: string = '₩0'): string {
  try {
    return formatPrice(price);
  } catch {
    return fallback;
  }
}

/**
 * 날짜 포맷팅 (안전한 버전)
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷팅된 날짜 문자열 (예: 2024년 11월 26일 14:30)
 * @throws {Error} 유효하지 않은 날짜 문자열인 경우
 * 
 * @example
 * formatDate('2024-11-26T14:30:00Z') // "2024년 11월 26일 14:30"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  return dateFormatter.format(date);
}

/**
 * 날짜만 포맷팅 (시간 제외)
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷팅된 날짜 문자열 (예: 2024년 11월 26일)
 * @throws {Error} 유효하지 않은 날짜 문자열인 경우
 * 
 * @example
 * formatDateOnly('2024-11-26T14:30:00Z') // "2024년 11월 26일"
 */
export function formatDateOnly(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  return dateOnlyFormatter.format(date);
}

/**
 * 날짜 포맷팅 (안전한 버전 - 폴백 포함)
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @param fallback - 에러 시 반환할 기본값
 * @returns 포맷팅된 날짜 문자열 또는 폴백 값
 * 
 * @example
 * formatDateSafe('2024-11-26T14:30:00Z') // "2024년 11월 26일 14:30"
 * formatDateSafe('invalid', '날짜 없음') // "날짜 없음"
 */
export function formatDateSafe(dateString: string, fallback: string = '-'): string {
  try {
    return formatDate(dateString);
  } catch {
    return fallback;
  }
}

/**
 * 주문 상태 타입 정의
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

/**
 * 주문 상태 매핑 (const assertion으로 타입 안정성 강화)
 */
const ORDER_STATUS_MAP: Record<OrderStatus, string> = {
  pending: '대기중',
  processing: '처리중',
  completed: '완료',
  cancelled: '취소됨',
} as const;

/**
 * 주문 상태를 한글로 변환
 * @param status - 주문 상태
 * @returns 한글 상태 문자열
 * 
 * @example
 * translateOrderStatus('pending') // "대기중"
 * translateOrderStatus('completed') // "완료"
 */
export function translateOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_MAP[status];
}

/**
 * 전화번호 포맷팅
 * @param phone - 전화번호 문자열 (숫자만 또는 하이픈 포함)
 * @returns 포맷팅된 전화번호 (예: 010-1234-5678)
 * 
 * @example
 * formatPhoneNumber('01012345678') // "010-1234-5678"
 * formatPhoneNumber('010-1234-5678') // "010-1234-5678"
 */
export function formatPhoneNumber(phone: string): string {
  // 숫자만 추출
  const numbers = phone.replace(/\D/g, '');
  
  // 11자리 핸드폰 번호
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }
  
  // 10자리 전화번호
  if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  
  // 서울 지역번호 (02)
  if (numbers.length === 9 && numbers.startsWith('02')) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
  }
  
  // 포맷팅 불가능한 경우 원본 반환
  return phone;
}

/**
 * 카드 번호 마스킹
 * @param cardNumber - 카드 번호 (16자리)
 * @returns 마스킹된 카드 번호 (예: 1234-****-****-5678)
 * 
 * @example
 * maskCardNumber('1234567890123456') // "1234-****-****-3456"
 * maskCardNumber('1234 5678 9012 3456') // "1234-****-****-3456"
 */
export function maskCardNumber(cardNumber: string): string {
  // 숫자만 추출
  const numbers = cardNumber.replace(/\D/g, '');
  
  if (numbers.length !== 16) {
    throw new Error('카드 번호는 16자리여야 합니다.');
  }
  
  return `${numbers.slice(0, 4)}-****-****-${numbers.slice(-4)}`;
}

/**
 * 숫자를 천 단위 구분자로 포맷팅
 * @param num - 포맷팅할 숫자
 * @returns 천 단위 구분자가 적용된 문자열
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`Invalid number: ${num}`);
  }
  
  return num.toLocaleString('ko-KR');
}

/**
 * 상대 시간 포맷팅 (예: "3분 전", "2시간 전")
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 상대 시간 문자열
 * 
 * @example
 * formatRelativeTime('2024-11-26T14:30:00Z') // "5분 전"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return formatDateOnly(dateString);
  }
}

