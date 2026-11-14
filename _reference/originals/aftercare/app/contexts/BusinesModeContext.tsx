import React, { createContext, useContext, useState } from 'react';

interface BusinessModeContextType {
  isBusinessMode: boolean;
  toggleMode: () => void;
}

const BusinessModeContext = createContext<BusinessModeContextType>({
  isBusinessMode: false,
  toggleMode: () => {},
});

export function useBusinessMode() {
  return useContext(BusinessModeContext);
}

export function BusinessModeProvider({ children }: { children: React.ReactNode }) {
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const toggleMode = () => setIsBusinessMode(prev => !prev);
  return (
    <BusinessModeContext.Provider value={{ isBusinessMode, toggleMode }}>
      {children}
    </BusinessModeContext.Provider>
  );
}

export default BusinessModeProvider;
