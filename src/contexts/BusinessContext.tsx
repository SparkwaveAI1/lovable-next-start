import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Business {
  id: string;
  slug: string;
  name: string;
}

interface BusinessContextType {
  selectedBusiness: Business | undefined;
  setSelectedBusiness: (business: Business) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | undefined>(() => {
    const saved = localStorage.getItem('selectedBusiness');
    if (saved) {
      try {
        return JSON.parse(saved) as Business;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });

  // Persist to localStorage whenever it changes
  const setSelectedBusiness = (business: Business) => {
    setSelectedBusinessState(business);
    localStorage.setItem('selectedBusiness', JSON.stringify(business));
  };

  return (
    <BusinessContext.Provider value={{ selectedBusiness, setSelectedBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}
