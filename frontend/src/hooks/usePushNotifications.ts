/* ===================================================================
   usePushNotifications — Web Push registration & subscription hook
   =================================================================== */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { token } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check support on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(sub !== null);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !token) {
      setError('Web Push is not supported or user is not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request notification permission
      const userPermission = await Notification.requestPermission();
      setPermission(userPermission);

      if (userPermission !== 'granted') {
        setError('Notification permission was denied');
        setLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch('/api/v1/notifications/push/vapid-public-key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const keyJson = await keyRes.json();
      const vapidPublicKey = keyJson.data?.publicKey;

      if (!vapidPublicKey) {
        throw new Error('Failed to retrieve VAPID public key from server');
      }

      // 3. Register with Browser Push Manager
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // 4. Save subscription to backend
      const rawSub = subscription.toJSON();
      const saveRes = await fetch('/api/v1/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: rawSub.keys?.p256dh || '',
            auth: rawSub.keys?.auth || '',
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to persist push subscription to server');
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('[WebPush] Subscription error:', err);
      setError(err.message || 'Subscription failed');
      setLoading(false);
      return false;
    }
  }, [isSupported, token]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !token) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Revoke on backend
        await fetch('/api/v1/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('[WebPush] Unsubscribe error:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [isSupported, token]);

  const sendTestNotification = useCallback(async () => {
    if (!token) return;
    try {
      await fetch('/api/v1/notifications/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err: any) {
      console.error('[WebPush] Test notification error:', err);
    }
  }, [token]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
