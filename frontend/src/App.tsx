import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { AppRoutes } from './routes/AppRoutes.js';
import { API_BASE } from './lib/apiClient.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000, // 1 minute fresh cache for instant navigation
      gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    },
  },
});

export const App: React.FC = () => {
  // Prevent Render cold-starts by keeping connection warm while user is active
  useEffect(() => {
    const keepAlive = () => {
      fetch(`${API_BASE}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    };

    // Initial warm-up ping
    keepAlive();

    // Ping every 9 minutes (Render sleeps at 15 minutes)
    const interval = setInterval(keepAlive, 9 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

