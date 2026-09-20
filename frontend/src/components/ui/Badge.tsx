import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'success', size, className = '', children }) => {
  const actualVariant = variant === 'primary' ? 'info' : variant;
  const sizeClass = size ? `badge-${size}` : '';
  return <span className={`badge badge-${actualVariant} ${sizeClass} ${className}`.trim()}>{children}</span>;
};

