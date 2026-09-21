import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, User as UserIcon, Phone, ArrowRight, PlusCircle, Users, ShieldCheck } from 'lucide-react';
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
        background: 'linear-gradient(135deg, #0b1320 0%, #0f172a 50%, #1e293b 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          background: '#ffffff',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 10px 20px -3px rgba(16, 185, 129, 0.35)',
              marginBottom: 14,
            }}
          >
            <Building2 size={28} />
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6, marginBottom: 0 }}>
            Join Bangladesh's most authoritative mess operating & financial platform
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
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

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section: Personal Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Hossain"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Phone Number (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700 000000"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Password (Min 8 Characters) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Role Choice Section */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center' }}>
              How would you like to set up?
            </div>

            {/* Segmented Pill Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '5px',
                backgroundColor: '#f1f5f9',
                borderRadius: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setOnboardingMode('CREATE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: onboardingMode === 'CREATE' ? '#ffffff' : 'transparent',
                  color: onboardingMode === 'CREATE' ? '#047857' : '#64748b',
                  boxShadow: onboardingMode === 'CREATE' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <PlusCircle size={16} color={onboardingMode === 'CREATE' ? '#10B981' : '#64748b'} />
                <span>Create New Mess</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardingMode('JOIN')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: onboardingMode === 'JOIN' ? '#ffffff' : 'transparent',
                  color: onboardingMode === 'JOIN' ? '#0369a1' : '#64748b',
                  boxShadow: onboardingMode === 'JOIN' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <Users size={16} color={onboardingMode === 'JOIN' ? '#0ea5e9' : '#64748b'} />
                <span>Join with Code</span>
              </button>
            </div>
          </div>

          {/* Mode 1: CREATE NEW MESS */}
          {onboardingMode === 'CREATE' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#047857', fontSize: '0.8rem', fontWeight: 700 }}>
                <ShieldCheck size={17} />
                <span>You will be the Manager & admin of this mess.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
                  Mess / Flat Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required={onboardingMode === 'CREATE'}
                  value={messName}
                  onChange={(e) => setMessName(e.target.value)}
                  placeholder="e.g. Green View Bachelor Flat"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #6ee7b7',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 500,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #a7f3d0',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
                    Area / Location
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Dhanmondi 27"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #a7f3d0',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Road 9/A, House 42"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #a7f3d0',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: '1.5px solid #a7f3d0',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#065f46',
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

          {/* Mode 2: JOIN EXISTING MESS */}
          {onboardingMode === 'JOIN' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 700 }}>
                Enter the unique 6-character Join Code provided by your Mess Manager:
              </div>

              <div>
                <input
                  type="text"
                  required={onboardingMode === 'JOIN'}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MM-8K21"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '2px solid #0ea5e9',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#0369a1',
                    boxShadow: '0 2px 6px rgba(14, 165, 233, 0.1)',
                  }}
                />
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: 6, textAlign: 'center' }}>
                  You will be added to this mess as a resident Member upon signup.
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            style={{
              width: '100%',
              marginTop: 4,
              height: 48,
              fontSize: '0.94rem',
              fontWeight: 700,
              borderRadius: '12px',
              backgroundColor: onboardingMode === 'CREATE' ? '#10B981' : '#0ea5e9',
              border: 'none',
              boxShadow: onboardingMode === 'CREATE' ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
            }}
            icon={<ArrowRight size={17} />}
          >
            {onboardingMode === 'CREATE' ? 'Create Account & Launch Mess' : 'Create Account & Join Mess'}
          </Button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};
