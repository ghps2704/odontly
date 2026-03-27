
import React, { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import Logo from '../components/ui/logo';

const Login: React.FC = () => {
  const { login } = useNexus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (!success) setError('Acesso negado. Verifique seu e-mail e senha.');
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 14px 9px 38px',
    border: '1.5px solid #e0f2fe',
    borderRadius: 8,
    fontSize: 13,
    color: '#0a0f1e',
    background: '#ffffff',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#0a0f1e',
    marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f9ff',
      padding: 16,
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '-8%', left: '-8%',
        width: '38%', height: '38%',
        background: 'rgba(2,132,199,0.1)', borderRadius: '50%', filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-8%', right: '-8%',
        width: '38%', height: '38%',
        background: 'rgba(14,165,233,0.08)', borderRadius: '50%', filter: 'blur(80px)',
      }} />

      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: 400,
        padding: 36,
        borderRadius: 14,
        border: '0.5px solid #e0f2fe',
        boxShadow: '0 8px 40px rgba(10,15,30,0.08)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <Logo size="lg" variant="light" />
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
            Feito para dentistas
          </p>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <a
            href="/"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#0284c7',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#0369a1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#0284c7'; }}
          >
            ← Voltar para a página inicial
          </a>
        </div>

        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 14px',
            background: '#fee2e2', border: '0.5px solid #fca5a5',
            borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertCircle style={{ color: '#991b1b', flexShrink: 0, marginTop: 1 }} size={16} />
            <p style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={15} />
              <input
                type="email"
                required
                style={inputStyle}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#0284c7'; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.25)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0f2fe'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={15} />
              <input
                type="password"
                required
                style={inputStyle}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#0284c7'; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.25)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0f2fe'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px 20px',
              background: isLoading ? '#7dd3fc' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
              marginTop: 4,
            }}
            onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#0369a1'; }}
            onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#0284c7'; }}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Autenticando...
              </>
            ) : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #e0f2fe', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            Suporte em minutos — fale com o administrador da clínica.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
