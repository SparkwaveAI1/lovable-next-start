import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BusinessContextType {
  selectedBusinessId: string | undefined;
  setSelectedBusinessId: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('selectedBusinessId');
    return saved || undefined;
  });

  // Persist to localStorage whenever it changes
  const setSelectedBusinessId = (id: string) => {
    setSelectedBusinessIdState(id);
    localStorage.setItem('selectedBusinessId', id);
  };

  return (
    <BusinessContext.Provider value={{ selectedBusinessId, setSelectedBusinessId }}>
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
