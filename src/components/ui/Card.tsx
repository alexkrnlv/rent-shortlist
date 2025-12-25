import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function Card({ children, className = '', onClick, selected }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-card border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-soft' : ''
      } ${selected ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900' : 'border-gray-100 dark:border-gray-700'} ${className}`}
    >
      {children}
    </div>
  );
}
