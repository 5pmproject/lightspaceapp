import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

/**
 * 로딩 스피너 컴포넌트
 * 접근성: role="status", aria-live="polite" 속성으로 스크린 리더 지원
 * 출처: React 공식 문서 - Accessibility, WAI-ARIA 1.2 - Status role
 */
export default function LoadingSpinner({ 
  message = '로딩 중...', 
  size = 'medium',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-6 w-6 border-2',
    medium: 'h-12 w-12 border-b-2',
    large: 'h-16 w-16 border-b-3',
  };

  const containerClasses = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen bg-gray-100'
    : 'flex flex-col items-center justify-center min-h-[400px]';

  return (
    <div 
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className={`animate-spin rounded-full border-[#E07B39] ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      {message && (
        <p className="mt-4 text-gray-600 text-sm font-['Inter:Regular',_sans-serif]">
          {message}
        </p>
      )}
    </div>
  );
}

export function InlineLoadingSpinner({ message }: { message?: string }) {
  return (
    <div 
      className="flex items-center justify-center gap-2 py-4"
      role="status"
      aria-live="polite"
      aria-label={message || '로딩 중'}
    >
      <div
        className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#E07B39]"
        aria-hidden="true"
      />
      {message && (
        <span className="text-gray-600 text-sm font-['Inter:Regular',_sans-serif]">
          {message}
        </span>
      )}
    </div>
  );
}

export function ButtonLoadingSpinner() {
  return (
    <div
      className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
      role="status"
      aria-label="Loading"
    />
  );
}

