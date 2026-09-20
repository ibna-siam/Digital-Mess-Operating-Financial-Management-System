import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Users, Sparkles, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../lib/apiClient.js';
import { Button } from '../components/ui/Button.js';
import { Mess } from '../types/index.js';

export const OnboardingPage: React.FC = () => {
  const { user, activeMess, userMesses, setActiveMess, refreshMesses } = useAuth();
  const navigate = useNavigate();

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createArea, setCreateArea] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createCurrency, setCreateCurrency] = useState('BDT');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Success State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setJoinError(null);
    setIsCreating(true);

    try {
      const newMess = await apiClient<Mess>('/messes', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          city: createCity.trim() || undefined,
          area: createArea.trim() || undefined,
          address: createAddress.trim() || undefined,
          currency: createCurrency,
        }),
      });

      setActiveMess(newMess);
      await refreshMesses();
      setSuccessMessage(`Mess "${newMess.name}" created successfully! Redirecting...`);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create mess workspace.';
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setCreateError(null);
    setIsJoining(true);

    try {
      const res = await apiClient<{ mess: Mess; membership: any }>('/messes/join', {
        method: 'POST',
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
        }),
      });

      setActiveMess(res.mess);
      await refreshMesses();
      setSuccessMessage(`Successfully joined "${res.mess.name}"! Redirecting...`);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired join code.';
      setJoinError(message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b1320 0%, #1e293b 100%)',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 'var(--radius-lg, 14px)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              marginBottom: 16,
            }}
          >
            <Building2 size={28} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.025em' }}>
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>
            Get started with MessMate. Set up a brand new mess workspace as Manager, or join an existing mess using a Join Code.
          </p>

          {userMesses.length > 0 && activeMess && (
            <div style={{ marginTop: 14 }}>
              <Link
                to="/"
                style={{
                  fontSize: '0.82rem',
                  color: '#34d399',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                }}
              >
                ← Return to current workspace ({activeMess.name})
              </Link>
            </div>
          )}
        </div>

        {/* Global Notification Banner */}
        {successMessage && (
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto 24px auto',
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
            }}
          >
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {/* Card A: Create New Mess */}
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: '32px 28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <Sparkles size={12} /> Become Manager
                </span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                Create New Mess
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
                Start a fresh workspace for your flat or hostel. You will become the <strong>MANAGER</strong>, control finances, and receive a Join Code to invite members.
              </p>

              {createError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    fontSize: '0.82rem',
                    marginBottom: 16,
                  }}
                >
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateMess} id="create-mess-form">
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Mess Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green View Mess, Flat 4B"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka"
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Area / Neighborhood
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhanmondi"
                      value={createArea}
                      onChange={(e) => setCreateArea(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. House 24, Road 5"
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Currency
                  </label>
                  <select
                    value={createCurrency}
                    onChange={(e) => setCreateCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: 'white',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                  </select>
                </div>
              </form>
            </div>

            <Button
              type="submit"
              form="create-mess-form"
              variant="primary"
              disabled={isCreating || !createName.trim()}
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Building2 size={18} />
              {isCreating ? 'Creating Mess...' : 'Create Mess Workspace'}
            </Button>
          </div>

          {/* Card B: Join Existing Mess */}
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: '32px 28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <Users size={12} /> Become Member
                </span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                Join Existing Mess
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
                Enter the unique Join Code shared by your Mess Manager. You will join the mess with the <strong>MEMBER</strong> role immediately.
              </p>

              {joinError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    fontSize: '0.82rem',
                    marginBottom: 16,
                  }}
                >
                  {joinError}
                </div>
              )}

              <form onSubmit={handleJoinMess} id="join-mess-form">
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                    Mess Join Code *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={18}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. MM-K7X9PQ"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '14px 14px 14px 44px',
                        borderRadius: 10,
                        border: '2px dashed #94a3b8',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#0f172a',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#f8fafc',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                    Join codes are case-insensitive and typically follow the format <code>MM-XXXXXX</code>.
                  </p>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 10,
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                    <ShieldCheck size={16} color="#059669" /> Data Isolation Guaranteed
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Your meal records, shared expenses, and statements stay strictly private to this mess workspace.
                  </p>
                </div>
              </form>
            </div>

            <Button
              type="submit"
              form="join-mess-form"
              variant="secondary"
              disabled={isJoining || !joinCode.trim()}
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Users size={18} />
              {isJoining ? 'Joining Mess...' : 'Join Mess Workspace'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
