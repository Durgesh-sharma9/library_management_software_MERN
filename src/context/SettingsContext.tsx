import React, { createContext, useContext, useState, useEffect } from 'react';
import { LibrarySetting } from '../types';
import { settingService } from '../services/api';

interface SettingsContextType {
  settings: LibrarySetting;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<LibrarySetting>) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const defaultSettings: LibrarySetting = {
  libraryName: 'School Central Library',
  schoolName: 'International Public School',
  issueDuration: 14,
  finePerDay: 2,
  maxBooksPerMember: 3,
  accessionPrefix: 'ACC',
  accessionStartNumber: 1,
  accessionPadding: 4,
  accessionSeparator: '-',
  contactEmail: 'library@school.edu',
  contactPhone: '+91 98765 43210',
  currency: '₹',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LibrarySetting>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    try {
      const data = await settingService.get();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.warn('Could not load settings from server, using default', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<LibrarySetting>) => {
    const updated = await settingService.update(newSettings);
    setSettings(updated);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshSettings: fetchSettings,
        updateSettings,
        formatCurrency,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
