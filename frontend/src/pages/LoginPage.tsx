import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../lib/apiClient.js';
import { Button } from '../components/ui/Button.js';
import { User } from '../types/index.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient<{ user: User; token: string; activeMess?: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await login(res.token, res.user, res.activeMess);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(message);
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
        background: 'linear-gradient(135deg, #0b1320 0%, #1e293b 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)',
              marginBottom: 12,
            }}
          >
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Welcome to MessMate
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Digital Mess Operating & Financial Management System
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '0.82rem',
              marginBottom: 18,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} style={{ width: '100%', marginTop: 6 }} icon={<ArrowRight size={16} />}>
            Sign In to MessMate
          </Button>

          <button
            type="button"
            onClick={fillDemoCredentials}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            Fill Demo Credentials
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary-dark)', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
