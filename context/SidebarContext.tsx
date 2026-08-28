import { scanLocalReceivedFiles } from '@/lib/nativeDropLink';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type SidebarContextType = {
  isOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  receivedCount: number;
  setReceivedCount: (count: number) => void;
  refreshReceivedCount: () => Promise<void>;
};

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
  receivedCount: 0,
  setReceivedCount: () => {},
  refreshReceivedCount: async () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);

  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);

  const refreshReceivedCount = useCallback(async () => {
    try {
      const files = await scanLocalReceivedFiles();
      setReceivedCount(files.length);
    } catch {
      // Native module might not be ready or on non-android platform
    }
  }, []);

  useEffect(() => {
    void refreshReceivedCount();
  }, [refreshReceivedCount]);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        receivedCount,
        setReceivedCount,
        refreshReceivedCount,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

