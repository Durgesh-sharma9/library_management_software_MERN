import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  id?: string;
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  icon = FolderSearch,
  title,
  description,
  actionLabel,
  actionText,
  onAction,
}) => {
  const label = actionLabel || actionText;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="w-8 h-8" />;
    }
    return <FolderSearch className="w-8 h-8" />;
  };

  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center p-10 sm:p-14 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-2xs"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 mb-3.5 shadow-sm ring-1 ring-blue-500/10">
        {renderIcon()}
      </div>
      <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed font-medium">{description}</p>
      {label && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
        >
          {label}
        </button>
      )}
    </div>
  );
};


