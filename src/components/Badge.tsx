import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' | 'sky' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/80 font-bold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80 font-bold',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80 font-bold',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80 font-bold',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200/80 font-bold',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-[11px]',
    lg: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full tracking-wide uppercase whitespace-nowrap shadow-2xs ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};


