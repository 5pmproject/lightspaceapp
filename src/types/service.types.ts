/**
 * 서비스 레이어 공통 타입 정의
 * 출처: Microsoft TypeScript Handbook - Error Handling Patterns
 */

export type ServiceResult<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: ServiceError;
};

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export enum ErrorCode {
  // 일반 에러
  UNKNOWN = 'UNKNOWN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 데이터베이스 에러
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // 비즈니스 로직 에러
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_PRICE = 'INVALID_PRICE',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  INVALID_ORDER_AMOUNT = 'INVALID_ORDER_AMOUNT',
}

// 유틸리티 함수
export function createSuccess<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

export function createError<T>(
  message: string,
  code: string = ErrorCode.UNKNOWN,
  details?: unknown
): ServiceResult<T> {
  return {
    data: null,
    error: new ServiceError(message, code, details),
  };
}



