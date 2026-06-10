'use client';

import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setMessage(res.data.message || 'If that email exists, a reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
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
          <h2 style={{ fontSize: 18, margin: '0 0 4px', color: 'var(--gray-900)' }}>Forgot Password</h2>
          <p style={{ color: 'var(--gray-500)', margin: '0 0 22px', fontSize: 13 }}>
            Enter your email to receive a password reset link
          </p>

          {error && (
            <div style={{
              background: '#FEE2E2', color: '#991B1B', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          {message && (
            <div style={{
              background: '#D1FAE5', color: '#065F46', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>{message}</div>
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

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Sending link…' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href="/login" style={{ fontSize: 13, color: '#1A56CC', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
