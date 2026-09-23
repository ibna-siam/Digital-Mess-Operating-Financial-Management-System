import React from 'react';

export const Skeleton: React.FC<{ width?: string | number; height?: string | number; borderRadius?: string }> = ({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-sm)',
}) => {
  return <div className="skeleton" style={{ width, height, borderRadius }} />;
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 14 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{message}</span>
    </div>
  );
};

export const AppViewSkeleton: React.FC<{
  title?: string;
  hasKpis?: boolean;
  itemCount?: number;
}> = ({ title, hasKpis = true, itemCount = 4 }) => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-pulse p-3 sm:p-5">
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-xl font-bold text-slate-400">{title}</h1>
          ) : (
            <div className="h-7 w-44 bg-slate-200/80 rounded-xl" />
          )}
          <div className="h-3.5 w-64 bg-slate-100 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200/80 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200/80 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      {hasKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-slate-200/80 rounded" />
                <div className="w-7 h-7 rounded-xl bg-slate-100" />
              </div>
              <div className="h-6 w-20 bg-slate-200/80 rounded-lg" />
              <div className="h-2.5 w-14 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Filter strip skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-18 bg-slate-200/80 rounded-full shrink-0" />
        ))}
      </div>

      {/* List / Feed items skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-xs divide-y divide-slate-100/80 overflow-hidden">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-200/80 shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="h-3.5 w-32 sm:w-44 bg-slate-200/80 rounded" />
                <div className="h-2.5 w-20 sm:w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="h-4 w-14 bg-slate-200/80 rounded" />
              <div className="h-2.5 w-10 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
      {icon && <div style={{ color: 'var(--text-subtle)', marginBottom: 12 }}>{icon}</div>}
      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{title}</h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, marginBottom: action ? 16 : 0 }}>{description}</p>
      {action}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to load data', message, onRetry }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid #fecaca' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4 }}>{title}</h4>
      <p style={{ fontSize: '0.85rem', color: '#991b1b', maxWidth: 400, marginBottom: onRetry ? 14 : 0 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
          Try Again
        </button>
      )}
    </div>
  );
};
