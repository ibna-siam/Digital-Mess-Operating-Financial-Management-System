import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size,
  icon,
  isLoading,
  disabled,
  className = '',
  ...props
}) => {
  const sizeClass = size ? `btn-${size}` : '';
  const actualVariant = (variant === 'outline' || variant === 'ghost') ? 'secondary' : variant;
  return (
    <button
      className={`btn btn-${actualVariant} ${variant === 'outline' ? 'btn-outline' : ''} ${sizeClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
