'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface NavigationLoaderContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

const NavigationLoaderContext = createContext<NavigationLoaderContextType | undefined>(undefined);

export const NavigationLoaderProvider = ({ children }: { children: ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);

  // Using a timeout to prevent flash of loader on very fast navigations.
  let startTimeout: NodeJS.Timeout;

  const startNavigation = useCallback(() => {
      startTimeout = setTimeout(() => setIsNavigating(true), 100);
  }, []);

  const stopNavigation = useCallback(() => {
      clearTimeout(startTimeout);
      setIsNavigating(false);
  }, []);

  return (
    <NavigationLoaderContext.Provider value={{ isNavigating, startNavigation, stopNavigation }}>
      {children}
    </NavigationLoaderContext.Provider>
  );
};

export const useNavigationLoader = () => {
  const context = useContext(NavigationLoaderContext);
  if (!context) {
    throw new Error('useNavigationLoader must be used within a NavigationLoaderProvider');
  }
  return context;
};
