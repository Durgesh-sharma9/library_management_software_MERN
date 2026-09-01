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
      cardBg: 'bg-[#EFF6FF] border-[#BFDBFE] hover:border-blue-400 hover:shadow-blue-100',
      text: 'text-blue-950',
      title: 'text-blue-700',
      subtitle: 'text-blue-600/80',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      iconBg: 'bg-blue-600 text-white shadow-xs shadow-blue-500/30',
      borderSep: 'border-blue-200/60',
    },
    emerald: {
      cardBg: 'bg-[#ECFDF5] border-[#A7F3D0] hover:border-emerald-400 hover:shadow-emerald-100',
      text: 'text-emerald-950',
      title: 'text-emerald-700',
      subtitle: 'text-emerald-600/80',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30',
      borderSep: 'border-emerald-200/60',
    },
    amber: {
      cardBg: 'bg-[#FFFBEB] border-[#FDE68A] hover:border-amber-400 hover:shadow-amber-100',
      text: 'text-amber-950',
      title: 'text-amber-700',
      subtitle: 'text-amber-600/80',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      iconBg: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30',
      borderSep: 'border-amber-200/60',
    },
    rose: {
      cardBg: 'bg-[#FFF1F2] border-[#FECDD3] hover:border-rose-400 hover:shadow-rose-100',
      text: 'text-rose-950',
      title: 'text-rose-700',
      subtitle: 'text-rose-600/80',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-500 text-white shadow-xs shadow-rose-500/30',
      borderSep: 'border-rose-200/60',
    },
    purple: {
      cardBg: 'bg-[#FAF5FF] border-[#E9D5FF] hover:border-purple-400 hover:shadow-purple-100',
      text: 'text-purple-950',
      title: 'text-purple-700',
      subtitle: 'text-purple-600/80',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      iconBg: 'bg-purple-600 text-white shadow-xs shadow-purple-500/30',
      borderSep: 'border-purple-200/60',
    },
    indigo: {
      cardBg: 'bg-[#EEF2FF] border-[#C7D2FE] hover:border-indigo-400 hover:shadow-indigo-100',
      text: 'text-indigo-950',
      title: 'text-indigo-700',
      subtitle: 'text-indigo-600/80',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      iconBg: 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/30',
      borderSep: 'border-indigo-200/60',
    },
    sky: {
      cardBg: 'bg-[#F0F9FF] border-[#BAE6FD] hover:border-sky-400 hover:shadow-sky-100',
      text: 'text-sky-950',
      title: 'text-sky-700',
      subtitle: 'text-sky-600/80',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
      iconBg: 'bg-sky-500 text-white shadow-xs shadow-sky-500/30',
      borderSep: 'border-sky-200/60',
    },
    teal: {
      cardBg: 'bg-[#F0FDFA] border-[#99F6E4] hover:border-teal-400 hover:shadow-teal-100',
      text: 'text-teal-950',
      title: 'text-teal-700',
      subtitle: 'text-teal-600/80',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
      iconBg: 'bg-teal-600 text-white shadow-xs shadow-teal-500/30',
      borderSep: 'border-teal-200/60',
    },
    slate: {
      cardBg: 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-400 hover:shadow-slate-100',
      text: 'text-slate-900',
      title: 'text-slate-600',
      subtitle: 'text-slate-500',
      badge: 'bg-slate-200 text-slate-700 border-slate-300',
      iconBg: 'bg-slate-700 text-white shadow-xs shadow-slate-500/30',
      borderSep: 'border-slate-200',
    },
  };

  const scheme = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative overflow-hidden ${scheme.cardBg} p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${scheme.title}`}>
            {title}
          </span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${scheme.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight ${scheme.text}`}>
          {value !== undefined && value !== null ? value : 0}
        </div>
      </div>

      <div className={`mt-3 flex items-center justify-between gap-1 pt-2.5 border-t ${scheme.borderSep}`}>
        {subtitle && (
          <span className={`text-[11px] font-semibold truncate ${scheme.subtitle}`}>{subtitle}</span>
        )}
        {badgeText && (
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${scheme.badge}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};


