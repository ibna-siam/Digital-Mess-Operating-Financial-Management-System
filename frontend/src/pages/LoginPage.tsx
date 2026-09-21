import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient, ApiError } from '../lib/apiClient.js';
import { Button } from '../components/ui/Button.js';
import { User } from '../types/index.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient<{ user: User; token: string; activeMess?: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      await login(res.token, res.user, res.activeMess);
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NETWORK')) {
          setError(
            'Cannot reach the server. The backend may be waking up from free-tier sleep (takes ~30s) or your network may be offline. Please tap "Retry Sign In".'
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@messmate.com');
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0b1320 0%, #0f172a 50%, #1e293b 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 24,
          padding: '36px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 54,
              height: 54,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
              marginBottom: 14,
            }}
          >
            <Building2 size={28} />
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              margin: '0 0 6px 0',
            }}
          >
            Welcome to MessMate
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
            Sign in to manage your mess operations & finances
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.82rem',
              marginBottom: 20,
              lineHeight: 1.45,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2, color: '#ef4444' }} />
              <div style={{ flex: 1, fontWeight: 500 }}>{error}</div>
            </div>
            {error.includes('waking up') && (
              <button
                type="button"
                onClick={() => handleLogin()}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <RefreshCw size={13} />
                Retry Sign In
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={17}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  height: 46,
                  padding: '0 14px 0 42px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.12)';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: 46,
                  padding: '0 14px 0 42px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.12)';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            style={{
              width: '100%',
              height: 48,
              marginTop: 4,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '0.92rem',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 6px 16px -2px rgba(16, 185, 129, 0.4)',
            }}
            icon={<ArrowRight size={17} />}
          >
            Sign In to MessMate
          </Button>

          <button
            type="button"
            onClick={fillDemoCredentials}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 12,
              border: '1px dashed #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f8fafc')}
          >
            <Sparkles size={15} style={{ color: '#10B981' }} />
            Fill Demo Credentials (admin@messmate.com)
          </button>
        </form>

        <div style={{ marginTop: 26, textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: '#059669',
              fontWeight: 700,
              textDecoration: 'none',
              marginLeft: 4,
            }}
          >
            Create account & mess
          </Link>
        </div>
      </div>
    </div>
  );
};

