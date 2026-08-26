import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size = 'lg',
}) => {
  const effectiveSize = maxWidth || size;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[96vw] lg:max-w-7xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div
        id="modal-backdrop"
        className="fixed inset-0"
        onClick={onClose}
      />
      <div
        id="modal-dialog-container"
        className={`relative z-10 w-full ${maxWidthClasses[effectiveSize] || 'max-w-lg'} bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-4 sm:my-6 transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top subtle gradient line */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[calc(100vh-140px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};


