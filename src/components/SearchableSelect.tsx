import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface Option {
  id?: string;
  value?: string;
  label: string;
  subLabel?: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  id?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getOptionValue = (opt: Option): string => {
    return opt.id ?? opt.value ?? '';
  };

  const getOptionKey = (opt: Option, index: number): string => {
    return opt.id || opt.value || `${opt.label}-${index}`;
  };

  const getOptionSubLabel = (opt: Option): string | undefined => {
    return opt.subLabel || opt.sublabel;
  };

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);

  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.toLowerCase();
    const sub = getOptionSubLabel(opt);
    return (
      opt.label.toLowerCase().includes(term) ||
      (sub && sub.toLowerCase().includes(term))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (opt: Option) => {
    if (opt.disabled) return;
    onChange(getOptionValue(opt));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-left transition-all ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0 pr-2 py-0.5">
          {selectedOption ? (
            <div className="flex flex-col text-left">
              <span className="font-semibold text-slate-900 text-sm leading-snug break-words">
                {selectedOption.label}
              </span>
              {getOptionSubLabel(selectedOption) && (
                <span className="text-xs text-slate-600 font-normal leading-relaxed mt-0.5 break-words whitespace-normal">
                  ({getOptionSubLabel(selectedOption)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">No matching results found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = getOptionValue(opt);
                const isSelected = optVal === value;
                const sub = getOptionSubLabel(opt);
                return (
                  <div
                    key={getOptionKey(opt, idx)}
                    onClick={() => handleSelect(opt)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      opt.disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : isSelected
                        ? 'bg-blue-50 text-blue-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 break-words">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {sub && <span className="text-xs text-slate-500 mt-0.5 break-words whitespace-normal leading-relaxed">({sub})</span>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
