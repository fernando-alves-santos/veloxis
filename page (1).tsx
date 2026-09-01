'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vx-login-page">
      <div className="vx-login-brand">
        <img src="/logo.png" alt="VELOXIS" className="vx-login-logo" />
        <div className="vx-login-title">VELOXIS</div>
        <div className="vx-login-tagline">Controle. Organize. Lucre.</div>
      </div>

      <div className="vx-login-card">
        <div className="vx-login-tabs">
          <button
            type="button"
            className={`vx-login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`vx-login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="vx-login-form">
          <div className="vx-field">
            <label>E-mail</label>
            <div className="vx-input-icon">
              <MailIcon />
              <input
                className="vx-input"
                type="email"
                placeholder="voce@email.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="vx-field">
            <label>Senha</label>
            <div className="vx-input-icon">
              <LockIcon />
              <input
                className="vx-input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}
          <button className="vx-btn vx-login-submit" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>

      <div className="vx-login-footnote">Seus dados ficam protegidos e visíveis só para você.</div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
