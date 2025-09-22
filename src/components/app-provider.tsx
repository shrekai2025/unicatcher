'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSession } from '~/lib/simple-auth';
import type { UserRole } from '~/lib/simple-auth';
import { Navigation } from './navigation';

interface AppState {
  isAuthenticated: boolean;
  username?: string;
  role?: UserRole;
  isLoading: boolean;
}

interface AppContextType extends AppState {
  refreshAuth: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const pathname = usePathname();
  const [state, setState] = useState<AppState>({
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAuth = React.useCallback(() => {
    try {
      const session = getSession();
      setState({
        isAuthenticated: session.isAuthenticated,
        username: session.username,
        role: session.role,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth refresh error:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    // 初始化认证状态
    refreshAuth();
  }, [refreshAuth]);

  // 判断是否应该显示导航
  const shouldShowNavigation = state.isAuthenticated && pathname !== '/login';
  
  // 判断是否是公开页面
  const isPublicPage = pathname.startsWith('/login') || 
                      pathname.startsWith('/api/') || 
                      pathname === '/';

  const contextValue: AppContextType = {
    ...state,
    refreshAuth,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50">
        {shouldShowNavigation && <Navigation />}
        <main className={shouldShowNavigation ? 'pt-0' : ''}>
          {children}
        </main>
      </div>
    </AppContext.Provider>
  );
}
