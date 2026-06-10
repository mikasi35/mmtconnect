'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(''); setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      saveSession(res.data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img 
            src="https://mmtcare.com.au/wp-content/uploads/2026/02/MMT-CARE-LOGO.webp" 
            alt="MMT Care Connect Logo" 
            style={{ height: '56px', width: 'auto', display: 'inline-block', marginBottom: 14 }} 
          />
          <p style={{ color: 'var(--gray-500)', margin: 0, fontSize: 13, fontWeight: 500 }}>
            NDIS Placement Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 18, 
          padding: '28px 32px', 
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
          border: '1.5px solid var(--gray-200)'
        }}>
          <h2 style={{ fontSize: 18, margin: '0 0 4px', color: 'var(--gray-900)' }}>Sign in</h2>
          <p style={{ color: 'var(--gray-500)', margin: '0 0 22px', fontSize: 13 }}>
            Access your coordinator dashboard
          </p>

          {error && (
            <div style={{
              background: '#FEE2E2', color: '#991B1B', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  style={{ paddingRight: '44px' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '4px',
                    color: 'var(--gray-500)'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 10 }}>
              <a href="/forgot-password" style={{ fontSize: 13, color: '#1A56CC', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => router.push('/find')}
              style={{
                background: 'none', border: 'none', color: '#1A56CC', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}
            >
              ← Go back to search
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 24, marginBottom: 0 }}>
            Demo: admin@mmtcare.com.au / Admin@2026!
          </p>
        </div>
      </div>
    </div>
  );
}
