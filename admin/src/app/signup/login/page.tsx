/*Community-Application\admin\src\app\signup\login\page.tsx*/
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!contact.trim()) {
      setErr('Please enter your email or phone number');
      setTimeout(() => setErr(''), 3000);
      return;
    }
    if (!password.trim()) {
      setErr('Please enter your password');
      setTimeout(() => setErr(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contact, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.message || 'Login failed');
        setTimeout(() => setErr(''), 3000);
        return;
      }

      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_email', data.email);
      router.push('/signup/otp');
    } catch {
      setErr('Network error. Please try again.');
      setTimeout(() => setErr(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" style={{ width: 700, height: 700, top: -320, right: -160 }} />
      <div className="auth-bg" style={{ width: 400, height: 400, bottom: -110, left: -110 }} />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">{IC.building}</div>
          <div><div className="auth-logo-text">Census Management System</div></div>
        </div>
        <div className="auth-title">Administrator Login</div>
        <div className="auth-subtitle">Secure access for authorised administrators only</div>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="form-group">
          <label className="form-label">Email Address or Phone Number</label>
          <input
            className="form-input"
            type="text"
            placeholder="Enter email or phone number"
            value={contact}
            onChange={e => setContact(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', color: '#6b7280',
              }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.956 9.956 0 01-1.343 2.657M6.343 6.343L3 3m3.343 3.343l11.314 11.314M9.88 9.88A3 3 0 0014.12 14.12M9.88 9.88L14.12 14.12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <button
          className="btn btn-primary btn-full"
          style={{ marginBottom: 14, padding: '14px 20px', fontSize: 15, letterSpacing: '0.03em' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
}