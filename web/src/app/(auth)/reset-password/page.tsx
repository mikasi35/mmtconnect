'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token. Please request a new link.');
    }
  }, [token]);

  // Clientside validation on fields directly
  const matchError = password && confirmPassword && password !== confirmPassword 
    ? 'Passwords do not match' 
    : '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword(token, password);
      setMessage(res.data.message || 'Password reset successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 18, 
      padding: '28px 32px', 
      boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
      border: '1.5px solid var(--gray-200)'
    }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px', color: 'var(--gray-900)' }}>Reset Password</h2>
      <p style={{ color: 'var(--gray-500)', margin: '0 0 22px', fontSize: 13 }}>
        Enter and confirm your new password below
      </p>

      {error && (
        <div style={{
          background: '#FEE2E2', color: '#991B1B', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>{error}</div>
      )}

      {matchError && (
        <div style={{
          background: '#FFFBEB', color: '#B45309', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>{matchError}</div>
      )}

      {message && (
        <div style={{
          background: '#D1FAE5', color: '#065F46', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>{message}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters" required disabled={!token || loading}
              style={{ paddingRight: '44px' }}
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

        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            className="form-input"
            type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm password" required disabled={!token || loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!token || loading || !!matchError}
          style={{ justifyContent: 'center', marginTop: 4 }}
        >
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="/login" style={{ fontSize: 13, color: '#1A56CC', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Login
        </a>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={<div style={{ color: '#4B5563', textAlign: 'center' }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
