import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { useQueryClient } from '@tanstack/react-query';
import { syncEvents } from '../lib/syncEvents.js';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect if user is authenticated with a token
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`🔌 [Socket.io] Connected successfully (${socket.id}) for user: ${user?.name || user?.id}`);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.io] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      // In offline mode, reduce console noise
      if (!navigator.onLine) {
        return;
      }
      console.warn(`🔌 [Socket.io] Connection error: ${err.message}`);
      setIsConnected(false);
    });

    // Lightweight query invalidation and cross-component sync on operational events
    const handleExpenseChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      syncEvents.emit('expenses', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleBazarChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['bazar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('bazar', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleMealChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('meals', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleMemberChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('members', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleBillChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('bills', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleSettlementChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('settlements', payload);
      syncEvents.emit('ledger', payload);
      syncEvents.emit('dashboard', payload);
    };

    const handleDashboardChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      syncEvents.emit('dashboard', payload);
    };

    const handleNotificationChange = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      syncEvents.emit('notifications', payload);
    };

    const registerDual = (event: string, handler: (...args: any[]) => void) => {
      socket.on(event, handler);
      if (event.includes('.')) {
        socket.on(event.replace('.', ':'), handler);
      } else if (event.includes(':')) {
        socket.on(event.replace(':', '.'), handler);
      }
    };

    registerDual('expense.created', handleExpenseChange);
    registerDual('expense.approved', handleExpenseChange);
    registerDual('bazar.created', handleBazarChange);
    registerDual('meal.updated', handleMealChange);
    registerDual('bill.created', handleBillChange);
    registerDual('member.updated', handleMemberChange);
    registerDual('dashboard.financial_updated', handleDashboardChange);
    registerDual('payment.confirmed', handleSettlementChange);
    registerDual('period.finalized', handleSettlementChange);
    registerDual('notification.created', handleNotificationChange);

    // Online / offline listeners to control socket connection
    const handleOnline = () => {
      if (socket.disconnected) {
        socket.connect();
      }
    };

    const handleOffline = () => {
      // Don't hammer the server with retries when device has zero connectivity
      if (socket.connected) {
        socket.disconnect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, user?.id, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

/**
 * Custom hook to subscribe to a typed socket event and safely auto-unsubscribe on unmount.
 */
export function useSocketEvent(event: string, callback: (...args: any[]) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
}
