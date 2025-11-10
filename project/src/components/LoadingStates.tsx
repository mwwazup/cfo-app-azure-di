/**
 * Loading State Components
 * Reusable loading indicators for various UI contexts
 */

import React from 'react';

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

export function Spinner({ size = 'md', className = '', color = 'primary' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ message = 'Loading...', transparent = false }: LoadingOverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-black/20' : 'bg-white/90'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-lg font-medium text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Loaders
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`bg-gray-200 ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="mb-4 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={20} className="flex-1" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={16} className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Card Skeleton
// ============================================================================

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <Skeleton height={24} width="60%" className="mb-4" />
      <Skeleton height={16} className="mb-2" />
      <Skeleton height={16} className="mb-2" />
      <Skeleton height={16} width="80%" />
    </div>
  );
}

// ============================================================================
// Loading Container
// ============================================================================

interface LoadingContainerProps {
  isLoading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  isEmpty?: boolean;
}

export function LoadingContainer({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  isEmpty = false,
}: LoadingContainerProps) {
  if (isLoading) {
    return <>{loadingComponent || <CenteredSpinner />}</>;
  }

  if (error) {
    return <>{errorComponent || <ErrorDisplay error={error} />}</>;
  }

  if (isEmpty) {
    return <>{emptyComponent || <EmptyState />}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// Centered Spinner
// ============================================================================

interface CenteredSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CenteredSpinner({ message, size = 'md' }: CenteredSpinnerProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
      <Spinner size={size} />
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}

// ============================================================================
// Error Display
// ============================================================================

interface ErrorDisplayProps {
  error: Error | string;
  retry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, retry, className = '' }: ErrorDisplayProps) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-600"
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
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {retry && (
            <button
              onClick={retry}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No data',
  message = 'There is no data to display',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
      {icon || (
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Inline Loader
// ============================================================================

interface InlineLoaderProps {
  text?: string;
  size?: 'sm' | 'md';
}

export function InlineLoader({ text = 'Loading...', size = 'sm' }: InlineLoaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size={size} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

// ============================================================================
// Button with Loading State
// ============================================================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`relative ${className} ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" color="white" />
        </span>
      )}
      <span className={isLoading ? 'invisible' : ''}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}

// ============================================================================
// Progress Bar
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showLabel = false,
  color = 'blue',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  };

  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-600">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}
