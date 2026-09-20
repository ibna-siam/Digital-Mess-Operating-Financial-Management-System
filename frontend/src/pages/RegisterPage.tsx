import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, User as UserIcon, Phone, ArrowRight, PlusCircle, Users, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../lib/apiClient.js';
import { Button } from '../components/ui/Button.js';
import { User, Mess } from '../types/index.js';

export const RegisterPage: React.FC = () => {
  // Account Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Onboarding Selection ('CREATE' | 'JOIN')
  const [onboardingMode, setOnboardingMode] = useState<'CREATE' | 'JOIN'>('CREATE');

  // Create Mess fields
  const [messName, setMessName] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('BDT');

  // Join Mess fields
  const [joinCode, setJoinCode] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        onboarding:
          onboardingMode === 'CREATE'
            ? {
                mode: 'CREATE',
                messName: messName.trim(),
                city: city.trim() || undefined,
                area: area.trim() || undefined,
                address: address.trim() || undefined,
                currency,
              }
            : {
                mode: 'JOIN',
                joinCode: joinCode.trim().toUpperCase(),
              },
      };

      const res = await apiClient<{ user: User; token: string; activeMess?: Mess }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Directly login with active mess and navigate to dashboard
      await login(res.token, res.user, res.activeMess);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please check inputs.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1320 0%, #1e293b 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: '36px 32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 50,
              height: 50,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 'var(--radius-md, 10px)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 18px rgba(16, 185, 129, 0.28)',
              marginBottom: 12,
            }}
          >
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.02em', margin: 0 }}>
            Create Your Account & Mess
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #64748b)', marginTop: 6, marginBottom: 0 }}>
            Start a new mess workspace or join with a manager's code
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '0.84rem',
              marginBottom: 20,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 700 }}>Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Account Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 5 }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Hossain"
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 38px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 5 }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 38px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 5 }}>
                  Phone (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700 000000"
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 38px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 5 }}>
                Password (Min 8 Characters) *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 38px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ position: 'relative', margin: '8px 0', textAlign: 'center' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <span
              style={{
                position: 'absolute',
                top: '-9px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#ffffff',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              How would you like to continue?
            </span>
          </div>

          {/* Mode Selector Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              type="button"
              onClick={() => setOnboardingMode('CREATE')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg, 12px)',
                border: onboardingMode === 'CREATE' ? '2px solid #10B981' : '1px solid #e2e8f0',
                backgroundColor: onboardingMode === 'CREATE' ? '#ecfdf5' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    backgroundColor: onboardingMode === 'CREATE' ? '#10B981' : '#e2e8f0',
                    color: onboardingMode === 'CREATE' ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlusCircle size={18} />
                </div>
                {onboardingMode === 'CREATE' && <CheckCircle2 size={18} color="#10B981" />}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: onboardingMode === 'CREATE' ? '#065f46' : '#1e293b' }}>
                Create New Mess
              </span>
              <span style={{ fontSize: '0.74rem', color: onboardingMode === 'CREATE' ? '#047857' : '#64748b', marginTop: 2 }}>
                Become the Manager
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingMode('JOIN')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg, 12px)',
                border: onboardingMode === 'JOIN' ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                backgroundColor: onboardingMode === 'JOIN' ? '#f0f9ff' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    backgroundColor: onboardingMode === 'JOIN' ? '#0ea5e9' : '#e2e8f0',
                    color: onboardingMode === 'JOIN' ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={18} />
                </div>
                {onboardingMode === 'JOIN' && <CheckCircle2 size={18} color="#0ea5e9" />}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: onboardingMode === 'JOIN' ? '#0369a1' : '#1e293b' }}>
                Join Existing Mess
              </span>
              <span style={{ fontSize: '0.74rem', color: onboardingMode === 'JOIN' ? '#0284c7' : '#64748b', marginTop: 2 }}>
                Enter Join Code
              </span>
            </button>
          </div>

          {/* Conditional Sub-Form: CREATE NEW MESS */}
          {onboardingMode === 'CREATE' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '16px',
                borderRadius: 'var(--radius-lg, 12px)',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', fontSize: '0.78rem', fontWeight: 600 }}>
                <ShieldCheck size={16} />
                <span>You will become the Manager of this mess.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                  Mess Name *
                </label>
                <input
                  type="text"
                  required={onboardingMode === 'CREATE'}
                  value={messName}
                  onChange={(e) => setMessName(e.target.value)}
                  placeholder="e.g. Green View Mess"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                    Area / Neighborhood
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Dhanmondi 27"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. House 42, Road 9/A"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Conditional Sub-Form: JOIN EXISTING MESS */}
          {onboardingMode === 'JOIN' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '16px',
                borderRadius: 'var(--radius-lg, 12px)',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                Enter the Join Code shared by your Mess Manager.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: 4 }}>
                  Mess Join Code *
                </label>
                <input
                  type="text"
                  required={onboardingMode === 'JOIN'}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MM-7B29"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid #0ea5e9',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                  You will join the mess as a Member. Details remain private until verified.
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: 6, height: 44, fontSize: '0.92rem' }}
            icon={<ArrowRight size={16} />}
          >
            {onboardingMode === 'CREATE' ? 'Create Account & Mess' : 'Create Account & Join Mess'}
          </Button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary-dark, #059669)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
