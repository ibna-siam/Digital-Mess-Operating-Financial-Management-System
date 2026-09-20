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
