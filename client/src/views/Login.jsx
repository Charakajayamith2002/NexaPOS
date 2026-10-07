import { useState, useEffect } from 'react';
import { Lock, User, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../api.js';

export default function Login({ onDone, shopName = 'Verdant Supply Co.' }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/auth/setup').then(d => setNeedsSetup(d.needsAdmin)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const endpoint = needsSetup ? '/auth/register' : '/auth/login';
      const data = await api(endpoint, { 
        method: 'POST', 
        body: { ...form, username: form.username.trim() } 
      });
      localStorage.token = data.token;
      localStorage.user = JSON.stringify(data.user);
      onDone(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const brandInitial = (shopName || 'Verdant')[0]?.toUpperCase() || 'V';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 390, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', boxShadow: 'var(--shadow-lg)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            background: 'var(--brand)', 
            color: '#fff', 
            borderRadius: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 22, 
            fontWeight: 800,
            margin: '0 auto 12px',
            boxShadow: '0 4px 12px rgba(14, 112, 71, 0.3)'
          }}>
            {brandInitial}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{shopName}</h2>
          <p style={{ fontSize: 13, color: '#687b6f', marginTop: 4 }}>
            {needsSetup ? 'Set up initial administrator account' : 'Sign in to access POS terminal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {needsSetup && (
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Full Name *</label>
              <input
                placeholder="e.g. Marcus Aurelius"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Username *</label>
            <input
              autoFocus
              placeholder="Username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Password *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {!needsSetup && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f8f5', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: '#556a5c' }}>Admin: <b>Admin</b> / <b>admin123</b></span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setForm({ ...form, username: 'Admin', password: 'admin123' })}
                style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, padding: '2px 6px', height: 'auto' }}
              >
                Auto-fill
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 12px', borderRadius: 8 }}>
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ height: 44, fontSize: 14.5, marginTop: 6 }}
          >
            <span>{loading ? 'Authenticating...' : (needsSetup ? 'Create Administrator' : 'Enter Terminal')}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11.5, color: '#88998d' }}>
          Verdant Point of Sale System · v2.4
        </div>
      </div>
    </div>
  );
}

