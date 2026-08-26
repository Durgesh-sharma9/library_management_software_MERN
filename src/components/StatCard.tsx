import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'slate' | 'sky' | 'teal';
  onClick?: () => void;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  onClick,
  badgeText,
}) => {
  const colorStyles = {
    blue: {
      text: 'text-slate-900',
      badge: 'bg-sky-50/90 text-sky-700 border border-sky-200/60',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      cardHover: 'hover:border-sky-200 hover:bg-sky-50/20',
    },
    emerald: {
      text: 'text-slate-900',
      badge: 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/60',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      cardHover: 'hover:border-emerald-200 hover:bg-emerald-50/20',
    },
    amber: {
      text: 'text-slate-900',
      badge: 'bg-amber-50/90 text-amber-800 border border-amber-200/60',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      cardHover: 'hover:border-amber-200 hover:bg-amber-50/20',
    },
    rose: {
      text: 'text-slate-900',
      badge: 'bg-rose-50/90 text-rose-700 border border-rose-200/60',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      cardHover: 'hover:border-rose-200 hover:bg-rose-50/20',
    },
    purple: {
      text: 'text-slate-900',
      badge: 'bg-purple-50/90 text-purple-700 border border-purple-200/60',
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      cardHover: 'hover:border-purple-200 hover:bg-purple-50/20',
    },
    indigo: {
      text: 'text-slate-900',
      badge: 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/60',
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      cardHover: 'hover:border-indigo-200 hover:bg-indigo-50/20',
    },
    sky: {
      text: 'text-slate-900',
      badge: 'bg-sky-50/90 text-sky-700 border border-sky-200/60',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      cardHover: 'hover:border-sky-200 hover:bg-sky-50/20',
    },
    teal: {
      text: 'text-slate-900',
      badge: 'bg-teal-50/90 text-teal-700 border border-teal-200/60',
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
      cardHover: 'hover:border-teal-200 hover:bg-teal-50/20',
    },
    slate: {
      text: 'text-slate-900',
      badge: 'bg-slate-100 text-slate-700 border border-slate-200/60',
      iconBg: 'bg-slate-100 text-slate-600 border border-slate-200/60',
      cardHover: 'hover:border-slate-300 hover:bg-slate-50/40',
    },
  };

  const scheme = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative overflow-hidden bg-white px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between transition-all duration-150 ${
        scheme.cardHover
      } ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
            {title}
          </span>
          <div className={`p-1.5 rounded-lg shrink-0 ${scheme.iconBg}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold mt-0.5 tracking-tight ${scheme.text}`}>
          {value !== undefined && value !== null ? value : 0}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
        {subtitle && (
          <span className="text-[10px] text-slate-400 font-medium truncate">{subtitle}</span>
        )}
        {badgeText && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${scheme.badge}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};


