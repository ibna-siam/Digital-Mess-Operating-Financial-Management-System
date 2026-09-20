import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../lib/notificationApi.js';
import { useSocketEvent } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';

export function useUnreadNotifications() {
  const { activeMess, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      setIsLoading(true);
      const res = await notificationApi.getUnreadCount(activeMess?.id);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Quiet fail if network or session offline
    } finally {
      setIsLoading(false);
    }
  }, [token, activeMess?.id]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Real-time socket events
  useSocketEvent('notification.created', () => {
    setUnreadCount((prev) => prev + 1);
  });

  useSocketEvent('notification.read', () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  });

  useSocketEvent('notification.read_all', () => {
    setUnreadCount(0);
  });

  return {
    unreadCount,
    isLoading,
    refreshUnreadCount,
  };
}
