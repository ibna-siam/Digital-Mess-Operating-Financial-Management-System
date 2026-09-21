/* ===================================================================
   NotificationPreferencesModal — Push Notifications & Category Controls
   =================================================================== */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Shield, Send, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import { useAuth } from '../../context/AuthContext.js';
import { API_BASE } from '../../lib/apiClient.js';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { token } = useAuth();
  const {
    isSupported,
    isSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [categories, setCategories] = useState({
    financial: true,
    expenses: true,
    meals: true,
    settlements: true,
    announcements: true,
    system: true,
  });
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;

    fetch(`${API_BASE}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setCategories({
            financial: json.data.financial ?? true,
            expenses: json.data.expenses ?? true,
            meals: json.data.meals ?? true,
            settlements: json.data.settlements ?? true,
            announcements: json.data.announcements ?? true,
            system: true,
          });
        }
      })
      .catch(() => {});
  }, [isOpen, token]);

  const handleToggleCategory = async (cat: keyof typeof categories) => {
    if (cat === 'system') return; // Cannot toggle mandatory system security notifications

    const newCategories = { ...categories, [cat]: !categories[cat] };
    setCategories(newCategories);
    setSaving(true);

    try {
      await fetch(`${API_BASE}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [cat]: newCategories[cat] }),
      });
    } catch {
      // Rollback on error
      setCategories(categories);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    await sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Push Notifications & Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Device Web Push Status */}
        <div
          style={{
            backgroundColor: isSubscribed ? 'var(--color-primary-subtle)' : '#f8fafc',
            border: `1px solid ${isSubscribed ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {isSubscribed ? 'Device Web Push: Enabled' : 'Device Web Push: Inactive'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isSubscribed
                  ? 'This device will receive background OS alerts.'
                  : 'Enable push alerts for instant updates on this device.'}
              </div>
            </div>
            {isSubscribed ? (
              <button
                onClick={unsubscribe}
                disabled={pushLoading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <BellOff size={14} />
                <span>Disable</span>
              </button>
            ) : (
              <button
                onClick={subscribe}
                disabled={pushLoading || !isSupported}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {pushLoading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                <span>Enable Push</span>
              </button>
            )}
          </div>

          {pushError && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              Error: {pushError}
            </div>
          )}

          {isSubscribed && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={handleSendTest}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Send size={12} />
                <span>{testSent ? 'Dispatched!' : 'Send Test Alert'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Category toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Notification Categories
          </div>

          {[
            { id: 'financial', label: 'Financial Statements & Audits', mandatory: false },
            { id: 'expenses', label: 'Expense & Bill Approvals', mandatory: false },
            { id: 'settlements', label: 'Settlement & Payment Confirmations', mandatory: false },
            { id: 'meals', label: 'Meal Count Updates & Deadlines', mandatory: false },
            { id: 'announcements', label: 'Mess Announcements', mandatory: false },
            { id: 'system', label: 'System Security Alerts', mandatory: true },
          ].map((item) => {
            const isChecked = categories[item.id as keyof typeof categories];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.mandatory && <Shield size={14} style={{ color: '#059669' }} />}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
                  {item.mandatory && (
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                      (Required)
                    </span>
                  )}
                </div>

                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={item.mandatory || saving}
                  onChange={() => handleToggleCategory(item.id as any)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: item.mandatory ? 'not-allowed' : 'pointer',
                    accentColor: 'var(--color-primary)',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
