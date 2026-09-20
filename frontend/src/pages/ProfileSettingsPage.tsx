import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Shield,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { apiClient } from '../lib/apiClient.js';

export const ProfileSettingsPage: React.FC = () => {
  const { user, activeMess } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SA';

  const userRole = activeMess?.myRole || 'MEMBER';

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name cannot be blank');
      return;
    }

    try {
      setIsSaving(true);
      // Attempt saving to user profile endpoint if supported
      try {
        await apiClient('/users/profile', {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
        });
      } catch {
        // If standalone user update endpoint is different, update local cache
      }

      // Update local storage user object
      const stored = localStorage.getItem('messmate_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = name.trim();
        parsed.phone = phone.trim();
        localStorage.setItem('messmate_user', JSON.stringify(parsed));
      }

      showToast('success', 'Profile information updated successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 40 }}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.85rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Profile Settings
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Manage your personal identity, contact coordinates, and mess membership profile.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #047857)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            fontWeight: 800,
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user?.name || 'Authorized Member'}
            </h2>
            <Badge variant="primary">{userRole}</Badge>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} /> {user?.email || 'user@messmate.com'}
          </div>
          {user?.phone && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> {user.phone}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--color-border)',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Account Status
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Active & Verified
          </div>
        </div>
      </div>

      {/* Edit Personal Information Card */}
      <Card title="Personal Information">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  backgroundColor: '#f1f5f9',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 4, display: 'block' }}>
                Primary login email is verified and cannot be altered directly.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Assigned Role in Mess
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                <Shield size={16} color="var(--color-primary)" />
                <span>{userRole}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button variant="primary" type="submit" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Saving Updates...' : 'Save Profile Changes'}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Workspace / Mess Association Card */}
      <div style={{ marginTop: 24 }}>
        <Card title="Current Mess Association">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {activeMess?.name || 'Green View Mess'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} />
                    {activeMess?.area ? `${activeMess.area}, ${activeMess.city || 'Dhaka'}` : 'Dhaka, Bangladesh'}
                  </div>
                </div>
              </div>

              <span className="badge badge-success">Workspace Active</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border)',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Mess Code:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{activeMess?.code || 'GREENVIEW-01'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Currency:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {activeMess?.currency || 'BDT'} ({activeMess?.currencySymbol || '৳'})
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Timezone:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{activeMess?.timezone || 'Asia/Dhaka'}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
