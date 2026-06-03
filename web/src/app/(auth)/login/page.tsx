'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      minHeight: '100vh', background: 'linear-gradient(135deg, #1A56CC 0%, #0F3D8A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'rgba(255,255,255,0.15)',
            borderRadius: 14, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14,
          }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>M</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, margin: '0 0 4px' }}>MMT Care Connect</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 13 }}>
            NDIS Placement Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Sign in</h2>
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
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 20, marginBottom: 0 }}>
            Demo: admin@mmtcare.com.au / Admin@2026!
          </p>
        </div>
      </div>
    </div>
  );
}
