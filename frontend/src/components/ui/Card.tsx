import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  rightAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, rightAction }) => {
  return (
    <div className={`content-card ${className}`}>
      {title && (
        <div className="card-title-row">
          <h3 className="card-title">{title}</h3>
          {rightAction}
        </div>
      )}
      {children}
    </div>
  );
};
