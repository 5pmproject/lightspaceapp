import React from 'react';

export type ErrorType = 'network' | 'auth' | 'validation' | 'server' | 'unknown';

interface ErrorMessageProps {
  message: string;
  type?: ErrorType;
  onRetry?: () => void;
  title?: string;
  fullScreen?: boolean;
}

/**
 * 에러 메시지 컴포넌트
 * 에러 타입에 따라 다른 아이콘과 동작을 제공합니다.
 * 접근성: role="alert", aria-live="assertive" 속성으로 즉시 알림
 */
export default function ErrorMessage({ 
  message, 
  type = 'unknown',
  onRetry,
  title = '오류가 발생했습니다',
  fullScreen = false 
}: ErrorMessageProps) {
  const containerClasses = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen bg-gray-100 px-6'
    : 'flex flex-col items-center justify-center min-h-[400px] px-6';

  // 에러 타입에 따른 아이콘 선택
  const getErrorIcon = () => {
    switch(type) {
      case 'network':
        return (
          <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        );
      case 'auth':
        return (
          <svg className="h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'server':
        return (
          <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        );
      default:
        return (
          <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // 네트워크 및 서버 에러만 재시도 버튼 표시
  const shouldShowRetry = onRetry && ['network', 'server'].includes(type);

  return (
    <div 
      className={containerClasses}
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center" aria-hidden="true">
          {getErrorIcon()}
        </div>

        {/* Title */}
        <h3 className="text-xl font-['Newsreader:Regular',_sans-serif] text-gray-900 mb-2">
          {title}
        </h3>

        {/* Error Message */}
        <p className="text-red-500 text-base font-['Inter:Regular',_sans-serif] mb-6">
          {message}
        </p>

        {/* Retry Button */}
        {shouldShowRetry && (
          <button
            onClick={onRetry}
            className="bg-[#E07B39] text-white px-6 py-2 rounded-lg font-['Inter:Regular',_sans-serif] text-sm hover:bg-[#d06f30] transition-colors"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineErrorMessage({ 
  message, 
  onRetry,
  type = 'unknown'
}: { 
  message: string; 
  onRetry?: () => void;
  type?: ErrorType;
}) {
  const shouldShowRetry = onRetry && ['network', 'server'].includes(type);

  return (
    <div 
      className="flex flex-col items-center justify-center py-8 px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center">
        <svg
          className="h-10 w-10 text-red-500 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-red-500 text-sm font-['Inter:Regular',_sans-serif] mb-3">
          {message}
        </p>
        {shouldShowRetry && (
          <button
            onClick={onRetry}
            className="text-[#E07B39] text-sm font-['Inter:Regular',_sans-serif] underline hover:text-[#d06f30]"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastErrorMessage({ 
  message, 
  onClose 
}: { 
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-in">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-red-800 text-sm font-['Inter:Regular',_sans-serif] flex-1">
          {message}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 flex-shrink-0"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

